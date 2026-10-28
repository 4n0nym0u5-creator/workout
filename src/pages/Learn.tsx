import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhaseReel } from '../components/PhaseReel'
import { Button, Kicker, Page } from '../components/ui'
import { BEATS } from '../content/beats'
import { FORM_CUES, MISTAKES, MUSCLES, PLAN, SAFETY, VARIATIONS, stageById } from '../content/guide'
import { useStore } from '../context/Store'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function Learn() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const { settings, updateSettings } = useStore()
  const [mode, setMode] = useState<'loop' | 'step'>('step')
  const [beat, setBeat] = useState(0)
  const current = stageById(settings.stageId)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, button')) return
      if (mode !== 'step') return
      if (event.key === 'ArrowRight') setBeat((value) => (value + 1) % BEATS.length)
      if (event.key === 'ArrowLeft') setBeat((value) => (value + BEATS.length - 1) % BEATS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  return (
    <Page title="Learn" wide>
      <Kicker>The rep</Kicker>
      <h1 className="mt-2 font-display text-6xl leading-[0.85] md:text-7xl">Crouch. Dive. Bottom. Snap back.</h1>
      <p className="mt-3 max-w-xl text-mute">
        A continuous squat-to-push-up. Hands stay planted and heels stay against the wall the whole rep. About 1.5–2 seconds a rep once it is clean. Step through it, or loop it at the tempo you will train.
      </p>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="md:sticky md:top-6">
          <PhaseReel
            tempoMs={settings.tempoMs}
            mode={reduced ? 'step' : mode}
            beat={beat}
            onBeatChange={setBeat}
            onModeChange={setMode}
            onTempoChange={(tempoMs) => updateSettings({ tempoMs })}
            showChrome
            reducedMotion={reduced}
          />
        </div>
        <ol className="grid gap-2">
          {BEATS.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setMode('step')
                  setBeat(index)
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${index === beat ? 'border-blood bg-blood/10' : 'border-line bg-panel'}`}
              >
                <span className="font-display text-2xl text-ember">{item.kicker}</span>
                <span className="ml-2 font-display text-3xl">{item.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-cream/85">{item.cue}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-good/30 bg-good/10 p-4">
          <h2 className="font-display text-4xl leading-none text-good">Form cues</h2>
          <ul className="mt-3 grid gap-3">
            {FORM_CUES.map((cue) => (
              <li key={cue.title}>
                <p className="font-semibold">{cue.title}</p>
                <p className="text-sm text-cream/80">{cue.detail}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-blood/40 bg-blood/10 p-4">
          <h2 className="font-display text-4xl leading-none text-ember">Common mistakes</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed">
            {MISTAKES.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-4xl leading-none">Muscles worked</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MUSCLES.map((muscle) => (
            <li key={muscle} className="rounded-full border border-blood px-3 py-1 text-sm font-semibold text-ember">
              {muscle}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <Kicker>9-week build</Kicker>
        <h2 className="mt-2 font-display text-5xl leading-none">250 is the target, not day one</h2>
        <p className="mt-3 max-w-2xl text-mute">
          Rest 45–90 seconds between sets. Move up only when every rep in the current stage looks clean. Sore for more than two days? Repeat the stage.
        </p>
        <div className="mt-4 grid gap-3">
          {PLAN.map((stage) => {
            const active = stage.id === current.id
            return (
              <article key={stage.id} className={`rounded-3xl border p-4 ${active ? 'border-blood bg-blood/10' : 'border-line bg-panel'}`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-mute">{stage.weeks}</p>
                    <h3 className="font-display text-4xl leading-none">{stage.name}</h3>
                  </div>
                  <p className="font-display text-4xl leading-none text-ember">{stage.totalLabel}</p>
                </div>
                <p className="mt-2 text-sm text-mute">
                  {stage.setsLabel} · {stage.daysLabel}
                </p>
                <p className="mt-2 text-sm">{stage.blurb}</p>
                <Button
                  tone={active ? 'primary' : 'ghost'}
                  className="mt-4 h-12 w-full text-2xl md:w-auto md:px-6"
                  onClick={() => {
                    updateSettings({ stageId: stage.id, optionId: stage.defaultOptionId })
                    navigate('/workout')
                  }}
                >
                  {active ? 'Train this stage' : 'Switch and train'}
                </Button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <VariationColumn title="Make it easier" group="easier" selected={settings.variation} onSelect={(variation) => updateSettings({ variation })} />
        <VariationColumn title="Make it harder" group="harder" selected={settings.variation} onSelect={(variation) => updateSettings({ variation })} />
      </section>
      <button type="button" className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-mute" onClick={() => updateSettings({ variation: 'standard' })}>
        Use the standard version
      </button>

      <section className="mt-10 rounded-3xl border border-gold/40 bg-gold/10 p-4">
        <h2 className="font-display text-4xl leading-none text-gold">Safety</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-relaxed">
          {SAFETY.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
      <p className="mt-6 text-xs leading-relaxed text-mute">
        Movement breakdown based on the public video by @_alfa_jnr. The build-up plan is a general guide, not medical advice.
      </p>
    </Page>
  )
}

function VariationColumn({
  title,
  group,
  selected,
  onSelect,
}: {
  title: string
  group: 'easier' | 'harder'
  selected: string
  onSelect: (id: (typeof VARIATIONS)[number]['id']) => void
}) {
  return (
    <div>
      <h2 className="font-display text-4xl leading-none">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {VARIATIONS.filter((item) => item.group === group).map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={selected === item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left ${selected === item.id ? 'border-blood bg-blood/10' : 'border-line'}`}
            >
              <span className="font-semibold">{item.name}</span>
              <span className="mt-1 block text-sm text-mute">{item.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
