import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NudgeCard, StepUpCard } from '../components/Notices'
import { PhaseReel } from '../components/PhaseReel'
import { RepChart } from '../components/RepChart'
import { Button, Kicker, Page } from '../components/ui'
import { GOAL_REPS, optionFor, stageById, variationById } from '../content/guide'
import { useStore } from '../context/Store'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { localDate } from '../lib/dates'
import { bestDay, currentStreak, nudgeFor, stageSessions, stepUpReady, weekReps, weekSeries } from '../lib/stats'

export function Home() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const { sessions, settings, updateSettings } = useStore()
  const now = new Date()
  const stage = stageById(settings.stageId)
  const option = optionFor(stage, settings.optionId)
  const variation = variationById(settings.variation)
  const nudge = nudgeFor(sessions, settings.stageId, now)
  const ready = stepUpReady(sessions, settings.stageId, now)
  const stageCount = stageSessions(sessions, settings.stageId).length
  const showNudge = nudge !== null && settings.nudgeSnoozeDate !== localDate(now)
  const showStep = ready !== null && settings.stepUpSnooze[settings.stageId] !== stageCount
  const streak = currentStreak(sessions, now)
  const week = weekReps(sessions, now)
  const best = bestDay(sessions).reps

  return (
    <Page title="Home">
      <div className="border-l-4 border-blood pl-4">
        <Kicker>No equipment · Full body</Kicker>
        <h1 className="mt-2 font-display text-[clamp(4.6rem,18vw,7rem)] leading-[0.82]">
          TYSON
          <span className="block text-blood">PUSH-UP</span>
        </h1>
        <p className="mt-3 max-w-sm text-mute">
          One explosive squat-to-push-up. Legs, chest, shoulders, and core on every rep. Build toward {GOAL_REPS} a day.
        </p>
      </div>

      <div className="mt-6">
        <PhaseReel showChrome reducedMotion={reduced} />
      </div>

      <section className="relative mt-6 overflow-hidden rounded-[1.7rem] border border-white/10 bg-panel p-5">
        <p className="pointer-events-none absolute -right-2 -top-6 font-display text-[7rem] leading-none text-white/[0.04]">TODAY</p>
        <Kicker>Today&apos;s session</Kicker>
        <h2 className="mt-2 font-display text-5xl leading-none">
          {stage.weeks}
          <span className="mt-1 block text-3xl text-cream/80">{stage.name}</span>
        </h2>
        <p className="mt-3 text-2xl font-semibold">{option.label}</p>
        <p className="text-mute">
          {option.sets * option.reps} reps · {stage.daysLabel}
          {variation.id === 'standard' ? '' : ` · ${variation.name}`}
        </p>
        <Button className="mt-5 w-full" onClick={() => navigate('/workout')}>
          Start workout
        </Button>
      </section>

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
            message={`Three clean ${stage.name} sessions. ${ready.name} is next: ${ready.setsLabel}.`}
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
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Streak" value={String(streak)} unit="d" />
        <Stat label="This week" value={String(week)} unit="" />
        <Stat label="Best day" value={String(best)} unit="" />
      </div>

      <section className="mt-4 rounded-[1.7rem] border border-line bg-panel p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <Kicker>This week</Kicker>
            <h2 className="mt-1 font-display text-4xl leading-none">Keep the bars climbing</h2>
          </div>
          <button type="button" className="text-sm font-semibold uppercase tracking-[0.14em] text-ember" onClick={() => navigate('/progress')}>
            Full log
          </button>
        </div>
        <RepChart
          series={weekSeries(sessions, now)}
          goal={GOAL_REPS}
          emptyHint="Log today's session — or yesterday if you forgot — and this week fills in."
        />
      </section>

      <button
        type="button"
        onClick={() => navigate('/learn')}
        className="mt-4 w-full rounded-2xl border border-line px-4 py-4 text-left"
      >
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-blood">Learn the rep</span>
        <span className="mt-1 block text-lg">Form, mistakes, variations, and the 9-week build.</span>
      </button>
      <InstallHint />
    </Page>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-1 font-display text-4xl leading-none">
        {value}
        {unit ? <span className="ml-0.5 text-lg text-mute">{unit}</span> : null}
      </p>
    </div>
  )
}

type InstallPrompt = Event & { prompt: () => Promise<void> }

function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!prompt || hidden) return null
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
      <p className="text-sm">Install for a full-screen gym session, offline.</p>
      <button
        type="button"
        className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold"
        onClick={() => {
          void prompt.prompt()
          setHidden(true)
        }}
      >
        Install
      </button>
    </div>
  )
}
