import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | null = null
let ready: Promise<void> | null = null

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error('DATABASE_URL is not configured')
  if (!sql) sql = neon(url)
  return sql
}

export async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const db = getSql()
      await db`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          settings JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await db`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          completed_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await db`CREATE INDEX IF NOT EXISTS sessions_profile_date_idx ON sessions (profile_id, date)`
      await db`CREATE INDEX IF NOT EXISTS sessions_profile_updated_idx ON sessions (profile_id, updated_at DESC)`
    })().catch((error) => {
      ready = null
      throw error
    })
  }
  await ready
}

export function isProfileId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
