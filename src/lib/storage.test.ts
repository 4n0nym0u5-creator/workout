import { describe, expect, it } from 'vitest'
import { normalizeSettings, parseBackup } from './storage'

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
})
