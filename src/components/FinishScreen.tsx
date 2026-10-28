import { useEffect, useRef } from 'react'
import { badgeById, type BadgeId } from '../content/badges'
import type { PlanStage } from '../content/guide'
import { runConfetti } from '../lib/confetti'
import { formatClock, formatRelativeDay, localDate } from '../lib/dates'
import type { Session } from '../lib/types'
import { Button, Kicker } from './ui'

export type FinishSummary = {
  session: Session
  fresh: BadgeId[]
  celebrate: boolean
  line: string
  dayTotal: number
  previousBest: number
  stepUp: PlanStage | null
}

export function FinishScreen({
  summary,
  onDone,
  onAgain,
  onMoveUp,
  onStay,
}: {
  summary: FinishSummary
  onDone: () => void
  onAgain: () => void
  onMoveUp: () => void
  onStay: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { session } = summary

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !summary.celebrate) return
    return runConfetti(canvas)
  }, [summary.celebrate])

  const bestLine =
    summary.previousBest > 0 && summary.dayTotal > summary.previousBest
      ? `New best day · ${summary.dayTotal}`
      : summary.dayTotal >= 250
        ? '250-rep day'
        : null

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 h-dvh w-full" aria-hidden="true" />
      <Kicker>{session.date === localDate(new Date()) ? 'Session logged' : `Logged · ${formatRelativeDay(session.date)}`}</Kicker>
      <h1 className="mt-2 font-display text-7xl leading-none" data-testid="session-total">
        {session.totalReps}
      </h1>
      <p className="text-sm uppercase tracking-[0.2em] text-mute">reps</p>
      <p className="mt-4 text-lg leading-snug">{summary.line}</p>
      {bestLine ? <p className="mt-3 font-display text-3xl text-gold">{bestLine}</p> : null}
      <p className="mt-4 text-mute">
        {formatRelativeDay(session.date)} · {session.stageLabel} · {session.optionLabel}
        {session.durationSec > 0 ? ` · ${formatClock(session.durationSec)}` : ''}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {session.sets.map((set, index) => (
          <li
            key={`${set.target}-${index}`}
            className={`rounded-full px-3 py-1 text-sm ${set.completed >= set.target ? 'bg-white/10' : 'bg-blood/30'}`}
          >
            Set {index + 1}: {set.completed}/{set.target}
          </li>
        ))}
      </ul>
      {summary.fresh.length > 0 ? (
        <div className="mt-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold">New marks</p>
          <ul className="mt-2 grid gap-2">
            {summary.fresh.map((id) => {
              const badge = badgeById(id)
              return (
                <li key={id} className="rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2">
                  <span className="font-semibold">{badge.name}</span>
                  <span className="mt-0.5 block text-sm text-mute">{badge.detail}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {summary.stepUp ? (
        <div className="mt-5 rounded-3xl border border-blood/50 bg-blood/10 p-4">
          <p className="text-lg">Three clean sessions. {summary.stepUp.name} is open: {summary.stepUp.setsLabel}.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button className="h-12 text-2xl" onClick={onMoveUp}>
              Move up
            </Button>
            <Button tone="ghost" className="h-12 text-2xl" onClick={onStay}>
              Stay
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-6 grid gap-2">
        <Button onClick={onDone}>Done</Button>
        <Button tone="ghost" onClick={onAgain}>
          Train again
        </Button>
      </div>
    </div>
  )
}
