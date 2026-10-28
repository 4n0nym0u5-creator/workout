import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearSessionCookie, destroySession, readSessionToken } from '../_lib/auth.js'
import { databaseConfigured, ensureSchema } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    if (databaseConfigured()) {
      await ensureSchema()
      await destroySession(readSessionToken(req))
    }
  } catch {
    // Always clear the cookie even if the database is down.
  }
  clearSessionCookie(res)
  res.status(200).json({ ok: true })
}
