import { createHash, randomInt } from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'
import { sendAppEmail } from '../config/mail.js'

export type CodePurpose = 'email_verify' | 'password_reset'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds

export function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export function generateSixDigitCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export async function assertResendAllowed(email: string, purpose: CodePurpose) {
  const since = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString()
  const { data, error } = await supabaseAdmin
    .from('auth_codes')
    .select('created_at')
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    if (error.code === 'PGRST205' || /auth_codes/i.test(error.message)) {
      throw new Error(
        'auth_codes table is missing. Run supabase/AUTH_CODES.sql in the Supabase SQL Editor, then try again.',
      )
    }
    throw error
  }
  if (data && data.length > 0) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - new Date(data[0].created_at).getTime())) / 1000,
    )
    throw new Error(`Please wait ${Math.max(waitSec, 1)}s before requesting another code.`)
  }
}

export async function issueAndSendCode(options: {
  userId: string
  email: string
  purpose: CodePurpose
}) {
  const email = options.email.trim().toLowerCase()
  await assertResendAllowed(email, options.purpose)

  const code = generateSixDigitCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()

  // Invalidate previous unused codes for this purpose/email
  await supabaseAdmin
    .from('auth_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('email', email)
    .eq('purpose', options.purpose)
    .is('used_at', null)

  const { error: insertError } = await supabaseAdmin.from('auth_codes').insert({
    user_id: options.userId,
    email,
    purpose: options.purpose,
    code_hash: codeHash,
    expires_at: expiresAt,
  })

  if (insertError) {
    throw new Error(
      insertError.code === 'PGRST205' || /auth_codes/i.test(insertError.message)
        ? 'auth_codes table is missing. Run supabase/AUTH_CODES.sql in the Supabase SQL Editor, then try again.'
        : insertError.message,
    )
  }

  const isVerify = options.purpose === 'email_verify'
  const subject = isVerify
    ? "Your Jalyn's Resort verification code"
    : "Your Jalyn's Resort password reset code"

  const text = isVerify
    ? `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not create an account, ignore this email.`
    : `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request a reset, ignore this email.`

  await sendAppEmail({
    to: email,
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0c1210">
        <h2 style="margin:0 0 12px">Jalyn's Resort</h2>
        <p>${isVerify ? 'Your verification code is:' : 'Your password reset code is:'}</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#0ea5e9">${code}</p>
        <p>This code expires in <strong>10 minutes</strong> and can be used once.</p>
      </div>
    `,
  })

  return { expiresAt, cooldownSeconds: RESEND_COOLDOWN_MS / 1000 }
}

export async function consumeCode(options: {
  email: string
  purpose: CodePurpose
  code: string
}) {
  const email = options.email.trim().toLowerCase()
  const codeHash = hashCode(options.code.trim())

  const { data: rows, error } = await supabaseAdmin
    .from('auth_codes')
    .select('*')
    .eq('email', email)
    .eq('purpose', options.purpose)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = rows?.[0]
  if (!row) {
    throw new Error('Invalid verification code.')
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('This code has expired. Please request a new one.')
  }

  const { error: useError } = await supabaseAdmin
    .from('auth_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)

  if (useError) throw useError

  return row as { id: string; user_id: string; email: string }
}
