import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BADGES } from '../content/badges'
import { GOAL_REPS, PLAN, stageById } from '../content/guide'
import { GoalRing } from '../components/GoalRing'
import { NudgeCard, StepUpCard } from '../components/Notices'
import { RepChart } from '../components/RepChart'
import { SessionEditor } from '../components/SessionEditor'
import { Button, Kicker, Page, Pill } from '../components/ui'
import { useStore } from '../context/Store'
import { addDays, daysBetween, formatClock, formatDay, localDate, parseDate, startOfWeek } from '../lib/dates'
import { parseBackup, serializeBackup, type Backup } from '../lib/storage'
import {
  bestDay,
  bestSession,
  bestSet,
  currentStreak,
  dailySeries,
  earnedBadges,
  lifetimeReps,
  longestStreak,
  nudgeFor,
  stageSessions,
  stepUpReady,
  todayReps,
  uniqueDates,
  weekDays,
  weekReps,
  weekSeries,
} from '../lib/stats'
import type { PlanStageId, Session } from '../lib/types'

type Range = 'week' | '8w' | 'all'

export function Progress() {
  const navigate = useNavigate()
  const { sessions, settings, updateSettings, saveSession, deleteSession, replaceAll, mergeSessions, storageWarning } = useStore()
  const [range, setRange] = useState<Range>('8w')
  const [editing, setEditing] = useState<Session | null>(null)
  const [backup, setBackup] = useState<Backup | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)
  const now = new Date()
  const stage = stageById(settings.stageId)
  const badges = earnedBadges(sessions)
  const earned = new Set(badges)
  const best = bestDay(sessions)
  const nudge = nudgeFor(sessions, settings.stageId, now)
  const ready = stepUpReady(sessions, settings.stageId, now)
  const stageCount = stageSessions(sessions, settings.stageId).length
  const showNudge = nudge !== null && settings.nudgeSnoozeDate !== localDate(now)
  const showStep = ready !== null && settings.stepUpSnooze[settings.stageId] !== stageCount
  const dates = uniqueDates(sessions)
  const allDays = dates.length === 0 ? 14 : Math.min(120, Math.max(14, daysBetween(dates[0], localDate(now)) + 1))
  const series = range === 'week' ? weekSeries(sessions, now) : dailySeries(sessions, now, range === '8w' ? 56 : allDays)
  const todayKey = localDate(now)
  const groups = useMemo(() => groupSessions(sessions, todayKey), [sessions, todayKey])

  function exportLog() {
    const blob = new Blob([serializeBackup({ version: 1, sessions, settings })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tyson-pushup-${localDate(now)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      setBackup(parseBackup(await file.text()))
      setImportError(null)
      setConfirmReplace(false)
    } catch (error) {
      setBackup(null)
      setImportError(error instanceof Error ? error.message : 'Could not read that file.')
    }
  }

  return (
    <Page title="Progress">
      <Kicker>The log</Kicker>
      <h1 className="mt-2 font-display text-6xl leading-none">Camp record</h1>
      <p className="mt-3 text-mute">
        {stage.weeks} · {stage.name} · {stage.daysLabel}
      </p>

      <div className="mt-6 flex flex-col items-center gap-5 rounded-[1.7rem] border border-line bg-panel p-5 sm:flex-row sm:items-center">
        <GoalRing value={best.reps} goal={GOAL_REPS} caption="best day" />
        <div className="grid w-full grid-cols-2 gap-3">
          <Mini label="Today" value={String(todayReps(sessions, now))} />
          <Mini label="This week" value={String(weekReps(sessions, now))} />
          <Mini label="Streak" value={`${currentStreak(sessions, now)}d`} />
          <Mini label="Lifetime" value={String(lifetimeReps(sessions))} />
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">
        Goal is {GOAL_REPS} reps in a day. Best session {bestSession(sessions)} · best set {bestSet(sessions)} · longest streak {longestStreak(sessions)}d · {weekDays(sessions, now)}/{stage.daysPerWeek} days this week.
      </p>

      <label className="mt-5 block text-sm text-mute">
        Plan stage
        <select
          value={settings.stageId}
          onChange={(event) => {
            const next = stageById(event.target.value as PlanStageId)
            updateSettings({ stageId: next.id, optionId: next.defaultOptionId })
          }}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-cream"
        >
          {PLAN.map((item) => (
            <option key={item.id} value={item.id}>
              {item.weeks} · {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 grid gap-3">
        {showNudge && nudge ? (
          <NudgeCard
            kind={nudge}
            onTrain={() => navigate('/workout')}
            onDismiss={() => updateSettings({ nudgeSnoozeDate: localDate(now) })}
          />
        ) : null}
        {showStep && ready ? (
          <StepUpCard
            message={`You have been hitting every rep on ${stage.name}. ${ready.name} is ${ready.setsLabel}.`}
            action={`Move to ${ready.name}`}
            onMove={() =>
              updateSettings({
                stageId: ready.id,
                optionId: ready.defaultOptionId,
                stepUpSnooze: { ...settings.stepUpSnooze, [settings.stageId]: stageCount },
              })
            }
            onStay={() => updateSettings({ stepUpSnooze: { ...settings.stepUpSnooze, [settings.stageId]: stageCount } })}
          />
        ) : null}
        {storageWarning ? <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">{storageWarning}</p> : null}
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-4xl leading-none">Reps over time</h2>
          <div className="flex gap-1">
            <Pill pressed={range === 'week'} onClick={() => setRange('week')}>
              Week
            </Pill>
            <Pill pressed={range === '8w'} onClick={() => setRange('8w')}>
              8 weeks
            </Pill>
            <Pill pressed={range === 'all'} onClick={() => setRange('all')}>
              All
            </Pill>
          </div>
        </div>
        <div className="mt-3 rounded-3xl border border-line bg-panel p-4">
          {sessions.length === 0 ? <p className="mb-3 text-sm text-mute">Finish a workout and the days start to stack.</p> : null}
          <RepChart series={series} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-4xl leading-none">Marks</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BADGES.map((badge) => {
            const on = earned.has(badge.id)
            return (
              <li key={badge.id} className={`rounded-2xl border px-3 py-3 ${on ? 'border-gold/50 bg-gold/10' : 'border-line opacity-50'}`}>
                <p className="font-semibold">{badge.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-mute">{badge.detail}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-4xl leading-none">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 text-mute">No sessions yet. The floor is undefeated until you show up.</p>
        ) : (
          <div className="mt-3 grid gap-5">
            {groups.map((group) => (
              <div key={group.key}>
                <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-mute">{group.label}</h3>
                <ul className="mt-2 grid gap-2">
                  {group.sessions.map((session) => (
                    <li key={session.id} className="rounded-2xl border border-line bg-panel px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-4xl leading-none">{session.totalReps}</p>
                          <p className="mt-1 text-sm text-mute">
                            {formatDay(session.date)} · {session.stageLabel} · {session.optionLabel}
                          </p>
                          <p className="text-xs text-mute">
                            {session.sets.map((set) => set.completed).join(' · ')}
                            {session.durationSec > 0 ? ` · ${formatClock(session.durationSec)}` : ''}
                          </p>
                          {session.notes ? <p className="mt-1 text-sm">{session.notes}</p> : null}
                        </div>
                        <button type="button" className="text-sm font-semibold uppercase tracking-[0.14em] text-ember" onClick={() => setEditing(session)}>
                          Edit
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-line p-4">
        <h2 className="font-display text-4xl leading-none">Backup</h2>
        <p className="mt-2 text-sm text-mute">The log lives in this browser. Export JSON before you clear it, and import it on another device.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="h-12 w-auto px-5 text-2xl" data-testid="export-log" onClick={exportLog}>
            Export
          </Button>
          <label className="inline-flex h-12 cursor-pointer items-center rounded-2xl border border-line bg-white/5 px-5 font-display text-2xl tracking-wide">
            Import
            <input
              data-testid="import-log"
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(event) => {
                void onFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
        </div>
        {importError ? <p className="mt-3 text-sm text-ember">{importError}</p> : null}
        {backup ? (
          <div className="mt-4 rounded-2xl bg-white/5 p-3">
            <p>
              {backup.sessions.length} session{backup.sessions.length === 1 ? '' : 's'} ready
              {backup.skipped > 0 ? ` · ${backup.skipped} skipped` : ''}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className="h-12 w-auto px-4 text-2xl"
                onClick={() => {
                  mergeSessions(backup.sessions, backup.settings)
                  setBackup(null)
                }}
              >
                Merge
              </Button>
              {confirmReplace ? (
                <Button
                  tone="ghost"
                  className="h-12 w-auto px-4 text-2xl"
                  onClick={() => {
                    replaceAll(backup.sessions, backup.settings)
                    setBackup(null)
                    setConfirmReplace(false)
                  }}
                >
                  Confirm replace
                </Button>
              ) : (
                <Button tone="ghost" className="h-12 w-auto px-4 text-2xl" onClick={() => setConfirmReplace(true)}>
                  Replace all
                </Button>
              )}
            </div>
          </div>
        ) : null}
        <div className="mt-5">
          {confirmErase ? (
            <Button
              tone="ghost"
              className="h-12 text-2xl"
              onClick={() => {
                replaceAll([])
                setConfirmErase(false)
              }}
            >
              Confirm erase
            </Button>
          ) : (
            <button type="button" className="text-sm font-semibold uppercase tracking-[0.14em] text-mute" onClick={() => setConfirmErase(true)}>
              Erase this device&apos;s log
            </button>
          )}
        </div>
      </section>

      <SessionEditor
        session={editing}
        onClose={() => setEditing(null)}
        onSave={(session) => {
          saveSession(session)
          setEditing(null)
        }}
        onDelete={(id) => {
          deleteSession(id)
          setEditing(null)
        }}
      />
    </Page>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="font-display text-4xl leading-none">{value}</p>
    </div>
  )
}

function groupSessions(sessions: Session[], today: string) {
  const sorted = [...sessions].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
  const todayDate = parseDate(today)
  const thisWeek = localDate(startOfWeek(todayDate))
  const lastWeek = localDate(startOfWeek(addDays(todayDate, -7)))
  const groups: { key: string; label: string; sessions: Session[] }[] = []
  for (const session of sorted) {
    const key = localDate(startOfWeek(parseDate(session.date)))
    const label = key === thisWeek ? 'This week' : key === lastWeek ? 'Last week' : `Week of ${formatDay(key)}`
    const existing = groups.find((group) => group.key === key)
    if (existing) existing.sessions.push(session)
    else groups.push({ key, label, sessions: [session] })
  }
  return groups
}
