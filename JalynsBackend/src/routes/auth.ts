import { Router } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'
import { consumeCode, issueAndSendCode } from '../services/authCodes.js'

export const authRouter = Router()

function badRequest(res: import('express').Response, message: string) {
  return res.status(400).json({ success: false, message })
}

function requireServiceRole(res: import('express').Response) {
  if (!isServiceRoleConfigured()) {
    res.status(500).json({
      success: false,
      message:
        'Backend Supabase service_role key is not set. Open Supabase → Project Settings → API → copy the service_role secret into JalynsBackend/.env as SUPABASE_SERVICE_ROLE_KEY, then restart the backend.',
    })
    return false
  }
  return true
}

function mapAdminAuthError(message: string) {
  if (/bearer token|jwt|api key|not allowed|unauthorized/i.test(message)) {
    return 'Supabase rejected the API key. Put the service_role secret (not anon/publishable) in JalynsBackend/.env and restart the backend.'
  }
  return message
}

async function findAuthUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()

  if (profile?.id) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    if (!error && data.user) return data.user
  }

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match
    if (data.users.length < 200) break
  }
  return null
}

async function continueUnverifiedSignup(options: {
  userId: string
  email: string
  name: string
  phone: string
  password: string
}) {
  await supabaseAdmin.auth.admin.updateUserById(options.userId, {
    password: options.password,
    user_metadata: { name: options.name, phone: options.phone },
  })

  await supabaseAdmin.from('profiles').upsert(
    {
      id: options.userId,
      name: options.name,
      phone: options.phone,
      email: options.email,
      role: null,
      approval_status: 'pending',
    },
    { onConflict: 'id' },
  )

  await issueAndSendCode({
    userId: options.userId,
    email: options.email,
    purpose: 'email_verify',
  })
}

/** Register via service role (no Supabase link email). Sends 6-digit code via Gmail SMTP. */
authRouter.post('/register', async (req, res) => {
  try {
    if (!requireServiceRole(res)) return

    const name = String(req.body.name ?? '').trim()
    const phone = String(req.body.phone ?? '').trim()
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const password = String(req.body.password ?? '')

    if (!name || !phone || !email || !password) {
      return badRequest(res, 'Name, phone, email, and password are required.')
    }
    if (!/^\d{11}$/.test(phone)) {
      return badRequest(res, 'Phone number must be exactly 11 digits (numbers only).')
    }
    const strong =
      password.length >= 11 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    if (!strong) {
      return badRequest(
        res,
        'Password must be Strong: 11+ characters with uppercase, lowercase, number, and special character.',
      )
    }

    const existingUser = await findAuthUserByEmail(email)

    // Unverified = treat like new signup (send code). Do NOT say "already registered".
    if (existingUser && !existingUser.email_confirmed_at) {
      try {
        await continueUnverifiedSignup({
          userId: existingUser.id,
          email,
          name,
          phone,
          password,
        })
      } catch (mailOrCodeErr) {
        const detail =
          mailOrCodeErr instanceof Error ? mailOrCodeErr.message : 'Could not send verification code.'
        return res.status(500).json({ success: false, message: detail, email })
      }

      return res.json({
        success: true,
        message: 'Enter the verification code sent to your email.',
        email,
      })
    }

    // Fully verified account only
    if (existingUser?.email_confirmed_at) {
      return badRequest(
        res,
        'This email is already verified. Please log in or use Forgot Password.',
      )
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, phone },
    })

    if (createError) {
      // Race: Auth says exists — if still unverified, continue signup quietly
      if (/already.*(registered|been)|exists/i.test(createError.message)) {
        const again = await findAuthUserByEmail(email)
        if (again && !again.email_confirmed_at) {
          try {
            await continueUnverifiedSignup({
              userId: again.id,
              email,
              name,
              phone,
              password,
            })
          } catch (mailOrCodeErr) {
            const detail =
              mailOrCodeErr instanceof Error
                ? mailOrCodeErr.message
                : 'Could not send verification code.'
            return res.status(500).json({ success: false, message: detail, email })
          }
          return res.json({
            success: true,
            message: 'Enter the verification code sent to your email.',
            email,
          })
        }
        if (again?.email_confirmed_at) {
          return badRequest(
            res,
            'This email is already verified. Please log in or use Forgot Password.',
          )
        }
      }
      return badRequest(res, mapAdminAuthError(createError.message))
    }

    const user = created.user
    if (!user) {
      return badRequest(res, 'Could not create user.')
    }

    // Profile is usually created by the auth.users trigger; upsert is best-effort
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: user.id,
        name,
        phone,
        email,
        role: null,
        approval_status: 'pending',
      },
      { onConflict: 'id' },
    )
    if (profileError) {
      console.warn('[register] profile upsert warning:', profileError.message)
    }

    try {
      await issueAndSendCode({
        userId: user.id,
        email,
        purpose: 'email_verify',
      })
    } catch (mailOrCodeErr) {
      const detail =
        mailOrCodeErr instanceof Error ? mailOrCodeErr.message : 'Could not send verification code.'
      console.error('[register] code/email failed:', detail)
      return res.status(500).json({
        success: false,
        message: detail.includes('auth_codes') || detail.includes('schema cache')
          ? 'auth_codes table is missing. Run supabase/AUTH_CODES.sql in the Supabase SQL Editor, then try again.'
          : detail,
        email,
      })
    }

    return res.json({
      success: true,
      message: 'Account created. Enter the verification code sent to your email.',
      email,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed.'
    console.error('[register] failed:', message)
    return res.status(500).json({ success: false, message })
  }
})

authRouter.post('/send-verification-code', async (req, res) => {
  try {
    if (!requireServiceRole(res)) return

    const email = String(req.body.email ?? '').trim().toLowerCase()
    if (!email) return badRequest(res, 'Email is required.')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (!profile) {
      return badRequest(res, 'No account found for that email.')
    }

    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    if (error) throw error
    const user = userData.user

    if (user.email_confirmed_at) {
      return res.json({ success: true, message: 'Email is already verified. You can log in.' })
    }

    const result = await issueAndSendCode({
      userId: user.id,
      email,
      purpose: 'email_verify',
    })

    return res.json({
      success: true,
      message: 'Verification code sent.',
      cooldownSeconds: result.cooldownSeconds,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send code.'
    const status = /wait/i.test(message) ? 429 : 500
    return res.status(status).json({ success: false, message })
  }
})

authRouter.post('/verify-email-code', async (req, res) => {
  try {
    if (!requireServiceRole(res)) return

    const email = String(req.body.email ?? '').trim().toLowerCase()
    const code = String(req.body.code ?? '').trim()

    if (!email || !code) return badRequest(res, 'Email and code are required.')

    const row = await consumeCode({ email, purpose: 'email_verify', code })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      email_confirm: true,
    })
    if (error) throw error

    return res.json({
      success: true,
      message:
        'Email verified. Please wait for Admin approval before logging in.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed.'
    return res.status(400).json({ success: false, message })
  }
})

authRouter.post('/forgot-password', async (req, res) => {
  try {
    if (!requireServiceRole(res)) return

    const email = String(req.body.email ?? '').trim().toLowerCase()
    if (!email) return badRequest(res, 'Email is required.')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    // Always return success-looking response to avoid email enumeration,
    // but only send if the user exists.
    if (profile) {
      await issueAndSendCode({
        userId: profile.id,
        email,
        purpose: 'password_reset',
      })
    }

    return res.json({
      success: true,
      message: 'If that email is registered, a reset code has been sent.',
      email,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start password reset.'
    const status = /wait/i.test(message) ? 429 : 500
    return res.status(status).json({ success: false, message })
  }
})

authRouter.post('/reset-password', async (req, res) => {
  try {
    if (!requireServiceRole(res)) return

    const email = String(req.body.email ?? '').trim().toLowerCase()
    const code = String(req.body.code ?? '').trim()
    const password = String(req.body.password ?? '')
    const confirmPassword = String(req.body.confirmPassword ?? '')

    if (!email || !code || !password) {
      return badRequest(res, 'Email, code, and new password are required.')
    }
    if (password !== confirmPassword) {
      return badRequest(res, 'Passwords do not match.')
    }
    const strong =
      password.length >= 11 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    if (!strong) {
      return badRequest(
        res,
        'Password must be Strong: 11+ characters with uppercase, lowercase, number, and special character.',
      )
    }

    const row = await consumeCode({ email, purpose: 'password_reset', code })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password,
    })
    if (error) throw error

    return res.json({
      success: true,
      message: 'Password updated. You can log in with your new password.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password reset failed.'
    return res.status(400).json({ success: false, message })
  }
})

/** Admin-only: permanently delete Auth user + profile (+ cascaded auth_codes). */
authRouter.post('/admin/delete-member', async (req, res) => {
  try {
    if (!requireServiceRole(res)) return

    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing admin session.' })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData.user) {
      return res.status(401).json({ success: false, message: 'Invalid admin session.' })
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, approval_status')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (
      !adminProfile ||
      adminProfile.role !== 'admin' ||
      adminProfile.approval_status !== 'approved'
    ) {
      return res.status(403).json({ success: false, message: 'Only approved admins can delete members.' })
    }

    const targetId = String(req.body.userId ?? '').trim()
    if (!targetId) return badRequest(res, 'userId is required.')
    if (targetId === authData.user.id) {
      return badRequest(res, 'You cannot delete your own account.')
    }

    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('id', targetId)
      .maybeSingle()

    if (!target) {
      return badRequest(res, 'Member not found.')
    }
    if (target.role === 'admin') {
      return badRequest(res, 'Admin accounts cannot be deleted from this screen.')
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId)
    if (deleteError) throw deleteError

    return res.json({
      success: true,
      message: 'Member deleted from Auth and database.',
      email: target.email,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed.'
    return res.status(500).json({ success: false, message })
  }
})
