import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { contactRouter } from './routes/contact.js'
import { scubaRouter } from './routes/scuba.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients and local/LAN Vite origins during development.
      if (!origin) return callback(null, true)
      const allowed = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://192.168.1.12:5174',
        'http://192.168.1.12:5173',
        'http://192.168.242.1:5174',
        'http://192.168.242.1:5173',
        process.env.FRONTEND_ORIGIN || '',
      ].filter(Boolean)
      if (allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/.test(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const serviceRoleOk = Boolean(
    key &&
      !key.includes('REPLACE_WITH') &&
      !key.startsWith('sb_publishable_') &&
      key !== 'your-service-role-secret-key' &&
      (key.startsWith('eyJ') || key.startsWith('sb_secret_')),
  )

  res.json({
    success: true,
    message: "Jalyn's Resort API is running",
    serviceRoleConfigured: serviceRoleOk,
  })
})

app.use('/api/auth', authRouter)
app.use('/api/contact', contactRouter)
app.use('/api/scuba', scubaRouter)

app.listen(PORT, () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const ok =
    key &&
    !key.includes('REPLACE_WITH') &&
    !key.startsWith('sb_publishable_') &&
    (key.startsWith('eyJ') || key.startsWith('sb_secret_'))
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Supabase service_role: ${ok ? 'OK' : 'MISSING/INVALID — check JalynsBackend/.env'}`)
})
