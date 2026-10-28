import { useState } from 'react'
import { optionFor, PLAN, stageById, variationById, VARIATIONS } from '../content/guide'
import { useStore } from '../context/Store'
import { addDays, clampIsoDate, formatRelativeDay, localDate } from '../lib/dates'
import type { Difficulty, PlanStageId, SetLog, VariationId } from '../lib/types'
import { Button, Kicker, Page, Pill } from './ui'

export type LoggedWorkout = {
  date: string
  stageId: PlanStageId | 'custom'
  stageLabel: string
  optionLabel: string
  sets: SetLog[]
  countMode: 'log' | 'total'
  variation: VariationId
  restSeconds: number
  notes: string
  difficulty: Difficulty | null
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'solid', label: 'Solid' },
  { id: 'hard', label: 'Hard' },
]

export function LogWorkout({ onSave, onCountLive }: { onSave: (entry: LoggedWorkout) => void; onCountLive: () => void }) {
  const { settings, updateSettings } = useStore()
  const today = localDate(new Date())
  const yesterday = localDate(addDays(new Date(), -1))
  const earliest = localDate(addDays(new Date(), -730))
  const [date, setDate] = useState(today)
  const [pickDate, setPickDate] = useState(false)
  const [custom, setCustom] = useState(false)
  const [totalOnly, setTotalOnly] = useState(false)
  const [notes, setNotes] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const stage = stageById(settings.stageId)
  const option = optionFor(stage, settings.optionId)
  const variation = variationById(settings.variation)
  const setCount = custom ? settings.customSets : option.sets
  const repTarget = custom ? settings.customReps : option.reps
  const planKey = custom ? `custom-${setCount}-${repTarget}` : `${stage.id}-${option.id}-${setCount}-${repTarget}`
  const [draftKey, setDraftKey] = useState(planKey)
  const [counts, setCounts] = useState<number[]>(() => Array.from({ length: setCount }, () => repTarget))
  const [total, setTotal] = useState(setCount * repTarget)

  if (planKey !== draftKey) {
    setDraftKey(planKey)
    setCounts(Array.from({ length: setCount }, () => repTarget))
    setTotal(setCount * repTarget)
  }

  const plannedTotal = setCount * repTarget
  const asPlanned = !totalOnly && counts.length === setCount && counts.every((count) => count === repTarget)
  const loggedTotal = totalOnly ? total : counts.reduce((sum, count) => sum + count, 0)
  const label = custom ? `${setCount} × ${repTarget}` : option.label
  const dayLabel = formatRelativeDay(date)
  const saveLabel =
    loggedTotal <= 0
      ? 'Save workout'
      : totalOnly
        ? date === today
          ? 'Log today'
          : `Log ${dayLabel.toLowerCase()}`
        : asPlanned
          ? date === today
            ? 'Done as planned'
            : `Log ${dayLabel.toLowerCase()} as planned`
          : date === today
            ? 'Save workout'
            : `Save for ${dayLabel.toLowerCase()}`

  function bumpSet(index: number, delta: number) {
    setCounts((current) => current.map((count, setIndex) => (setIndex === index ? clamp(count + delta, 0, 999) : count)))
  }

  function chooseDate(next: string, openPicker = false) {
    setDate(clampIsoDate(next, earliest, today))
    setPickDate(openPicker)
  }

  function save() {
    if (loggedTotal <= 0) return
    const sets: SetLog[] = totalOnly
      ? [{ target: plannedTotal, completed: total }]
      : counts.map((completed) => ({ target: repTarget, completed }))
    onSave({
      date: clampIsoDate(date, earliest, today),
      stageId: custom ? 'custom' : stage.id,
      stageLabel: custom ? 'Custom' : stage.name,
      optionLabel: totalOnly ? `Total · ${label}` : label,
      sets,
      countMode: totalOnly ? 'total' : 'log',
      variation: settings.variation,
      restSeconds: settings.restSeconds,
      notes: notes.trim(),
      difficulty,
    })
  }

  return (
    <Page title="Log workout">
      <Kicker>{dayLabel}</Kicker>
      <h1 className="mt-2 font-display text-6xl leading-none">Log workout</h1>
      <p className="mt-3 max-w-md text-mute">
        {stage.weeks} · {custom ? 'Custom' : stage.name} · {label}. Missed a day? Pick yesterday or an older date, then save.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Pill pressed={date === today && !pickDate} onClick={() => chooseDate(today)}>
          Today
        </Pill>
        <Pill pressed={date === yesterday && !pickDate} onClick={() => chooseDate(yesterday)}>
          Yesterday
        </Pill>
        <Pill pressed={pickDate || (date !== today && date !== yesterday)} onClick={() => chooseDate(date === today ? yesterday : date, true)}>
          Older
        </Pill>
      </div>
      {pickDate || (date !== today && date !== yesterday) ? (
        <label className="mt-3 block text-sm text-mute">
          Workout date
          <input
            type="date"
            data-testid="log-date"
            value={date}
            min={earliest}
            max={today}
            onChange={(event) => chooseDate(event.target.value, true)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-cream"
          />
        </label>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Pill pressed={!totalOnly} onClick={() => setTotalOnly(false)}>
          By set
        </Pill>
        <Pill pressed={totalOnly} onClick={() => setTotalOnly(true)}>
          Total for day
        </Pill>
        <Pill pressed={showPlan} onClick={() => setShowPlan((value) => !value)}>
          Change plan
        </Pill>
      </div>

      {showPlan ? (
        <div className="mt-3 grid gap-2">
          {PLAN.map((item) => {
            const selected = !custom && item.id === settings.stageId
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setCustom(false)
                  updateSettings({ stageId: item.id, optionId: item.defaultOptionId })
                }}
                className={`rounded-2xl border px-4 py-3 text-left ${selected ? 'border-blood bg-blood/15' : 'border-line bg-panel'}`}
              >
                <span className="font-display text-3xl leading-none">{item.name}</span>
                <span className="mt-1 block text-sm text-mute">
                  {item.weeks} · {item.setsLabel}
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
            <span className="mt-1 block text-sm text-mute">Set your own sets and reps.</span>
          </button>
          {!custom && stage.options.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {stage.options.map((item) => (
                <Pill key={item.id} pressed={settings.optionId === item.id} onClick={() => updateSettings({ optionId: item.id })}>
                  {item.label}
                </Pill>
              ))}
            </div>
          ) : null}
          {custom ? (
            <div className="grid grid-cols-2 gap-2">
              <CountField label="Sets" value={settings.customSets} min={1} max={20} onChange={(customSets) => updateSettings({ customSets })} />
              <CountField label="Reps" value={settings.customReps} min={1} max={100} onChange={(customReps) => updateSettings({ customReps })} />
            </div>
          ) : null}
        </div>
      ) : null}

      {totalOnly ? (
        <div className="mt-5 rounded-3xl border border-line bg-panel p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-mute">Total reps for {dayLabel.toLowerCase()}</p>
          <p className="mt-1 text-sm text-mute">Plan is {plannedTotal}. Change it if that day was different.</p>
          <Stepper
            label="Total reps"
            value={total}
            onChange={setTotal}
            onBump={(delta) => setTotal((current) => clamp(current + delta, 0, 999))}
          />
        </div>
      ) : (
        <ol className="mt-5 grid gap-3">
          {counts.map((count, index) => (
            <li key={`${planKey}-${index}`} className="rounded-3xl border border-line bg-panel p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-3xl leading-none">Set {index + 1}</p>
                <p className="text-sm text-mute">Target {repTarget}</p>
              </div>
              <Stepper
                label={`Set ${index + 1} reps`}
                value={count}
                onChange={(next) => setCounts((current) => current.map((item, setIndex) => (setIndex === index ? next : item)))}
                onBump={(delta) => bumpSet(index, delta)}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold uppercase tracking-[0.14em] text-ember"
                  onClick={() => bumpSet(index, repTarget - count)}
                >
                  As planned
                </button>
                <button
                  type="button"
                  className="text-sm text-mute disabled:opacity-30"
                  disabled={counts.length === 1}
                  onClick={() => setCounts((current) => current.filter((_, setIndex) => setIndex !== index))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {!totalOnly ? (
        <button
          type="button"
          className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-ember"
          onClick={() => setCounts((current) => [...current, repTarget])}
        >
          Add a set
        </button>
      ) : null}

      <fieldset className="mt-6">
        <legend className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-mute">Difficulty, optional</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIFFICULTIES.map((item) => (
            <Pill
              key={item.id}
              pressed={difficulty === item.id}
              onClick={() => setDifficulty((current) => (current === item.id ? null : item.id))}
            >
              {item.label}
            </Pill>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm text-mute">
        Note, optional
        <textarea
          value={notes}
          maxLength={280}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-cream"
        />
      </label>

      <p className="mt-4 text-sm text-mute">
        {variation.id === 'standard' ? 'Standard version' : variation.name} · {loggedTotal} reps
      </p>
      <div className="mt-2 flex max-w-full gap-2 overflow-x-auto pb-1">
        {VARIATIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={settings.variation === item.id}
            onClick={() => updateSettings({ variation: item.id })}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${settings.variation === item.id ? 'bg-blood text-white' : 'bg-white/5 text-mute'}`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <button type="button" className="mt-5 w-full text-sm font-semibold uppercase tracking-[0.16em] text-mute" onClick={onCountLive}>
        Count each rep instead
      </button>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-[4.6rem] z-30 px-4 md:static md:bottom-auto md:mt-5 md:px-0">
        <Button className="w-full" data-testid="save-log" disabled={loggedTotal <= 0} onClick={save}>
          {saveLabel}
        </Button>
      </div>
    </Page>
  )
}

function Stepper({
  label,
  value,
  onChange,
  onBump,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  onBump: (delta: number) => void
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Decrease ${label}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl" onClick={() => onBump(-1)}>
          −
        </button>
        <input
          aria-label={label}
          inputMode="numeric"
          type="number"
          min={0}
          max={999}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value), 0, 999))}
          className="h-12 w-0 min-w-0 flex-1 rounded-2xl border border-line bg-ink text-center font-display text-4xl leading-none outline-none"
        />
        <button type="button" aria-label={`Increase ${label}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl" onClick={() => onBump(1)}>
          +
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className="h-11 rounded-xl bg-white/5 text-sm font-semibold" onClick={() => onBump(5)}>
          +5
        </button>
        <button type="button" className="h-11 rounded-xl bg-white/5 text-sm font-semibold" onClick={() => onBump(10)}>
          +10
        </button>
      </div>
    </div>
  )
}

function CountField({
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
    <label className="rounded-2xl border border-line bg-panel px-3 py-3">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-mute">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="mt-1 w-full bg-transparent font-display text-4xl leading-none outline-none"
      />
    </label>
  )
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isInteger(value)) return min
  return Math.min(max, Math.max(min, value))
}
