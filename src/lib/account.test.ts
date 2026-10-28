import { describe, expect, it } from 'vitest'
import { mergeAccountLocal } from './account'
import type { Session } from './types'

function session(partial: Partial<Session> & Pick<Session, 'id' | 'date' | 'completedAt' | 'totalReps'>): Session {
  return {
    stageId: 'learn',
    stageLabel: 'Learn',
    optionLabel: '5 × 8',
    sets: [{ target: 8, completed: partial.totalReps }],
    restSeconds: 60,
    tempoMs: null,
    countMode: 'sets',
    variation: 'standard',
    durationSec: 0,
    notes: '',
    difficulty: null,
    ...partial,
  }
}

describe('account merge', () => {
  it('keeps local settings when account is empty and merges newer sessions', () => {
    const local = {
      version: 1 as const,
      settings: {
        stageId: 'build' as const,
        optionId: 'build-10',
        restSeconds: 75,
        tempoMs: 1750,
        sound: true,
        haptics: true,
        variation: 'standard' as const,
        countMode: 'log' as const,
        customSets: 5,
        customReps: 8,
        stepUpSnooze: {},
        nudgeSnoozeDate: null,
      },
      sessions: [session({ id: 'a', date: '2026-10-27', completedAt: '2026-10-27T10:00:00.000Z', totalReps: 10 })],
    }
    const account = {
      userId: '11111111-1111-4111-8111-111111111111',
      email: 'you@example.com',
      settings: { ...local.settings, stageId: 'learn' as const, optionId: 'learn-8' },
      sessions: [
        session({ id: 'a', date: '2026-10-27', completedAt: '2026-10-27T12:00:00.000Z', totalReps: 16 }),
        session({ id: 'b', date: '2026-10-26', completedAt: '2026-10-26T12:00:00.000Z', totalReps: 8 }),
      ],
      updatedAt: '2026-10-27T12:00:00.000Z',
    }

    const merged = mergeAccountLocal(local, { ...account, sessions: [] })
    expect(merged.settings.stageId).toBe('build')

    const withAccount = mergeAccountLocal(local, account)
    expect(withAccount.sessions).toHaveLength(2)
    expect(withAccount.sessions.find((item) => item.id === 'a')?.totalReps).toBe(16)
    expect(withAccount.settings.stageId).toBe('learn')
  })
})
