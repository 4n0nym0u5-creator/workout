import { normalizeDatabase, type Database } from './storage'
import type { Session, Settings } from './types'

export const TOKEN_KEY = 'tyson-pushup-token'

export type AccountUser = {
  id: string
  email: string
}

export type AccountStatus =
  | { state: 'loading' }
  | { state: 'signed_out' }
  | { state: 'signed_in'; user: AccountUser; sync: SyncState }

export type SyncState =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'synced'; at: string }
  | { state: 'local'; message: string }
  | { state: 'error'; message: string }

export type AccountSnapshot = {
  userId: string
  email: string
  settings: Settings
  sessions: Session[]
  updatedAt: string | null
}

export function readStoredToken() {
  if (typeof localStorage === 'undefined') return null
  const token = localStorage.getItem(TOKEN_KEY)
  return token && token.length > 20 ? token : null
}

export function storeToken(token: string | null) {
  if (typeof localStorage === 'undefined') return
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

async function api(path: string, init: RequestInit = {}) {
  const token = readStoredToken()
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })
}

export async function fetchMe(): Promise<AccountUser | null> {
  try {
    const response = await api('/api/auth/me')
    if (response.status === 401 || response.status === 503) return null
    if (!response.ok) return null
    const body = (await response.json()) as { user?: AccountUser }
    return body.user ?? null
  } catch {
    return null
  }
}

export async function signup(email: string, password: string) {
  const response = await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const body = (await response.json().catch(() => null)) as
    | { user?: AccountUser; token?: string; message?: string }
    | null
  if (!response.ok) throw new Error(body?.message ?? `Sign up failed (${response.status})`)
  if (!body?.user || !body.token) throw new Error('Sign up did not return a session.')
  storeToken(body.token)
  return body.user
}

export async function login(email: string, password: string) {
  const response = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const body = (await response.json().catch(() => null)) as
    | { user?: AccountUser; token?: string; message?: string }
    | null
  if (!response.ok) throw new Error(body?.message ?? `Log in failed (${response.status})`)
  if (!body?.user || !body.token) throw new Error('Log in did not return a session.')
  storeToken(body.token)
  return body.user
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' })
  } finally {
    storeToken(null)
  }
}

export async function pullAccount(): Promise<AccountSnapshot | null> {
  const response = await api('/api/sync', { method: 'GET' })
  if (response.status === 401 || response.status === 503) return null
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Could not load account log (${response.status})`)
  }
  const body = (await response.json()) as {
    userId: string
    email: string
    settings: unknown
    sessions: unknown[]
    updatedAt: string | null
  }
  const db = normalizeDatabase({ settings: body.settings, sessions: body.sessions })
  return {
    userId: body.userId,
    email: body.email,
    settings: db.settings,
    sessions: db.sessions,
    updatedAt: body.updatedAt,
  }
}

export async function pushAccount(db: Database) {
  const response = await api('/api/sync', {
    method: 'PUT',
    body: JSON.stringify({ settings: db.settings, sessions: db.sessions }),
  })
  if (response.status === 401) return { ok: false as const, unauthorized: true as const }
  if (response.status === 503) return { ok: false as const, unavailable: true as const }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Save failed (${response.status})`)
  }
  return { ok: true as const, unauthorized: false as const, unavailable: false as const }
}

/** Prefer newer completedAt when both sides have the same session id. */
export function mergeAccountLocal(local: Database, account: AccountSnapshot): Database {
  const map = new Map<string, Session>()
  for (const session of local.sessions) map.set(session.id, session)
  for (const session of account.sessions) {
    const existing = map.get(session.id)
    if (!existing || session.completedAt >= existing.completedAt) map.set(session.id, session)
  }
  const preferLocalSettings = local.sessions.length > 0 && account.sessions.length === 0
  return {
    version: 1,
    sessions: [...map.values()],
    settings: preferLocalSettings ? local.settings : account.settings,
  }
}
