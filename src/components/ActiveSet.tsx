import { useRef, useState } from 'react'
import { BEATS, phaseSrc } from '../content/beats'
import { lineForSet } from '../content/lines'
import { useRepClock } from '../hooks/useRepClock'
import { beep, unlockAudio, vibrate } from '../lib/audio'
import type { CountMode, VariationId } from '../lib/types'
import { PhaseReel } from './PhaseReel'
import { Button } from './ui'

const RING = 2 * Math.PI * 54

type Props = {
  setNumber: number
  setCount: number
  target: number
  tempoMs: number
  countMode: CountMode
  sound: boolean
  haptics: boolean
  variation: VariationId
  onBegin: () => void
  onComplete: (completed: number) => void
  onQuit: () => void
}

export function ActiveSet({
  setNumber,
  setCount,
  target,
  tempoMs,
  countMode,
  sound,
  haptics,
  variation,
  onBegin,
  onComplete,
  onQuit,
}: Props) {
  const [rep, setRep] = useState(0)
  const [cap, setCap] = useState(target)
  const [running, setRunning] = useState(false)
  const [locked, setLocked] = useState(false)
  const repRef = useRef(0)
  const capRef = useRef(target)
  capRef.current = cap

  const clock = useRepClock({
    running: countMode === 'tempo' && running,
    tempoMs,
    sound,
    haptics,
    onRep: () => {
      if (repRef.current >= capRef.current) {
        setRunning(false)
        setLocked(true)
        if (sound) beep('set')
        if (haptics) vibrate([24, 40, 30])
        return false
      }
      const next = repRef.current + 1
      repRef.current = next
      setRep(next)
      return true
    },
  })

  function feedback() {
    if (sound) beep('rep')
    if (haptics) vibrate(16)
  }

  function go() {
    onBegin()
    unlockAudio()
    if (repRef.current === 0) {
      repRef.current = 1
      setRep(1)
      feedback()
    }
    setLocked(false)
    setRunning(true)
  }

  function bump(delta: number) {
    const next = Math.max(0, Math.min(999, repRef.current + delta))
    repRef.current = next
    setRep(next)
    if (delta > 0) {
      onBegin()
      feedback()
    }
    if (next < capRef.current) setLocked(false)
  }

  const beat = countMode === 'tempo' ? clock.beat : 0
  const phase = BEATS[beat] ?? BEATS[0]
  const cue = variation === 'pause' && phase.id === 'bottom' ? `${phase.short} Hold one second.` : phase.short
  const ring = countMode === 'tempo' ? (running || rep > 0 ? clock.progress : 0) : target === 0 ? 0 : Math.min(1, rep / target)
  const lastSet = setNumber === setCount
  const showGo = countMode === 'tempo' && !running && rep === 0
  const showResume = countMode === 'tempo' && !running && rep > 0 && !locked
  const advanceLabel = lastSet ? 'Finish' : locked || rep >= target ? 'Rest' : 'End set'

  function keepGoing() {
    const nextCap = capRef.current + Math.max(target, 1)
    capRef.current = nextCap
    setCap(nextCap)
    const next = repRef.current + 1
    repRef.current = next
    setRep(next)
    setLocked(false)
    onBegin()
    feedback()
    setRunning(true)
  }

  return (
    <div className="pb-28">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onQuit} className="text-sm font-semibold uppercase tracking-[0.16em] text-mute">
          Close
        </button>
        <p className="font-display text-3xl leading-none">
          Set {setNumber}
          <span className="text-mute"> / {setCount}</span>
        </p>
        <p className="text-sm uppercase tracking-[0.16em] text-mute">{countMode === 'tempo' ? 'Tempo' : 'Tap'}</p>
      </header>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: setCount }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < setNumber - 1 ? 'bg-blood' : index === setNumber - 1 ? 'bg-cream' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {countMode === 'tempo' ? (
        <div className="mt-4">
          <PhaseReel pace="rep" tempoMs={tempoMs} progress={running || rep > 0 ? clock.progress : 0} paused={!running} compact />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {BEATS.map((item) => (
            <figure key={item.id} className="overflow-hidden rounded-xl border border-white/10">
              <img src={phaseSrc(item.image)} alt={item.alt} className="aspect-video w-full object-cover" />
              <figcaption className="px-1 py-1 text-center text-[10px] uppercase tracking-[0.12em] text-mute">{item.name}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col items-center">
        {countMode === 'tap' ? (
          <button
            type="button"
            data-testid="rep-button"
            aria-label={`Count a rep. ${rep} of ${target}`}
            onClick={() => bump(1)}
            className="relative grid h-[min(68vw,280px)] w-[min(68vw,280px)] place-items-center rounded-full border border-white/10 bg-panel"
          >
            <Ring progress={ring} />
            <RepReadout rep={rep} target={target} />
          </button>
        ) : (
          <div
            className="relative grid h-[min(68vw,280px)] w-[min(68vw,280px)] place-items-center rounded-full border border-white/10 bg-panel"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <Ring progress={ring} />
            <RepReadout rep={rep} target={target} />
          </div>
        )}
        <p className="mt-4 max-w-xs text-center text-lg">{locked ? 'Set locked. Add more, or move on.' : lineForSet(setNumber, rep)}</p>
        <p className="mt-1 text-center text-sm text-mute">{cue}</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#070708]/92 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-0">
          {showGo ? <Button onClick={go}>Go</Button> : null}
          {showGo ? null : (
            <div className="grid grid-cols-2 gap-2">
              <Button tone="ghost" className="text-2xl" onClick={() => bump(-1)} disabled={rep === 0}>
                −1
              </Button>
              {running ? (
                <Button tone="ghost" onClick={() => setRunning(false)}>
                  Pause
                </Button>
              ) : showResume ? (
                <Button onClick={() => setRunning(true)}>Resume</Button>
              ) : locked ? (
                <Button tone="ghost" onClick={keepGoing}>
                  Keep going
                </Button>
              ) : countMode === 'tempo' ? (
                <Button tone="ghost" className="text-2xl" onClick={() => bump(1)}>
                  +1
                </Button>
              ) : (
                <Button data-testid="finish-set" disabled={rep === 0} onClick={() => onComplete(rep)}>
                  {advanceLabel}
                </Button>
              )}
            </div>
          )}
          {countMode === 'tempo' && !showGo ? (
            <Button data-testid="finish-set" disabled={rep === 0} onClick={() => onComplete(rep)}>
              {advanceLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function RepReadout({ rep, target }: { rep: number; target: number }) {
  return (
    <span className="text-center">
      <span key={rep} className="block animate-punch font-display text-[6.5rem] leading-none">
        {rep}
      </span>
      <span className="mt-1 block text-sm uppercase tracking-[0.18em] text-mute">of {target}</span>
    </span>
  )
}

function Ring({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] -rotate-90" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="#b3121b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${RING} ${RING}`}
        strokeDashoffset={RING * (1 - Math.max(0, Math.min(1, progress)))}
      />
    </svg>
  )
}
