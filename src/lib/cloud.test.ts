import { describe, expect, it } from 'vitest'
import { mergeCloudLocal } from './cloud'
import type { Database } from './storage'
import type { Session } from './types'

function session(partial: Partial<Session> & { id: string; date: string }): Session {
  return {
    id: partial.id,
    date: partial.date,
    completedAt: partial.completedAt ?? `${partial.date}T12:00:00.000Z`,
    stageId: 'learn',
    stageLabel: 'Learn it',
    optionLabel: '5 × 8',
    sets: [{ target: 8, completed: 8 }],
    totalReps: 8,
    restSeconds: 60,
    tempoMs: null,
    countMode: 'log',
    variation: 'standard',
    durationSec: 0,
    notes: '',
    difficulty: null,
  }
}

describe('cloud merge', () => {
  it('keeps local settings when cloud is empty and merges newer sessions', () => {
    const local: Database = {
      version: 1,
      settings: {
        stageId: 'build',
        optionId: 'build-10',
        restSeconds: 75,
        tempoMs: 1750,
        sound: true,
        haptics: true,
        variation: 'standard',
        countMode: 'log',
        customSets: 5,
        customReps: 8,
        stepUpSnooze: {},
        nudgeSnoozeDate: null,
      },
      sessions: [session({ id: 'a', date: '2026-10-27', completedAt: '2026-10-27T10:00:00.000Z' })],
    }
    const cloud = {
      profileId: '11111111-1111-4111-8111-111111111111',
      settings: { ...local.settings, stageId: 'learn' as const, optionId: 'learn-8' },
      sessions: [
        session({ id: 'a', date: '2026-10-27', completedAt: '2026-10-27T18:00:00.000Z', notes: 'later' }),
        session({ id: 'b', date: '2026-10-26' }),
      ],
      updatedAt: '2026-10-28T00:00:00.000Z',
    }

    const merged = mergeCloudLocal(local, { ...cloud, sessions: [] })
    expect(merged.settings.stageId).toBe('build')
    expect(merged.sessions).toHaveLength(1)

    const withCloud = mergeCloudLocal(local, cloud)
    expect(withCloud.sessions).toHaveLength(2)
    expect(withCloud.sessions.find((item) => item.id === 'a')?.completedAt).toBe('2026-10-27T18:00:00.000Z')
    expect(withCloud.settings.stageId).toBe('learn')
  })
})
