import { useEffect, useRef, useState } from 'react'
import { clampIsoDate, formatDay, localDate } from '../lib/dates'
import type { Difficulty, Session, SetLog } from '../lib/types'
import { Button } from './ui'

type Draft = {
  date: string
  notes: string
  sets: SetLog[]
  difficulty: Difficulty | null
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'solid', label: 'Solid' },
  { id: 'hard', label: 'Hard' },
]

export function SessionEditor({
  session,
  onClose,
  onSave,
  onDelete,
}: {
  session: Session | null
  onClose: () => void
  onSave: (session: Session) => void
  onDelete: (id: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (session && session.id !== draftId) {
    setDraftId(session.id)
    setDraft({
      date: session.date,
      notes: session.notes,
      sets: session.sets.map((set) => ({ ...set })),
      difficulty: session.difficulty,
    })
    setConfirmDelete(false)
  }
  if (!session && draftId !== null) {
    setDraftId(null)
    setDraft(null)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (session && !dialog.open) dialog.showModal()
    if (!session && dialog.open) dialog.close()
  }, [session])

  if (!session || !draft) return <dialog ref={dialogRef} onClose={onClose} />

  const today = localDate(new Date())
  const total = draft.sets.reduce((sum, set) => sum + set.completed, 0)
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
    draft.date <= today &&
    draft.sets.length > 0 &&
    draft.sets.every((set) => Number.isInteger(set.completed) && set.completed >= 0 && set.completed <= 999 && set.target >= 0)

  function updateSet(index: number, patch: Partial<SetLog>) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        sets: current.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...patch } : set)),
      }
    })
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      onClose={onClose}
      aria-labelledby="edit-title"
    >
      <form
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-line bg-panel p-5 md:rounded-3xl"
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid) return
          const nextDate = clampIsoDate(draft.date, '2000-01-01', today)
          onSave({
            ...session,
            date: nextDate,
            notes: draft.notes.trim().slice(0, 280),
            sets: draft.sets,
            totalReps: total,
            difficulty: draft.difficulty,
            completedAt: shiftTime(session.completedAt, nextDate),
          })
        }}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blood">Edit session</p>
        <h2 id="edit-title" className="mt-1 font-display text-4xl leading-none">
          {formatDay(session.date)}
        </h2>
        <label className="mt-4 block text-sm text-mute">
          Date
          <input
            type="date"
            value={draft.date}
            max={today}
            onChange={(event) => setDraft({ ...draft, date: clampIsoDate(event.target.value, '2000-01-01', today) })}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-cream"
          />
        </label>
        <div className="mt-4 grid gap-2">
          {draft.sets.map((set, index) => (
            <div key={index} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
              <span className="text-sm text-mute">Set {index + 1}</span>
              <label className="text-xs text-mute">
                Target
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={set.target}
                  onChange={(event) => updateSet(index, { target: clampInt(event.target.value, 0, 500) })}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-2 text-cream"
                />
              </label>
              <label className="text-xs text-mute">
                Done
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={set.completed}
                  onChange={(event) => updateSet(index, { completed: clampInt(event.target.value, 0, 999) })}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-2 text-cream"
                />
              </label>
              <button
                type="button"
                className="mt-4 text-sm text-mute disabled:opacity-30"
                disabled={draft.sets.length === 1}
                onClick={() =>
                  setDraft({
                    ...draft,
                    sets: draft.sets.filter((_, setIndex) => setIndex !== index),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-ember"
          onClick={() => setDraft({ ...draft, sets: [...draft.sets, { target: session.sets[0]?.target ?? 8, completed: 0 }] })}
        >
          Add set
        </button>
        <fieldset className="mt-4">
          <legend className="text-sm text-mute">Difficulty, optional</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFFICULTIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={draft.difficulty === item.id}
                onClick={() => setDraft({ ...draft, difficulty: draft.difficulty === item.id ? null : item.id })}
                className={`h-10 rounded-full px-3 text-sm font-semibold ${draft.difficulty === item.id ? 'bg-blood text-white' : 'bg-white/5 text-mute'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm text-mute">
          Note
          <textarea
            value={draft.notes}
            maxLength={280}
            rows={3}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-cream"
          />
        </label>
        <p className="mt-3 font-display text-4xl leading-none">{total} reps</p>
        <div className="mt-4 grid gap-2">
          <Button type="submit" disabled={!valid}>
            Save changes
          </Button>
          {confirmDelete ? (
            <Button
              tone="ghost"
              onClick={() => {
                onDelete(session.id)
              }}
            >
              Confirm delete
            </Button>
          ) : (
            <Button tone="ghost" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </dialog>
  )
}

function clampInt(value: string, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return min
  return Math.min(max, Math.max(min, parsed))
}

function shiftTime(previous: string, date: string) {
  const prior = new Date(previous)
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, (month ?? 1) - 1, day ?? 1, prior.getHours(), prior.getMinutes(), prior.getSeconds())
  return Number.isNaN(next.getTime()) ? previous : next.toISOString()
}
