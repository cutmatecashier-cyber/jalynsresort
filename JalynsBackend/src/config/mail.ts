import 'dotenv/config'
import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST || 'smtp.gmail.com'
const port = Number(process.env.SMTP_PORT || 465)
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS
const from = process.env.SMTP_FROM || user

if (!user || !pass) {
  console.warn(
    '[mail] SMTP_USER / SMTP_PASS missing. Email sending will fail until Gmail App Password is configured in JalynsBackend/.env',
  )
}

export const mailTransporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
})

export async function sendAppEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  if (!user || !pass || !from) {
    throw new Error('Email is not configured. Set SMTP_USER and SMTP_PASS in the backend .env')
  }

  await mailTransporter.sendMail({
    from: `"Jalyn's Resort" <${from}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? `<p>${options.text.replace(/\n/g, '<br/>')}</p>`,
  })
}
