import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  createSession,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
  validatePassword,
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
      message: 'Use a valid email and a password of at least 8 characters.',
    })
    return
  }

  try {
    await ensureSchema()
    const db = getSql()
    const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) {
      res.status(409).json({ error: 'email_taken', message: 'That email already has an account. Log in instead.' })
      return
    }

    const id = randomUUID()
    await db`
      INSERT INTO users (id, email, password_hash)
      VALUES (${id}, ${email}, ${hashPassword(password)})
    `
    await db`
      INSERT INTO profiles (id, settings)
      VALUES (${id}, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `
    const session = await createSession(id)
    setSessionCookie(res, session.token)
    res.status(201).json({ ok: true, user: { id, email }, token: session.token })
  } catch (error) {
    res.status(500).json({
      error: 'signup_failed',
      message: error instanceof Error ? error.message : 'Could not create account.',
    })
  }
}
