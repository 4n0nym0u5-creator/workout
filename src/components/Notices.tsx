import { NUDGE_COPY } from '../content/lines'
import type { NudgeKind } from '../lib/stats'
import { Button } from './ui'

export function NudgeCard({ kind, onTrain, onDismiss }: { kind: NudgeKind; onTrain: () => void; onDismiss: () => void }) {
  return (
    <aside className="rounded-3xl border border-gold/40 bg-gold/10 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold">This week</p>
      <p className="mt-2 text-lg leading-snug">{NUDGE_COPY[kind]}</p>
      <div className="mt-4 flex gap-2">
        <Button className="h-12 flex-1 text-2xl" onClick={onTrain}>
          Train
        </Button>
        <Button tone="ghost" className="h-12 px-4 text-2xl" onClick={onDismiss}>
          Later
        </Button>
      </div>
    </aside>
  )
}

export function StepUpCard({
  message,
  action,
  onMove,
  onStay,
}: {
  message: string
  action: string
  onMove: () => void
  onStay: () => void
}) {
  return (
    <aside className="rounded-3xl border border-blood/50 bg-blood/10 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ember">Step up</p>
      <p className="mt-2 text-lg leading-snug">{message}</p>
      <div className="mt-4 flex gap-2">
        <Button className="h-12 flex-1 text-2xl" onClick={onMove}>
          {action}
        </Button>
        <Button tone="ghost" className="h-12 px-4 text-2xl" onClick={onStay}>
          Stay
        </Button>
      </div>
    </aside>
  )
}
