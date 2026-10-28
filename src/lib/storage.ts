import { PLAN } from '../content/guide'
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  type CountMode,
  type PlanStageId,
  type Session,
  type SetLog,
  type Settings,
  type VariationId,
} from './types'
import { isIsoDate } from './dates'

export type Database = {
  version: 1
  sessions: Session[]
  settings: Settings
}

export type Backup = {
  sessions: Session[]
  settings?: Settings
  skipped: number
}

const STAGE_IDS = new Set<PlanStageId>(['learn', 'build', 'speed', 'volume', 'tyson'])
const VARIATION_IDS = new Set<VariationId>([
  'standard',
  'incline',
  'split',
  'knees',
  'slow',
  'timed',
  'pause',
  'feet-up',
  'combo',
])
const COUNT_MODES = new Set<CountMode>(['tap', 'tempo'])

export function emptyDatabase(): Database {
  return { version: 1, sessions: [], settings: { ...DEFAULT_SETTINGS, stepUpSnooze: {} } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function intIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function readSet(value: unknown): SetLog | null {
  if (!isRecord(value)) return null
  if (!intIn(value.target, 0, 500) || !intIn(value.completed, 0, 999)) return null
  return { target: value.target, completed: value.completed }
}

function readSession(value: unknown): Session | null {
  if (!isRecord(value)) return null
  if (typeof value.date !== 'string' || !isIsoDate(value.date)) return null
  if (!Array.isArray(value.sets) || value.sets.length < 1 || value.sets.length > 40) return null
  const sets: SetLog[] = []
  for (const set of value.sets) {
    const parsed = readSet(set)
    if (!parsed) return null
    sets.push(parsed)
  }
  const stageId = value.stageId === 'custom' || (typeof value.stageId === 'string' && STAGE_IDS.has(value.stageId as PlanStageId))
    ? (value.stageId as Session['stageId'])
    : null
  if (!stageId) return null
  const variation = typeof value.variation === 'string' && VARIATION_IDS.has(value.variation as VariationId)
    ? (value.variation as VariationId)
    : 'standard'
  const countMode = typeof value.countMode === 'string' && COUNT_MODES.has(value.countMode as CountMode)
    ? (value.countMode as CountMode)
    : 'tap'
  const completedAt = typeof value.completedAt === 'string' && !Number.isNaN(Date.parse(value.completedAt))
    ? value.completedAt
    : new Date(`${value.date}T12:00:00`).toISOString()
  const totalReps = sets.reduce((total, set) => total + set.completed, 0)
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : crypto.randomUUID(),
    date: value.date,
    completedAt,
    stageId,
    stageLabel: typeof value.stageLabel === 'string' && value.stageLabel.trim() ? value.stageLabel.slice(0, 80) : 'Session',
    optionLabel: typeof value.optionLabel === 'string' ? value.optionLabel.slice(0, 80) : '',
    sets,
    totalReps,
    restSeconds: intIn(value.restSeconds, 0, 600) ? value.restSeconds : 60,
    tempoMs: value.tempoMs === null ? null : intIn(value.tempoMs, 500, 10000) ? value.tempoMs : null,
    countMode,
    variation,
    durationSec: intIn(value.durationSec, 0, 86_400) ? value.durationSec : 0,
    notes: typeof value.notes === 'string' ? value.notes.slice(0, 280) : '',
  }
}

export function normalizeSettings(value: unknown): Settings {
  const source = isRecord(value) ? value : {}
  const stageId = typeof source.stageId === 'string' && STAGE_IDS.has(source.stageId as PlanStageId)
    ? (source.stageId as PlanStageId)
    : DEFAULT_SETTINGS.stageId
  const stage = PLAN.find((item) => item.id === stageId) ?? PLAN[0]
  const optionId = typeof source.optionId === 'string' && stage.options.some((option) => option.id === source.optionId)
    ? source.optionId
    : stage.defaultOptionId
  const snoozeIn = isRecord(source.stepUpSnooze) ? source.stepUpSnooze : {}
  const stepUpSnooze: Settings['stepUpSnooze'] = {}
  for (const id of STAGE_IDS) {
    if (intIn(snoozeIn[id], 0, 100000)) stepUpSnooze[id] = snoozeIn[id] as number
  }
  return {
    stageId,
    optionId,
    restSeconds: intIn(source.restSeconds, 15, 300) ? (source.restSeconds as number) : DEFAULT_SETTINGS.restSeconds,
    tempoMs: intIn(source.tempoMs, 1000, 5000) ? (source.tempoMs as number) : DEFAULT_SETTINGS.tempoMs,
    sound: typeof source.sound === 'boolean' ? source.sound : DEFAULT_SETTINGS.sound,
    haptics: typeof source.haptics === 'boolean' ? source.haptics : DEFAULT_SETTINGS.haptics,
    variation: typeof source.variation === 'string' && VARIATION_IDS.has(source.variation as VariationId)
      ? (source.variation as VariationId)
      : DEFAULT_SETTINGS.variation,
    countMode: typeof source.countMode === 'string' && COUNT_MODES.has(source.countMode as CountMode)
      ? (source.countMode as CountMode)
      : DEFAULT_SETTINGS.countMode,
    customSets: intIn(source.customSets, 1, 30) ? (source.customSets as number) : DEFAULT_SETTINGS.customSets,
    customReps: intIn(source.customReps, 1, 100) ? (source.customReps as number) : DEFAULT_SETTINGS.customReps,
    stepUpSnooze,
    nudgeSnoozeDate: typeof source.nudgeSnoozeDate === 'string' && isIsoDate(source.nudgeSnoozeDate) ? source.nudgeSnoozeDate : null,
  }
}

export function normalizeDatabase(value: unknown): Database {
  const source = isRecord(value) ? value : {}
  const sessions: Session[] = []
  if (Array.isArray(source.sessions)) {
    for (const item of source.sessions) {
      const session = readSession(item)
      if (session) sessions.push(session)
      if (sessions.length >= 5000) break
    }
  }
  return {
    version: 1,
    sessions,
    settings: normalizeSettings(source.settings),
  }
}

export function parseBackup(text: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const root = Array.isArray(parsed) ? { sessions: parsed } : parsed
  if (!isRecord(root) || !Array.isArray(root.sessions)) {
    throw new Error('No sessions in that file.')
  }
  let skipped = 0
  const sessions: Session[] = []
  for (const item of root.sessions) {
    const session = readSession(item)
    if (session) sessions.push(session)
    else skipped += 1
    if (sessions.length >= 5000) break
  }
  if (sessions.length === 0) throw new Error('No usable sessions in that file.')
  const settings = isRecord(root.settings) ? normalizeSettings(root.settings) : undefined
  return { sessions, settings, skipped }
}

export function serializeBackup(db: Database) {
  return JSON.stringify(
    {
      app: 'tyson-pushup',
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: db.sessions,
      settings: db.settings,
    },
    null,
    2,
  )
}

export function loadDatabase(): Database {
  if (typeof localStorage === 'undefined') return emptyDatabase()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyDatabase()
  try {
    return normalizeDatabase(JSON.parse(raw) as unknown)
  } catch {
    try {
      localStorage.setItem(`${STORAGE_KEY}-corrupt-${Date.now()}`, raw)
    } catch {
      // Ignore quota failures while preserving the in-memory empty log.
    }
    return emptyDatabase()
  }
}

export function saveDatabase(db: Database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}
