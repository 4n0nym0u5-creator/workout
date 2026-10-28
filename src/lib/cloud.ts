import { normalizeDatabase, type Database } from './storage'
import type { Session, Settings } from './types'

export const PROFILE_KEY = 'tyson-pushup-profile-id'

export type CloudStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'synced'; at: string }
  | { state: 'local'; message: string }
  | { state: 'error'; message: string }

export type CloudSnapshot = {
  profileId: string
  settings: Settings
  sessions: Session[]
  updatedAt: string | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function getOrCreateProfileId() {
  if (typeof localStorage === 'undefined') return crypto.randomUUID()
  const existing = localStorage.getItem(PROFILE_KEY)
  if (existing && isUuid(existing)) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(PROFILE_KEY, next)
  return next
}

export function setProfileId(profileId: string) {
  if (!isUuid(profileId)) throw new Error('Profile id must be a UUID.')
  localStorage.setItem(PROFILE_KEY, profileId)
}

async function request(path: string, init: RequestInit & { profileId: string }) {
  const { profileId, ...rest } = init
  const response = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Profile-Id': profileId,
      ...(rest.headers ?? {}),
    },
  })
  return response
}

export async function checkCloudHealth() {
  try {
    const response = await fetch('/api/health')
    const body = (await response.json()) as { ok?: boolean; database?: boolean; message?: string }
    if (!response.ok || !body.ok) {
      return { ok: false as const, message: body.message ?? 'Cloud database is not ready.' }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, message: 'Could not reach the cloud API.' }
  }
}

export async function pullCloud(profileId: string): Promise<CloudSnapshot | null> {
  const response = await request('/api/sync', { method: 'GET', profileId })
  if (response.status === 503) return null
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Pull failed (${response.status})`)
  }
  const body = (await response.json()) as {
    profileId: string
    settings: unknown
    sessions: unknown[]
    updatedAt: string | null
  }
  const db = normalizeDatabase({ settings: body.settings, sessions: body.sessions })
  return {
    profileId: body.profileId,
    settings: db.settings,
    sessions: db.sessions,
    updatedAt: body.updatedAt,
  }
}

export async function pushCloud(profileId: string, db: Database) {
  const response = await request('/api/sync', {
    method: 'PUT',
    profileId,
    body: JSON.stringify({ settings: db.settings, sessions: db.sessions }),
  })
  if (response.status === 503) return { ok: false as const, unavailable: true as const }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Push failed (${response.status})`)
  }
  return { ok: true as const, unavailable: false as const }
}

/** Prefer newer completedAt when both sides have the same session id. */
export function mergeCloudLocal(local: Database, cloud: CloudSnapshot): Database {
  const map = new Map<string, Session>()
  for (const session of local.sessions) map.set(session.id, session)
  for (const session of cloud.sessions) {
    const existing = map.get(session.id)
    if (!existing || session.completedAt >= existing.completedAt) map.set(session.id, session)
  }
  const preferLocalSettings = local.sessions.length > 0 && cloud.sessions.length === 0
  return {
    version: 1,
    sessions: [...map.values()],
    settings: preferLocalSettings ? local.settings : cloud.settings,
  }
}
