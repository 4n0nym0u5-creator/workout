import { useState } from 'react'
import { formatDay, localDate } from '../lib/dates'
import { seriesStats } from '../lib/stats'

type Point = { date: string; reps: number; label?: string }

type Props = {
  series: Point[]
  goal?: number
  emptyHint?: string
  unit?: string
}

function niceMax(value: number) {
  if (value <= 10) return 10
  const power = 10 ** Math.floor(Math.log10(value))
  const fraction = value / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * power
}

function defaultIndex(series: Point[]) {
  if (series.length === 0) return 0
  const todayKey = localDate(new Date())
  const todayIndex = series.findIndex((point) => point.date === todayKey)
  if (todayIndex >= 0) return todayIndex
  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (series[index].reps > 0) return index
  }
  return Math.max(0, series.length - 1)
}

function pointCaption(point: Point) {
  if (!point.label) return formatDay(point.date)
  // Weekday letters (M/T/W…) — prefer the full day label.
  if (point.label.length <= 2) return formatDay(point.date)
  if (point.label === 'Now') return `This week · ${formatDay(point.date)}`
  return point.label
}

export function RepChart({ series, goal, emptyHint = 'Finish a workout and the days start to stack.', unit = 'reps' }: Props) {
  const [picked, setPicked] = useState<number | null>(null)
  const fallback = defaultIndex(series)
  const active = picked !== null && picked >= 0 && picked < series.length ? picked : fallback
  const selected = series[active]
  const stats = seriesStats(series)
  const ceiling = Math.max(1, stats.best, goal && stats.best > 0 ? Math.min(goal, stats.best * 1.35) : 0)
  const max = niceMax(ceiling)
  const wide = series.length > 16
  const goalTop = goal && goal > 0 ? Math.min(100, (goal / max) * 100) : null
  const averageTop = stats.average > 0 ? Math.min(100, (stats.average / max) * 100) : null

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-4xl leading-none">{selected?.reps ?? 0}</p>
          <p className="text-sm text-mute">{selected ? pointCaption(selected) : 'No days yet'}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-mute">Peak {max}</p>
      </div>

      {stats.trainedDays === 0 ? <p className="mb-3 text-sm text-mute">{emptyHint}</p> : null}

      <div className={wide ? 'overflow-x-auto pb-1' : ''}>
        <div
          className="relative flex h-40 items-end gap-[3px]"
          style={wide ? { minWidth: `${series.length * 14}px` } : undefined}
          role="list"
        >
          {goalTop !== null ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gold/50"
              style={{ bottom: `${goalTop}%` }}
              title={`Goal ${goal}`}
            />
          ) : null}
          {averageTop !== null ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t border-dotted border-cream/25"
              style={{ bottom: `${averageTop}%` }}
              title={`Average ${stats.average}`}
            />
          ) : null}
          {series.map((point, index) => {
            const height = point.reps <= 0 ? 0 : Math.max(6, (point.reps / max) * 100)
            const isBest = point.reps > 0 && point.reps === stats.best
            return (
              <button
                key={point.date}
                type="button"
                role="listitem"
                aria-label={`${formatDay(point.date)}: ${point.reps} ${unit}`}
                aria-pressed={index === active}
                onClick={() => setPicked(index)}
                className="relative z-10 flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <span
                  className={`block w-full rounded-t-md ${
                    index === active ? 'bg-ember' : isBest ? 'bg-gold' : point.reps > 0 ? 'bg-blood/80' : 'bg-white/10'
                  }`}
                  style={{ height: point.reps <= 0 ? '3px' : `${height}%` }}
                />
                {point.label ? <span className="mt-1 text-center text-[10px] text-mute">{point.label}</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatChip label="Total" value={String(stats.total)} />
        <StatChip label="Avg day" value={stats.trainedDays === 0 ? '—' : String(stats.average)} />
        <StatChip label="Best" value={stats.best === 0 ? '—' : String(stats.best)} accent={stats.best > 0} />
      </div>
      {goal && goal > 0 ? (
        <p className="mt-2 text-xs text-mute">
          Gold dashed line is the {goal} {unit} day goal
          {stats.average > 0 ? ` · dotted line is your ${stats.average} average on trained days` : ''}.
        </p>
      ) : stats.average > 0 ? (
        <p className="mt-2 text-xs text-mute">Dotted line is your {stats.average} average on trained days.</p>
      ) : null}
    </div>
  )
}

function StatChip({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-2 ${accent ? 'bg-gold/10' : 'bg-white/5'}`}>
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-mute">{label}</p>
      <p className={`font-display text-3xl leading-none ${accent ? 'text-gold' : ''}`}>{value}</p>
    </div>
  )
}
