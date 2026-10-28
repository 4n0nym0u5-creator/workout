import postgres, { type Sql } from 'postgres'

let sql: Sql | null = null
let ready: Promise<void> | null = null

/** Neon injects DATABASE_URL; Supabase Marketplace injects POSTGRES_URL / POSTGRES_PRISMA_URL. */
export function databaseUrl() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    ''
  )
}

export function databaseConfigured() {
  return Boolean(databaseUrl())
}

export function getSql() {
  const url = databaseUrl()
  if (!url) throw new Error('No Postgres URL configured (DATABASE_URL or POSTGRES_URL)')
  if (!sql) {
    sql = postgres(url, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  }
  return sql
}

export async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const db = getSql()
      await db`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await db`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await db`CREATE INDEX IF NOT EXISTS auth_tokens_user_idx ON auth_tokens (user_id)`
      await db`CREATE INDEX IF NOT EXISTS auth_tokens_expires_idx ON auth_tokens (expires_at)`

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
