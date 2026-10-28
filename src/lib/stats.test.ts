import { describe, expect, it } from 'vitest'
import { beatIndex, beatWeights } from '../content/beats'
import { earnedBadges, behindReason, bestDay, currentStreak, isClean, longestStreak, shouldCelebrate, stepUpReady, weekDays } from './stats'
import type { Session, SetLog } from './types'

function sets(completed: number[], target = 8): SetLog[] {
  return completed.map((count) => ({ target, completed: count }))
}

function session(partial: Partial<Session> & { date: string }): Session {
  const setLog = partial.sets ?? sets([partial.totalReps ?? 8])
  const total = setLog.reduce((sum, set) => sum + set.completed, 0)
  return {
    id: partial.id ?? partial.date,
    date: partial.date,
    completedAt: partial.completedAt ?? new Date(`${partial.date}T15:00:00`).toISOString(),
    stageId: partial.stageId ?? 'learn',
    stageLabel: partial.stageLabel ?? 'Learn it',
    optionLabel: partial.optionLabel ?? '5 × 8',
    sets: setLog,
    totalReps: total,
    restSeconds: 60,
    tempoMs: 1750,
    countMode: 'tap',
    variation: 'standard',
    durationSec: 120,
    notes: '',
  }
}

describe('streaks and days', () => {
  const now = new Date(2026, 9, 27, 18)

  it('counts a streak through today and keeps yesterday alive', () => {
    expect(currentStreak([session({ date: '2026-10-27' }), session({ date: '2026-10-26' }), session({ date: '2026-10-25' })], now)).toBe(3)
    expect(currentStreak([session({ date: '2026-10-26' })], now)).toBe(1)
    expect(currentStreak([session({ date: '2026-10-25' })], now)).toBe(0)
    expect(currentStreak([], now)).toBe(0)
  })

  it('breaks the longest streak on a gap', () => {
    const sessions = ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06'].map((date) => session({ date }))
    expect(longestStreak(sessions)).toBe(3)
  })

  it('sums two sessions on the best day and counts training days this week', () => {
    const sessions = [session({ date: '2026-10-27', sets: sets([20]) }), session({ date: '2026-10-27', id: 'b', sets: sets([15]) }), session({ date: '2026-10-26', sets: sets([8]) })]
    expect(bestDay(sessions)).toEqual({ reps: 35, date: '2026-10-27' })
    expect(weekDays(sessions, now)).toBe(2)
  })
})

describe('plan nudges and step-up', () => {
  it('waits until the week has had a chance to start', () => {
    expect(behindReason(0, 3, 1)).toBeNull()
    expect(behindReason(0, 3, 2)).toBeNull()
    expect(behindReason(0, 3, 3)).toBe('cold')
    expect(behindReason(1, 4, 5)).toBe('pace')
    expect(behindReason(2, 5, 6)).toBe('short')
    expect(behindReason(4, 5, 7)).toBe('pace')
    expect(behindReason(5, 5, 7)).toBeNull()
  })

  it('suggests the next stage after three clean recent sessions', () => {
    const now = new Date(2026, 9, 27, 12)
    const clean = (date: string) => session({ date, sets: sets([8, 8, 8], 8), stageId: 'learn' })
    expect(stepUpReady([clean('2026-10-20'), clean('2026-10-22'), clean('2026-10-24')], 'learn', now)?.id).toBe('build')
    expect(stepUpReady([clean('2026-10-20'), clean('2026-10-22')], 'learn', now)).toBeNull()
    const sloppy = session({ date: '2026-10-26', sets: sets([8, 4], 8), stageId: 'learn' })
    expect(stepUpReady([clean('2026-10-20'), clean('2026-10-22'), sloppy], 'learn', now)).toBeNull()
    expect(stepUpReady([clean('2026-10-01'), session({ date: '2026-10-02', stageId: 'learn' }), session({ date: '2026-10-03', stageId: 'learn' })], 'learn', now)).toBeNull()
    expect(stepUpReady([session({ date: '2026-10-20', stageId: 'tyson', sets: sets([25], 25) })], 'tyson', now)).toBeNull()
  })
})

describe('badges and celebrations', () => {
  const now = new Date(2026, 9, 27, 12)

  it('awards the first session, a clean set, a hundred, and a week', () => {
    const week = ['2026-10-26', '2026-10-27', '2026-10-28'].map((date) =>
      session({ date, sets: sets([8, 8], 8), totalReps: 16 }),
    )
    const badges = earnedBadges(week)
    expect(badges).toContain('first-session')
    expect(badges).toContain('clean')
    expect(badges).toContain('week-hit')
    expect(badges).not.toContain('day-100')
    expect(isClean(week[0])).toBe(true)
  })

  it('awards streak, comeback, and 250-day badges from the log', () => {
    const streak = Array.from({ length: 7 }, (_, index) => session({ date: `2026-10-${21 + index}` }))
    expect(earnedBadges(streak)).toEqual(expect.arrayContaining(['streak-3', 'streak-7']))
    const comeback = [session({ date: '2026-10-01' }), session({ date: '2026-10-08' })]
    expect(earnedBadges(comeback)).toContain('comeback')
    expect(earnedBadges([session({ date: '2026-10-27', sets: sets([250], 25) })])).toEqual(
      expect.arrayContaining(['day-100', 'day-250']),
    )
  })

  it('celebrates personal bests and milestone days', () => {
    const small = session({ date: '2026-10-27', sets: sets([8]) })
    expect(shouldCelebrate([], small)).toBe(false)
    const opener = session({ date: '2026-10-27', sets: sets([32], 32) })
    expect(shouldCelebrate([], opener)).toBe(true)
    const prior = session({ date: '2026-10-20', sets: sets([40], 40) })
    expect(shouldCelebrate([prior], session({ date: '2026-10-27', sets: sets([40], 40) }))).toBe(false)
    expect(shouldCelebrate([prior], session({ date: '2026-10-27', sets: sets([48], 48) }))).toBe(true)
    expect(shouldCelebrate([session({ date: '2026-10-20', sets: sets([90], 90) })], session({ date: '2026-10-27', sets: sets([100], 100) }))).toBe(true)
    expect(now.getFullYear()).toBe(2026)
  })
})

describe('phase timing', () => {
  it('walks crouch, dive, bottom, then snap back across one rep', () => {
    expect(beatIndex(0)).toBe(0)
    expect(beatIndex(0.24)).toBe(0)
    expect(beatIndex(0.25)).toBe(1)
    expect(beatIndex(0.48)).toBe(2)
    expect(beatIndex(0.7)).toBe(3)
    expect(beatIndex(0.99)).toBe(3)
  })

  it('keeps a photo visible at every point in the loop', () => {
    for (let step = 0; step < 20; step += 1) {
      const weights = beatWeights(step / 20)
      const sum = weights.reduce((total, weight) => total + weight, 0)
      expect(sum).toBeGreaterThan(0.99)
      expect(weights.some((weight) => weight > 0.4)).toBe(true)
    }
  })
})
