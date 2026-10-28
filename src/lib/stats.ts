import type { BadgeId } from '../content/badges'
import { PLAN, stageById } from '../content/guide'
import type { PlanStageId, Session } from './types'
import { addDays, daysBetween, localDate, parseDate, startOfDay, startOfWeek, weekdayMon1 } from './dates'

export type NudgeKind = 'cold' | 'pace' | 'short'

export function isClean(session: Session) {
  return session.sets.length > 0 && session.sets.every((set) => set.target > 0 && set.completed >= set.target)
}

export function dayTotals(sessions: Session[]) {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    totals.set(session.date, (totals.get(session.date) ?? 0) + session.totalReps)
  }
  return totals
}

export function lifetimeReps(sessions: Session[]) {
  let total = 0
  for (const session of sessions) total += session.totalReps
  return total
}

export function bestDay(sessions: Session[]) {
  let best = 0
  let date: string | null = null
  for (const [day, reps] of dayTotals(sessions)) {
    if (reps > best) {
      best = reps
      date = day
    }
  }
  return { reps: best, date }
}

export function bestSet(sessions: Session[]) {
  let best = 0
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.completed > best) best = set.completed
    }
  }
  return best
}

export function bestSession(sessions: Session[]) {
  let best = 0
  for (const session of sessions) {
    if (session.totalReps > best) best = session.totalReps
  }
  return best
}

export function uniqueDates(sessions: Session[]) {
  return [...new Set(sessions.filter((session) => session.totalReps > 0).map((session) => session.date))].sort()
}

export function longestStreak(sessions: Session[]) {
  const dates = uniqueDates(sessions)
  if (dates.length === 0) return 0
  let best = 1
  let run = 1
  for (let index = 1; index < dates.length; index += 1) {
    if (daysBetween(dates[index - 1], dates[index]) === 1) {
      run += 1
      if (run > best) best = run
    } else {
      run = 1
    }
  }
  return best
}

export function currentStreak(sessions: Session[], now: Date) {
  const days = new Set(uniqueDates(sessions))
  let cursor = startOfDay(now)
  if (!days.has(localDate(cursor))) {
    cursor = addDays(cursor, -1)
    if (!days.has(localDate(cursor))) return 0
  }
  let streak = 0
  while (days.has(localDate(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function sessionsThisWeek(sessions: Session[], now: Date) {
  const start = localDate(startOfWeek(now))
  const end = localDate(addDays(startOfWeek(now), 7))
  return sessions.filter((session) => session.date >= start && session.date < end)
}

export function weekReps(sessions: Session[], now: Date) {
  return sessionsThisWeek(sessions, now).reduce((total, session) => total + session.totalReps, 0)
}

export function weekDays(sessions: Session[], now: Date) {
  return new Set(sessionsThisWeek(sessions, now).filter((session) => session.totalReps > 0).map((session) => session.date)).size
}

export function todayReps(sessions: Session[], now: Date) {
  const today = localDate(now)
  let total = 0
  for (const session of sessions) {
    if (session.date === today) total += session.totalReps
  }
  return total
}

export function dailySeries(sessions: Session[], now: Date, days: number) {
  const totals = dayTotals(sessions)
  const start = addDays(startOfDay(now), -(days - 1))
  const series: { date: string; reps: number }[] = []
  for (let index = 0; index < days; index += 1) {
    const date = localDate(addDays(start, index))
    series.push({ date, reps: totals.get(date) ?? 0 })
  }
  return series
}

export function weekSeries(sessions: Session[], now: Date) {
  const totals = dayTotals(sessions)
  const start = startOfWeek(now)
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return labels.map((label, index) => {
    const date = localDate(addDays(start, index))
    return { date, label, reps: totals.get(date) ?? 0 }
  })
}

/** One bar per week, oldest first. Label is the week-start month/day. */
export function weeklyTotalsSeries(sessions: Session[], now: Date, weeks: number) {
  const totals = dayTotals(sessions)
  const thisWeek = startOfWeek(now)
  const count = Math.max(1, Math.floor(weeks))
  const series: { date: string; reps: number; label: string }[] = []
  for (let index = count - 1; index >= 0; index -= 1) {
    const start = addDays(thisWeek, -index * 7)
    let reps = 0
    for (let day = 0; day < 7; day += 1) {
      reps += totals.get(localDate(addDays(start, day))) ?? 0
    }
    const date = localDate(start)
    const label =
      index === 0
        ? 'Now'
        : start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    series.push({ date, reps, label })
  }
  return series
}

export function seriesStats(series: { reps: number }[]) {
  const trained = series.filter((point) => point.reps > 0)
  const total = series.reduce((sum, point) => sum + point.reps, 0)
  const best = series.reduce((max, point) => Math.max(max, point.reps), 0)
  const average = trained.length === 0 ? 0 : Math.round(total / trained.length)
  return { total, best, average, trainedDays: trained.length }
}

export function behindReason(done: number, target: number, dow: number): NudgeKind | null {
  if (done >= target) return null
  const remainingIncludingToday = 8 - dow
  if (target - done > remainingIncludingToday) return 'short'
  if (dow >= 3 && done === 0) return 'cold'
  const expectedBeforeToday = Math.round((target * (dow - 1)) / 7)
  if (dow >= 4 && done < expectedBeforeToday) return 'pace'
  if (dow === 7 && done < target) return 'pace'
  return null
}

export function nudgeFor(sessions: Session[], stageId: PlanStageId, now: Date) {
  const stage = stageById(stageId)
  return behindReason(weekDays(sessions, now), stage.daysPerWeek, weekdayMon1(now))
}

export function stageSessions(sessions: Session[], stageId: PlanStageId) {
  return sessions
    .filter((session) => session.stageId === stageId)
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
}

export function stepUpReady(sessions: Session[], stageId: PlanStageId, now: Date) {
  const next = PLAN[PLAN.findIndex((stage) => stage.id === stageId) + 1]
  if (!next) return null
  const recent = stageSessions(sessions, stageId).slice(0, 3)
  if (recent.length < 3 || !recent.every(isClean)) return null
  const newest = Date.parse(recent[0].completedAt)
  if (Number.isNaN(newest) || now.getTime() - newest > 14 * 86_400_000) return null
  return next
}

export function shouldCelebrate(previous: Session[], session: Session) {
  const before = bestDay(previous).reps
  const after = (dayTotals(previous).get(session.date) ?? 0) + session.totalReps
  if (before > 0 && after > before) return true
  if (before === 0 && after >= 30) return true
  if (before < 100 && after >= 100) return true
  if (before < 150 && after >= 150) return true
  if (before < 250 && after >= 250) return true
  return false
}

function weekTarget(group: Session[]) {
  let target = 3
  for (const session of group) {
    if (session.stageId === 'custom') continue
    const stage = PLAN.find((item) => item.id === session.stageId)
    if (stage && stage.daysPerWeek > target) target = stage.daysPerWeek
  }
  return target
}

export function earnedBadges(sessions: Session[]): BadgeId[] {
  const earned = new Set<BadgeId>()
  if (sessions.length === 0) return []
  earned.add('first-session')
  if (sessions.length >= 10) earned.add('sessions-10')
  if (sessions.length >= 30) earned.add('sessions-30')
  if (sessions.some(isClean)) earned.add('clean')

  const life = lifetimeReps(sessions)
  if (life >= 500) earned.add('life-500')
  if (life >= 1000) earned.add('life-1000')
  if (life >= 2500) earned.add('life-2500')
  if (life >= 5000) earned.add('life-5000')

  const totals = dayTotals(sessions)
  let best = 0
  const counts = new Map<string, number>()
  for (const session of sessions) counts.set(session.date, (counts.get(session.date) ?? 0) + 1)
  for (const reps of totals.values()) if (reps > best) best = reps
  if (best >= 50) earned.add('day-50')
  if (best >= 100) earned.add('day-100')
  if (best >= 150) earned.add('day-150')
  if (best >= 250) earned.add('day-250')
  if ([...counts.values()].some((count) => count >= 2)) earned.add('double-day')

  const streak = longestStreak(sessions)
  if (streak >= 3) earned.add('streak-3')
  if (streak >= 7) earned.add('streak-7')
  if (streak >= 14) earned.add('streak-14')

  const dates = uniqueDates(sessions)
  for (let index = 1; index < dates.length; index += 1) {
    if (daysBetween(dates[index - 1], dates[index]) >= 7) {
      earned.add('comeback')
      break
    }
  }

  const byWeek = new Map<string, Session[]>()
  for (const session of sessions) {
    const key = localDate(startOfWeek(parseDate(session.date)))
    const group = byWeek.get(key)
    if (group) group.push(session)
    else byWeek.set(key, [session])
  }
  for (const group of byWeek.values()) {
    const days = new Set(group.filter((session) => session.totalReps > 0).map((session) => session.date))
    if (days.size >= weekTarget(group)) {
      earned.add('week-hit')
      break
    }
  }

  for (const stage of PLAN) {
    const clean = sessions.filter((session) => session.stageId === stage.id && isClean(session))
    if (clean.length >= 3) {
      earned.add('stage-ready')
      break
    }
  }

  return [...earned]
}

export function freshBadges(before: Session[], after: Session[]) {
  const had = new Set(earnedBadges(before))
  return earnedBadges(after).filter((id) => !had.has(id))
}
