import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { JSONValue } from 'postgres'
import { databaseConfigured, ensureSchema, getSql, isProfileId } from './_lib/db'

type SyncBody = {
  settings?: unknown
  sessions?: unknown[]
}

function readProfileId(req: VercelRequest) {
  const header = req.headers['x-profile-id']
  const fromHeader = Array.isArray(header) ? header[0] : header
  const fromQuery = typeof req.query.profileId === 'string' ? req.query.profileId : null
  const value = fromHeader || fromQuery
  return isProfileId(value) ? value : null
}

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Profile-Id')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (!databaseConfigured()) {
    res.status(503).json({
      error: 'database_unavailable',
      message: 'Connect Neon or Supabase Postgres to this Vercel project, then redeploy.',
    })
    return
  }

  const profileId = readProfileId(req)
  if (!profileId) {
    res.status(400).json({ error: 'invalid_profile', message: 'Send a UUID profile id in X-Profile-Id.' })
    return
  }

  try {
    await ensureSchema()
    const db = getSql()

    if (req.method === 'GET') {
      await db`
        INSERT INTO profiles (id, settings)
        VALUES (${profileId}, '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `
      const profileRows = await db<{ settings: unknown; updated_at: string | Date }[]>`
        SELECT settings, updated_at FROM profiles WHERE id = ${profileId}
      `
      const sessionRows = await db<{ payload: unknown }[]>`
        SELECT payload
        FROM sessions
        WHERE profile_id = ${profileId}
        ORDER BY date DESC, completed_at DESC
      `
      res.status(200).json({
        profileId,
        settings: profileRows[0]?.settings ?? {},
        sessions: sessionRows.map((row) => row.payload),
        updatedAt: profileRows[0]?.updated_at ?? null,
      })
      return
    }

    if (req.method === 'PUT') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as SyncBody
      const settings = (body?.settings ?? {}) as JSONValue
      const sessions = Array.isArray(body?.sessions) ? body.sessions.slice(0, 5000) : []

      await db`
        INSERT INTO profiles (id, settings, updated_at)
        VALUES (${profileId}, ${db.json(settings)}, now())
        ON CONFLICT (id) DO UPDATE
        SET settings = EXCLUDED.settings, updated_at = now()
      `

      await db`DELETE FROM sessions WHERE profile_id = ${profileId}`

      for (const item of sessions) {
        if (!item || typeof item !== 'object') continue
        const session = item as Record<string, unknown>
        const id = typeof session.id === 'string' ? session.id : null
        const date = typeof session.date === 'string' ? session.date : null
        const completedAt = typeof session.completedAt === 'string' ? session.completedAt : null
        if (!id || !date || !completedAt) continue
        await db`
          INSERT INTO sessions (id, profile_id, date, completed_at, payload, updated_at)
          VALUES (
            ${id},
            ${profileId},
            ${date},
            ${completedAt},
            ${db.json(session as JSONValue)},
            now()
          )
          ON CONFLICT (id) DO UPDATE
          SET
            profile_id = EXCLUDED.profile_id,
            date = EXCLUDED.date,
            completed_at = EXCLUDED.completed_at,
            payload = EXCLUDED.payload,
            updated_at = now()
        `
      }

      res.status(200).json({ ok: true, profileId, sessionCount: sessions.length })
      return
    }

    res.status(405).json({ error: 'method_not_allowed' })
  } catch (error) {
    res.status(500).json({
      error: 'sync_failed',
      message: error instanceof Error ? error.message : 'Sync failed',
    })
  }
}
