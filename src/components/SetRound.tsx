import { useState } from 'react'
import { BEATS, phaseSrc } from '../content/beats'
import { lineForSet } from '../content/lines'
import type { VariationId } from '../lib/types'
import { Button } from './ui'

type Props = {
  setNumber: number
  setCount: number
  target: number
  variation: VariationId
  onBegin: () => void
  onComplete: (completed: number) => void
  onQuit: () => void
}

export function SetRound({ setNumber, setCount, target, variation, onBegin, onComplete, onQuit }: Props) {
  const [step, setStep] = useState<'go' | 'log'>('go')
  const [reps, setReps] = useState(target)
  const lastSet = setNumber === setCount
  const cue = variation === 'pause' ? 'Hold the bottom for a second, then snap home.' : 'Heels on the wall. Crouch, dive, bottom, snap back.'

  function openLog() {
    onBegin()
    setReps(target)
    setStep('log')
  }

  function bump(delta: number) {
    setReps((current) => Math.max(0, Math.min(999, current + delta)))
  }

  return (
    <div className="flex min-h-[70dvh] flex-col pb-8">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onQuit} className="text-sm font-semibold uppercase tracking-[0.16em] text-mute">
          Close
        </button>
        <p className="font-display text-3xl leading-none">
          Set {setNumber}
          <span className="text-mute"> / {setCount}</span>
        </p>
        <p className="text-sm uppercase tracking-[0.16em] text-mute">Target {target}</p>
      </header>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: setCount }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < setNumber - 1 ? 'bg-blood' : index === setNumber - 1 ? 'bg-cream' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {step === 'go' ? (
        <>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {BEATS.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-xl border border-white/10">
                <img src={phaseSrc(item.image)} alt="" className="aspect-video w-full object-cover" />
                <figcaption className="px-1 py-1 text-center text-[10px] uppercase tracking-[0.12em] text-mute">{item.name}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-8 font-display text-6xl leading-none">Do the set</p>
          <p className="mt-3 max-w-sm text-lg text-mute">{cue}</p>
          <p className="mt-2 text-sm text-mute">{lineForSet(setNumber, 0)}</p>
          <div className="mt-auto grid gap-2 pt-10">
            <Button data-testid="finish-set" onClick={openLog}>
              Done with set
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-blood">Set {setNumber} reps</p>
          <p className="mt-2 font-display text-5xl leading-none">How many did you hit?</p>
          <p className="mt-3 text-mute">Defaults to {target}. Nudge it if the set ran hot or short.</p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              data-testid="reps-minus"
              aria-label="Fewer reps"
              className="grid h-16 w-16 place-items-center rounded-3xl bg-white/10 font-display text-5xl leading-none"
              onClick={() => bump(-1)}
            >
              −
            </button>
            <p className="min-w-[5.5rem] text-center font-display text-[7rem] leading-none tabular-nums" data-testid="set-reps">
              {reps}
            </p>
            <button
              type="button"
              data-testid="reps-plus"
              aria-label="More reps"
              className="grid h-16 w-16 place-items-center rounded-3xl bg-white/10 font-display text-5xl leading-none"
              onClick={() => bump(1)}
            >
              +
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" className="h-12 rounded-2xl bg-white/5 text-sm font-semibold" onClick={() => bump(-5)}>
              −5
            </button>
            <button type="button" className="h-12 rounded-2xl bg-white/5 text-sm font-semibold" onClick={() => setReps(target)}>
              Reset {target}
            </button>
            <button type="button" className="h-12 rounded-2xl bg-white/5 text-sm font-semibold" onClick={() => bump(5)}>
              +5
            </button>
          </div>

          <div className="mt-auto grid gap-2 pt-10">
            <Button data-testid="confirm-set" disabled={reps <= 0} onClick={() => onComplete(reps)}>
              {lastSet ? 'Finish workout' : 'Start rest'}
            </Button>
            <Button tone="ghost" onClick={() => setStep('go')}>
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
