import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from './db.js'

export const SESSION_COOKIE = 'tyson_session'
const TOKEN_DAYS = 30

export type AuthUser = {
  id: string
  email: string
}

function parseCookies(header: string | string[] | undefined) {
  const raw = Array.isArray(header) ? header.join(';') : header ?? ''
  const out: Record<string, string> = {}
  for (const part of raw.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null
  return email
}

export function validatePassword(value: unknown) {
  if (typeof value !== 'string') return null
  if (value.length < 8 || value.length > 128) return null
  return value
}

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, salt, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function readSessionToken(req: VercelRequest) {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    const bearer = header.slice(7).trim()
    if (bearer) return bearer
  }
  const cookies = parseCookies(req.headers.cookie)
  return cookies[SESSION_COOKIE] || null
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const maxAge = TOKEN_DAYS * 24 * 60 * 60
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: VercelResponse) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export async function createSession(userId: string) {
  const db = getSql()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000)
  await db`
    INSERT INTO auth_tokens (token_hash, user_id, expires_at)
    VALUES (${tokenHash(token)}, ${userId}, ${expiresAt.toISOString()})
  `
  return { token, expiresAt }
}

export async function destroySession(token: string | null) {
  if (!token) return
  const db = getSql()
  await db`DELETE FROM auth_tokens WHERE token_hash = ${tokenHash(token)}`
}

export async function userFromRequest(req: VercelRequest): Promise<AuthUser | null> {
  const token = readSessionToken(req)
  if (!token) return null
  const db = getSql()
  const rows = await db<{ id: string; email: string }[]>`
    SELECT u.id, u.email
    FROM auth_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ${tokenHash(token)}
      AND t.expires_at > now()
    LIMIT 1
  `
  return rows[0] ?? null
}
