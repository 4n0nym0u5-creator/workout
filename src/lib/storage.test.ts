import { describe, expect, it } from 'vitest'
import { normalizeDatabase, normalizeSettings, parseBackup } from './storage'

describe('backup import', () => {
  it('recomputes totals and keeps a valid session', () => {
    const raw = JSON.stringify({
      version: 1,
      sessions: [
        {
          id: 'a',
          date: '2026-10-27',
          completedAt: '2026-10-27T15:00:00.000Z',
          stageId: 'build',
          stageLabel: 'Build',
          optionLabel: '6 × 10',
          sets: [
            { target: 10, completed: 10 },
            { target: 10, completed: 8 },
          ],
          totalReps: 1,
          restSeconds: 60,
          tempoMs: 1750,
          countMode: 'tempo',
          variation: 'standard',
          durationSec: 400,
          notes: 'sharp',
        },
      ],
      settings: { stageId: 'speed', optionId: 'speed-20', tempoMs: 2000 },
    })
    const backup = parseBackup(raw)
    expect(backup.sessions[0]?.totalReps).toBe(18)
    expect(backup.sessions[0]?.stageId).toBe('build')
    expect(backup.settings?.stageId).toBe('speed')
    expect(backup.settings?.optionId).toBe('speed-20')
    expect(backup.settings?.tempoMs).toBe(2000)
  })

  it('rejects junk and files with no usable sessions', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/)
    expect(() => parseBackup(JSON.stringify({ sessions: [{ hello: true }] }))).toThrow(/usable/)
    expect(() => parseBackup(JSON.stringify({ note: 'empty' }))).toThrow(/No sessions/)
  })

  it('falls back when an option does not belong to the stage', () => {
    expect(normalizeSettings({ stageId: 'learn', optionId: 'tyson-5x50' }).optionId).toBe('learn-8')
  })

  it('keeps an older log and does not turn a saved tap setting into something else', () => {
    const db = normalizeDatabase({
      version: 1,
      sessions: [
        {
          id: 'old',
          date: '2026-10-20',
          completedAt: '2026-10-20T15:00:00.000Z',
          stageId: 'learn',
          stageLabel: 'Learn it',
          optionLabel: '5 × 8',
          sets: [
            { target: 8, completed: 8 },
            { target: 8, completed: 7 },
          ],
          totalReps: 99,
          restSeconds: 60,
          tempoMs: null,
          countMode: 'tap',
          variation: 'standard',
          durationSec: 90,
          notes: 'kept',
        },
      ],
      settings: { stageId: 'learn', optionId: 'learn-8', countMode: 'tap' },
    })
    expect(db.sessions).toHaveLength(1)
    expect(db.sessions[0]).toMatchObject({
      id: 'old',
      totalReps: 15,
      notes: 'kept',
      countMode: 'tap',
      difficulty: null,
      sets: [
        { target: 8, completed: 8 },
        { target: 8, completed: 7 },
      ],
    })
    expect(db.settings.countMode).toBe('tap')
  })

  it('defaults a new install to logging a session instead of counting every rep', () => {
    expect(normalizeSettings({}).countMode).toBe('log')
    expect(normalizeDatabase({}).settings.countMode).toBe('log')
  })
})
