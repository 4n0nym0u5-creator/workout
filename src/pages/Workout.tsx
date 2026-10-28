import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActiveSet } from '../components/ActiveSet'
import { FinishScreen, type FinishSummary } from '../components/FinishScreen'
import { FocusFrame, useLeaveGuard } from '../components/Shell'
import { useTitle } from '../components/ui'
import { LogWorkout, type LoggedWorkout } from '../components/LogWorkout'
import { SetRound } from '../components/SetRound'
import { WorkoutSetup } from '../components/WorkoutSetup'
import { nextStage } from '../content/guide'
import { lineForFinish } from '../content/lines'
import { useStore } from '../context/Store'
import { beep, vibrate } from '../lib/audio'
import { completedAtFor, formatClock, localDate } from '../lib/dates'
import { dayTotals, freshBadges, shouldCelebrate, stageSessions, stepUpReady } from '../lib/stats'
import type { Session, SetLog, WorkoutPlan } from '../lib/types'
import { Button } from '../components/ui'

type Phase = 'log' | 'setup' | 'work' | 'rest' | 'done'

export function Workout() {
  const navigate = useNavigate()
  const { sessions, settings, saveSession, updateSettings } = useStore()
  const { setDirty } = useLeaveGuard()
  const [phase, setPhase] = useState<Phase>('setup')
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [setIndex, setSetIndex] = useState(0)
  const [log, setLog] = useState<SetLog[]>([])
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [summary, setSummary] = useState<FinishSummary | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const startedAt = useRef<number | null>(null)
  const logRef = useRef<SetLog[]>([])
  const chimed = useRef(false)
  const autoStarted = useRef(false)
  useTitle(phase === 'setup' || phase === 'log' ? 'Train' : 'In session')

  useEffect(() => {
    setDirty(phase === 'work' || phase === 'rest')
    return () => setDirty(false)
  }, [phase, setDirty])

  useEffect(() => {
    if (phase !== 'rest' || restEndsAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [phase, restEndsAt])

  const restLeft = restEndsAt === null ? 0 : Math.max(0, Math.ceil((restEndsAt - now) / 1000))

  useEffect(() => {
    if (phase !== 'rest') {
      chimed.current = false
      autoStarted.current = false
      return
    }
    if (restLeft === 0 && !chimed.current) {
      chimed.current = true
      if (plan?.sound) beep('rest')
      if (plan?.haptics) vibrate([20, 40, 20])
    }
    if (restLeft === 0 && !autoStarted.current) {
      autoStarted.current = true
      setPhase('work')
    }
  }, [phase, plan?.haptics, plan?.sound, restLeft])

  useEffect(() => {
    if (phase === 'setup' || phase === 'log' || phase === 'done') return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [phase])

  function begin(nextPlan: WorkoutPlan) {
    setPlan(nextPlan)
    setSetIndex(0)
    setLog([])
    logRef.current = []
    startedAt.current = null
    setSummary(null)
    setPhase('work')
  }

  function markStart() {
    if (startedAt.current === null) startedAt.current = Date.now()
  }

  function finishWorkout(entries: SetLog[]) {
    if (!plan) return
    const totalReps = entries.reduce((total, set) => total + set.completed, 0)
    if (totalReps <= 0) {
      setPhase('setup')
      return
    }
    const completedAt = new Date()
    const session: Session = {
      id: crypto.randomUUID(),
      date: localDate(completedAt),
      completedAt: completedAt.toISOString(),
      stageId: plan.stageId,
      stageLabel: plan.stageLabel,
      optionLabel: plan.optionLabel,
      sets: entries,
      totalReps,
      restSeconds: plan.restSeconds,
      tempoMs: plan.countMode === 'tempo' ? plan.tempoMs : null,
      countMode: plan.countMode,
      variation: plan.variation,
      durationSec: Math.max(1, Math.round((completedAt.getTime() - (startedAt.current ?? completedAt.getTime())) / 1000)),
      notes: '',
      difficulty: null,
    }
    const dayTotal = (dayTotals(sessions).get(session.date) ?? 0) + session.totalReps
    const previousBest = Math.max(0, ...[...dayTotals(sessions).values()])
    const withSession = [...sessions, session]
    const stageId = settings.stageId
    const ready = stepUpReady(withSession, stageId, completedAt)
    const snoozed = settings.stepUpSnooze[stageId]
    const count = stageSessions(withSession, stageId).length
    saveSession(session)
    setSummary({
      session,
      fresh: freshBadges(sessions, withSession),
      celebrate: shouldCelebrate(sessions, session),
      line: lineForFinish(totalReps + entries.length * 13),
      dayTotal,
      previousBest: Number.isFinite(previousBest) ? previousBest : 0,
      stepUp: ready && snoozed !== count ? ready : null,
    })
    setPhase('done')
  }

  function commitSet(completed: number) {
    if (!plan) return
    const next = [...logRef.current, { target: plan.reps, completed }]
    logRef.current = next
    setLog(next)
    if (setIndex + 1 >= plan.sets) {
      finishWorkout(next)
      return
    }
    setSetIndex((index) => index + 1)
    setRestEndsAt(Date.now() + plan.restSeconds * 1000)
    setNow(Date.now())
    setPhase('rest')
  }

  function finishLogged(entry: LoggedWorkout) {
    const totalReps = entry.sets.reduce((total, set) => total + set.completed, 0)
    if (totalReps <= 0) return
    const completedAt = completedAtFor(entry.date)
    const session: Session = {
      id: crypto.randomUUID(),
      date: entry.date,
      completedAt: completedAt.toISOString(),
      stageId: entry.stageId,
      stageLabel: entry.stageLabel,
      optionLabel: entry.optionLabel,
      sets: entry.sets,
      totalReps,
      restSeconds: entry.restSeconds,
      tempoMs: null,
      countMode: entry.countMode,
      variation: entry.variation,
      durationSec: 0,
      notes: entry.notes,
      difficulty: entry.difficulty,
    }
    const dayTotal = (dayTotals(sessions).get(session.date) ?? 0) + session.totalReps
    const previousBest = Math.max(0, ...[...dayTotals(sessions).values()])
    const withSession = [...sessions, session]
    const stageId = entry.stageId === 'custom' ? settings.stageId : entry.stageId
    const ready = stepUpReady(withSession, stageId, completedAt)
    const snoozed = settings.stepUpSnooze[stageId]
    const count = stageSessions(withSession, stageId).length
    saveSession(session)
    setSummary({
      session,
      fresh: freshBadges(sessions, withSession),
      celebrate: shouldCelebrate(sessions, session),
      line: lineForFinish(totalReps + entry.sets.length * 13),
      dayTotal,
      previousBest: Number.isFinite(previousBest) ? previousBest : 0,
      stepUp: ready && snoozed !== count ? ready : null,
    })
    setPhase('done')
  }

  function askQuit() {
    if (logRef.current.length === 0 && phase === 'work') {
      setPhase('setup')
      return
    }
    setConfirmQuit(true)
  }

  if (phase === 'log') {
    return <LogWorkout onSave={finishLogged} onCountLive={() => setPhase('setup')} />
  }

  if (phase === 'setup' || ((phase === 'work' || phase === 'rest') && !plan)) {
    return <WorkoutSetup onStart={begin} onLogPast={() => setPhase('log')} />
  }

  if (!plan) {
    return <WorkoutSetup onStart={begin} onLogPast={() => setPhase('log')} />
  }

  const useSetRound = plan.countMode === 'sets' || plan.countMode === 'log' || plan.countMode === 'total'

  return (
    <FocusFrame>
      {phase === 'work' && useSetRound ? (
        <SetRound
          key={setIndex}
          setNumber={setIndex + 1}
          setCount={plan.sets}
          target={plan.reps}
          variation={plan.variation}
          onBegin={markStart}
          onComplete={commitSet}
          onQuit={askQuit}
        />
      ) : null}

      {phase === 'work' && !useSetRound ? (
        <ActiveSet
          key={setIndex}
          setNumber={setIndex + 1}
          setCount={plan.sets}
          target={plan.reps}
          tempoMs={plan.tempoMs}
          countMode={plan.countMode === 'tempo' ? 'tempo' : 'tap'}
          sound={plan.sound}
          haptics={plan.haptics}
          variation={plan.variation}
          onBegin={markStart}
          onComplete={commitSet}
          onQuit={askQuit}
        />
      ) : null}

      {phase === 'rest' ? (
        <div className="flex min-h-[70dvh] flex-col">
          <button type="button" onClick={askQuit} className="self-start text-sm font-semibold uppercase tracking-[0.16em] text-mute">
            Close
          </button>
          <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-blood">Rest</p>
          <p className="mt-2 font-display text-[7rem] leading-none tabular-nums" data-testid="rest-timer">
            {formatClock(restLeft)}
          </p>
          <p className="mt-3 text-lg text-mute">
            Next: set {setIndex + 1} of {plan.sets} · {plan.reps} reps
          </p>
          <p className="mt-6 max-w-sm text-lg">Breathe. Shake the hands out. The next set starts when the clock hits zero.</p>
          <div className="mt-auto grid gap-2 pt-8">
            {restLeft === 0 ? (
              <Button onClick={() => setPhase('work')}>Start set</Button>
            ) : (
              <Button onClick={() => setPhase('work')}>Skip rest</Button>
            )}
            <Button
              tone="ghost"
              onClick={() => {
                setRestEndsAt((current) => (current ?? Date.now()) + 15_000)
                autoStarted.current = false
              }}
            >
              +15 seconds
            </Button>
          </div>
        </div>
      ) : null}

      {phase === 'done' && summary ? (
        <FinishScreen
          summary={summary}
          onDone={() => navigate('/')}
          onAgain={() => {
            setPlan(null)
            setPhase('setup')
          }}
          onMoveUp={() => {
            const upcoming = nextStage(settings.stageId)
            if (!upcoming) return
            updateSettings({
              stageId: upcoming.id,
              optionId: upcoming.defaultOptionId,
              stepUpSnooze: { ...settings.stepUpSnooze, [settings.stageId]: stageSessions(sessions, settings.stageId).length },
            })
            setSummary((current) => (current ? { ...current, stepUp: null } : current))
          }}
          onStay={() => {
            updateSettings({
              stepUpSnooze: {
                ...settings.stepUpSnooze,
                [settings.stageId]: stageSessions(sessions, settings.stageId).length,
              },
            })
            setSummary((current) => (current ? { ...current, stepUp: null } : current))
          }}
        />
      ) : null}

      {confirmQuit ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 p-4 md:place-items-center">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-5" role="alertdialog" aria-labelledby="quit-title">
            <h2 id="quit-title" className="font-display text-4xl leading-none">
              Scrap this session?
            </h2>
            <p className="mt-3 text-mute">
              {log.length} set{log.length === 1 ? '' : 's'} finished. Nothing is saved unless you complete the workout.
            </p>
            <div className="mt-5 grid gap-2">
              <Button onClick={() => setConfirmQuit(false)}>Keep going</Button>
              <Button
                tone="ghost"
                onClick={() => {
                  setConfirmQuit(false)
                  setPhase('setup')
                }}
              >
                Scrap it
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </FocusFrame>
  )
}
