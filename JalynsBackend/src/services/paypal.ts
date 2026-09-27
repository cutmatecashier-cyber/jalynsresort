const TOKEN_SKEW_MS = 60_000

type TokenCache = { value: string; expiresAt: number }

let tokenCache: TokenCache | null = null

export function paypalClientId() {
  return (process.env.PAYPAL_CLIENT_ID || '').trim()
}

function paypalSecret() {
  return (process.env.PAYPAL_CLIENT_SECRET || '').trim()
}

export function paypalConfigured() {
  return Boolean(paypalClientId() && paypalSecret())
}

export function paypalApiBase() {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

function authHeader() {
  const raw = `${paypalClientId()}:${paypalSecret()}`
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

async function paypalToken() {
  if (!paypalConfigured()) {
    throw new Error('PayPal is not set up yet.')
  }
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.value

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error_description?: string
    error?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Could not connect to PayPal.')
  }
  const expiresIn = Number(data.expires_in)
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn * 1000 : 300_000) - TOKEN_SKEW_MS,
  }
  return data.access_token
}

export type PayPalOrder = {
  id?: string
  status?: string
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string
        status?: string
        amount?: { currency_code?: string; value?: string }
      }>
    }
  }>
}

async function paypalJson(path: string, init: RequestInit) {
  const token = await paypalToken()
  const res = await fetch(`${paypalApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as PayPalOrder & {
    message?: string
    details?: Array<{ description?: string; issue?: string }>
    name?: string
  }
  if (!res.ok) {
    const detail = data.details?.find((item) => item.description || item.issue)
    throw new Error(detail?.description || detail?.issue || data.message || data.name || 'PayPal request failed.')
  }
  return data
}

export async function createPayPalOrder(amount: number, description: string) {
  const value = amount.toFixed(2)
  const order = await paypalJson('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: description.slice(0, 127),
          amount: { currency_code: 'PHP', value },
        },
      ],
    }),
  })
  const orderId = String(order.id || '').trim()
  if (!orderId) throw new Error('PayPal did not return an order.')
  return orderId
}

export async function capturePayPalOrder(orderId: string) {
  try {
    return await paypalJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      body: '{}',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (!/ORDER_ALREADY_CAPTURED|already been captured/i.test(message)) throw err
    return paypalJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET' })
  }
}

export function paidAmountFromOrder(order: PayPalOrder): { captureId: string; amount: number } {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0]
  const captureId = String(capture?.id || '').trim()
  const value = Number(capture?.amount?.value)
  const currency = String(capture?.amount?.currency_code || '').toUpperCase()
  if (order.status !== 'COMPLETED' || capture?.status !== 'COMPLETED' || !captureId) {
    throw new Error('PayPal payment was not completed.')
  }
  if (currency !== 'PHP' || !Number.isFinite(value)) {
    throw new Error('PayPal payment currency does not match this booking.')
  }
  return { captureId, amount: value }
}
