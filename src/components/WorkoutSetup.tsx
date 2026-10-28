import { useState } from 'react'
import { optionFor, PLAN, REST_OPTIONS, stageById, TEMPO_OPTIONS, variationById, VARIATIONS } from '../content/guide'
import { useStore } from '../context/Store'
import { formatTempo } from '../lib/dates'
import type { CountMode, WorkoutPlan } from '../lib/types'
import { Button, Kicker, Page, Pill } from './ui'

type LiveMode = Extract<CountMode, 'sets' | 'tap' | 'tempo'>

export function WorkoutSetup({
  onStart,
  onLogPast,
}: {
  onStart: (plan: WorkoutPlan) => void
  onLogPast?: () => void
}) {
  const { settings, updateSettings } = useStore()
  const [custom, setCustom] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const stage = stageById(settings.stageId)
  const option = optionFor(stage, settings.optionId)
  const variation = variationById(settings.variation)
  const [liveMode, setLiveMode] = useState<LiveMode>(
    settings.countMode === 'tempo' || settings.countMode === 'tap' ? settings.countMode : 'sets',
  )
  const sets = custom ? settings.customSets : option.sets
  const reps = custom ? settings.customReps : option.reps
  const tempo = settings.variation === 'slow' ? Math.max(settings.tempoMs, 3000) : settings.tempoMs
  const total = sets * reps

  function applyOption(stageId: typeof settings.stageId, optionId: string) {
    const nextStage = stageById(stageId)
    const nextOption = optionFor(nextStage, optionId)
    updateSettings({
      stageId,
      optionId,
      customSets: nextOption.sets,
      customReps: nextOption.reps,
    })
  }

  function start() {
    onStart({
      stageId: custom ? 'custom' : stage.id,
      stageLabel: custom ? 'Custom' : stage.name,
      optionLabel: custom ? `${sets} × ${reps}` : option.label,
      sets,
      reps,
      restSeconds: settings.restSeconds,
      tempoMs: tempo,
      countMode: liveMode,
      variation: settings.variation,
      sound: settings.sound,
      haptics: settings.haptics,
    })
  }

  return (
    <Page title="Train">
      <Kicker>Live session</Kicker>
      <h1 className="mt-2 font-display text-6xl leading-none">Start a workout</h1>
      <p className="mt-3 max-w-md text-mute">
        Pick how many sets, then after each set log the reps and rest until the next one.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StepperField
          label="Sets"
          value={sets}
          min={1}
          max={30}
          onChange={(value) => {
            setCustom(true)
            updateSettings({ customSets: value })
          }}
        />
        <StepperField
          label="Reps / set"
          value={reps}
          min={1}
          max={100}
          onChange={(value) => {
            setCustom(true)
            updateSettings({ customReps: value })
          }}
        />
      </div>

      <p className="mt-4 font-display text-5xl leading-none">
        {total} <span className="text-2xl text-mute">reps planned</span>
      </p>

      <div className="mt-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mute">Rest between sets</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REST_OPTIONS.map((seconds) => (
            <Pill key={seconds} pressed={settings.restSeconds === seconds} onClick={() => updateSettings({ restSeconds: seconds })}>
              {seconds}s
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mute">Plan</p>
        <div className="mt-2 grid gap-2">
          {PLAN.map((item) => {
            const selected = !custom && item.id === settings.stageId
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setCustom(false)
                  applyOption(item.id, item.defaultOptionId)
                }}
                className={`rounded-2xl border px-4 py-3 text-left ${selected ? 'border-blood bg-blood/15' : 'border-line bg-panel'}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-3xl leading-none">{item.name}</span>
                  <span className="text-sm text-mute">{item.totalLabel}</span>
                </span>
                <span className="mt-1 block text-sm text-mute">
                  {item.weeks} · {item.setsLabel} · {item.daysLabel}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => setCustom(true)}
            className={`rounded-2xl border px-4 py-3 text-left ${custom ? 'border-blood bg-blood/15' : 'border-line bg-panel'}`}
          >
            <span className="font-display text-3xl leading-none">Custom</span>
            <span className="mt-1 block text-sm text-mute">Use the sets and reps above as your own plan.</span>
          </button>
        </div>
      </div>

      {!custom && stage.options.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {stage.options.map((item) => (
            <Pill
              key={item.id}
              pressed={settings.optionId === item.id}
              onClick={() => {
                setCustom(false)
                applyOption(stage.id, item.id)
              }}
            >
              {item.label}
            </Pill>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mute">Version · {variation.name}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {VARIATIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={settings.variation === item.id}
              onClick={() => updateSettings({ variation: item.id })}
              className={`min-w-36 shrink-0 rounded-2xl border px-3 py-2 text-left ${settings.variation === item.id ? 'border-blood bg-blood/15' : 'border-line'}`}
            >
              <span className="block text-sm font-semibold">{item.name}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-mute">{item.group}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Pill pressed={settings.sound} onClick={() => updateSettings({ sound: !settings.sound })}>
          Sound {settings.sound ? 'on' : 'off'}
        </Pill>
        <Pill pressed={settings.haptics} onClick={() => updateSettings({ haptics: !settings.haptics })}>
          Haptics {settings.haptics ? 'on' : 'off'}
        </Pill>
        <Pill pressed={showAdvanced} onClick={() => setShowAdvanced((value) => !value)}>
          Count mode
        </Pill>
      </div>

      {showAdvanced ? (
        <div className="mt-4 rounded-3xl border border-line bg-panel p-4">
          <p className="text-sm text-mute">Default is set logging. Tap or tempo still count every rep if you want that.</p>
          <div className="mt-3 grid gap-2">
            <ModeCard
              pressed={liveMode === 'sets'}
              title="Log each set"
              detail="Do the set, then enter reps with + and −."
              onClick={() => setLiveMode('sets')}
            />
            <ModeCard
              pressed={liveMode === 'tap'}
              title="Tap each rep"
              detail="You count every rep as you go."
              onClick={() => setLiveMode('tap')}
            />
            <ModeCard
              pressed={liveMode === 'tempo'}
              title="Tempo pacer"
              detail={`Beeps every ${formatTempo(tempo)}.`}
              onClick={() => setLiveMode('tempo')}
            />
          </div>
          {liveMode === 'tempo' ? (
            <div className="mt-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mute">Rep tempo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TEMPO_OPTIONS.map((ms) => (
                  <Pill key={ms} pressed={settings.tempoMs === ms} onClick={() => updateSettings({ tempoMs: ms })}>
                    {formatTempo(ms)}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Button className="mt-6 w-full" data-testid="start-session" onClick={start}>
        Start workout
      </Button>
      {onLogPast ? (
        <button type="button" className="mt-3 w-full text-sm font-semibold uppercase tracking-[0.16em] text-mute" onClick={onLogPast}>
          Log a past workout instead
        </button>
      ) : null}
    </Page>
  )
}

function StepperField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-3xl border border-line bg-panel px-3 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-mute">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <p className="min-w-0 flex-1 text-center font-display text-5xl leading-none tabular-nums">{value}</p>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl"
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  )
}

function ModeCard({
  pressed,
  title,
  detail,
  onClick,
}: {
  pressed: boolean
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left ${pressed ? 'border-blood bg-blood/15' : 'border-line bg-ink'}`}
    >
      <span className="font-display text-3xl leading-none">{title}</span>
      <span className="mt-1 block text-sm text-mute">{detail}</span>
    </button>
  )
}
