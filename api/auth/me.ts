import type { VercelRequest, VercelResponse } from '@vercel/node'
import { userFromRequest } from '../_lib/auth.js'
import { databaseConfigured, ensureSchema } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'database_unavailable', message: 'Database is not connected.' })
    return
  }

  try {
    await ensureSchema()
    const user = await userFromRequest(req)
    if (!user) {
      res.status(401).json({ error: 'unauthorized', message: 'Not logged in.' })
      return
    }
    res.status(200).json({ ok: true, user })
  } catch (error) {
    res.status(500).json({
      error: 'me_failed',
      message: error instanceof Error ? error.message : 'Could not load account.',
    })
  }
}
