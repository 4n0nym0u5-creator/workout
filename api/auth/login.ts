import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  createSession,
  normalizeEmail,
  setSessionCookie,
  validatePassword,
  verifyPassword,
} from '../_lib/auth.js'
import { databaseConfigured, ensureSchema, getSql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'database_unavailable', message: 'Database is not connected.' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const email = normalizeEmail(body?.email)
  const password = validatePassword(body?.password)
  if (!email || !password) {
    res.status(400).json({
      error: 'invalid_input',
      message: 'Enter your email and password.',
    })
    return
  }

  try {
    await ensureSchema()
    const db = getSql()
    const rows = await db<{ id: string; email: string; password_hash: string }[]>`
      SELECT id, email, password_hash FROM users WHERE email = ${email} LIMIT 1
    `
    const user = rows[0]
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'invalid_credentials', message: 'Email or password is wrong.' })
      return
    }

    const session = await createSession(user.id)
    setSessionCookie(res, session.token)
    res.status(200).json({ ok: true, user: { id: user.id, email: user.email }, token: session.token })
  } catch (error) {
    res.status(500).json({
      error: 'login_failed',
      message: error instanceof Error ? error.message : 'Could not log in.',
    })
  }
}
