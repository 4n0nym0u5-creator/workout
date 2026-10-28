import { useState } from 'react'
import { formatDay } from '../lib/dates'

type Point = { date: string; reps: number; label?: string }

function niceMax(value: number) {
  if (value <= 10) return 10
  const power = 10 ** Math.floor(Math.log10(value))
  const fraction = value / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * power
}

export function RepChart({ series }: { series: Point[] }) {
  const [picked, setPicked] = useState<number | null>(null)
  const active = picked !== null && picked >= 0 && picked < series.length ? picked : series.length - 1
  const selected = series[active]
  const max = niceMax(Math.max(1, ...series.map((point) => point.reps)))
  const wide = series.length > 16

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-4xl leading-none">{selected?.reps ?? 0}</p>
          <p className="text-sm text-mute">{selected ? formatDay(selected.date) : 'No days yet'}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-mute">Peak {max}</p>
      </div>
      <div className={wide ? 'overflow-x-auto pb-1' : ''}>
        <div
          className="flex h-40 items-end gap-[3px]"
          style={wide ? { minWidth: `${series.length * 14}px` } : undefined}
          role="list"
        >
          {series.map((point, index) => {
            const height = point.reps <= 0 ? 0 : Math.max(6, (point.reps / max) * 100)
            return (
              <button
                key={point.date}
                type="button"
                role="listitem"
                aria-label={`${formatDay(point.date)}: ${point.reps} reps`}
                aria-pressed={index === active}
                onClick={() => setPicked(index)}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <span
                  className={`block w-full rounded-t-md ${index === active ? 'bg-ember' : 'bg-blood/80'}`}
                  style={{ height: `${height}%` }}
                />
                {point.label ? <span className="mt-1 text-center text-[10px] text-mute">{point.label}</span> : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
