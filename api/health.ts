import type { VercelRequest, VercelResponse } from '@vercel/node'
import { databaseConfigured, ensureSchema, getSql } from './_lib/db'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!databaseConfigured()) {
    res.status(503).json({
      ok: false,
      database: false,
      message: 'DATABASE_URL is missing. Connect Neon to the tyson-pushup Vercel project.',
    })
    return
  }

  try {
    await ensureSchema()
    const db = getSql()
    const rows = await db`SELECT 1 AS ok`
    res.status(200).json({ ok: true, database: true, ping: rows[0]?.ok === 1 })
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: true,
      message: error instanceof Error ? error.message : 'Database health check failed',
    })
  }
}
