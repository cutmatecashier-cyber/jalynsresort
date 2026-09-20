import { createClient } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import { isServiceRoleConfigured, supabaseAdmin } from '../config/supabase.js'

/** Read Bearer / x-access-token / body.access_token (Vite proxy often drops Authorization). */
export function bearerFromRequest(req: Request): string {
  const authHeader =
    (typeof req.headers.authorization === 'string' && req.headers.authorization) ||
    (typeof req.headers['x-access-token'] === 'string' && req.headers['x-access-token']) ||
    ''

  const trimmed = authHeader.trim()
  if (/^bearer\s+/i.test(trimmed)) {
    return trimmed.replace(/^bearer\s+/i, '').trim()
  }
  if (trimmed) return trimmed

  const body = req.body as { access_token?: unknown } | undefined
  if (typeof body?.access_token === 'string' && body.access_token.trim()) {
    return body.access_token.trim()
  }
  return ''
}

async function userFromAccessToken(token: string) {
  const direct = await supabaseAdmin.auth.getUser(token)
  if (direct.data.user) return { user: direct.data.user, error: null as Error | null }

  // Service-role clients can ignore the JWT and report "Auth session missing!".
  // Verify with an anon client that actually sends the user access token.
  const url = (process.env.SUPABASE_URL || '').trim()
  const anon = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()

  if (url && anon) {
    const userClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const scoped = await userClient.auth.getUser(token)
    if (scoped.data.user) return { user: scoped.data.user, error: null }
    return {
      user: null,
      error: scoped.error ?? direct.error ?? new Error('Invalid admin session.'),
    }
  }

  return {
    user: null,
    error: direct.error ?? new Error('Invalid admin session.'),
  }
}

export type ApprovedAdmin = { userId: string; name: string }

/**
 * Requires an approved admin JWT. Returns null after writing the HTTP error response.
 */
export async function requireApprovedAdmin(
  req: Request,
  res: Response,
  forbiddenMessage = 'Only approved admins can perform this action.',
): Promise<ApprovedAdmin | null> {
  if (!isServiceRoleConfigured()) {
    res.status(500).json({ success: false, message: 'Backend service_role key is not configured.' })
    return null
  }

  const token = bearerFromRequest(req)
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Missing admin session. Sign out and sign in again, then retry.',
    })
    return null
  }

  const { user, error: authError } = await userFromAccessToken(token)
  if (!user) {
    const raw = authError instanceof Error ? authError.message : String(authError || '')
    const needsRelogin = /auth session missing|session_not_found|invalid jwt|expired/i.test(raw)
    res.status(401).json({
      success: false,
      message: needsRelogin
        ? 'Admin session expired or invalid. Sign out and sign in again, then retry.'
        : raw || 'Invalid admin session. Sign out and sign in again.',
    })
    return null
  }

  const { data: adminProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, approval_status, name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    res.status(500).json({
      success: false,
      message: `Could not verify admin profile: ${profileError.message}`,
    })
    return null
  }

  if (
    !adminProfile ||
    adminProfile.role !== 'admin' ||
    adminProfile.approval_status !== 'approved'
  ) {
    res.status(403).json({ success: false, message: forbiddenMessage })
    return null
  }

  return {
    userId: user.id,
    name: String(adminProfile.name || 'Admin'),
  }
}
