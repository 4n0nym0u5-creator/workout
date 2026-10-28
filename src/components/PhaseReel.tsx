import { useEffect, useRef, useState } from 'react'
import { BEATS, BEAT_STARTS, beatFill, beatIndex, beatWeights, phaseSrc } from '../content/beats'
import { TEMPO_OPTIONS } from '../content/guide'
import { formatTempo } from '../lib/dates'
import { Pill } from './ui'

const DEMO_VIDEO = `${import.meta.env.BASE_URL}demo.mp4`
const SHIFT = [0, -16, -6, 18]

type Mode = 'loop' | 'step'

type Props = {
  tempoMs: number
  mode: Mode
  beat?: number
  onBeatChange?: (beat: number) => void
  onModeChange?: (mode: Mode) => void
  onTempoChange?: (ms: number) => void
  progress?: number
  paused?: boolean
  compact?: boolean
  showChrome?: boolean
  reducedMotion?: boolean
}

function useOptionalVideo(src: string, enabled: boolean) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let gone = false
    const video = document.createElement('video')
    const ok = () => {
      if (!gone && video.videoWidth > 0) setReady(true)
    }
    const bad = () => {
      if (!gone) setReady(false)
    }
    video.preload = 'metadata'
    video.muted = true
    video.addEventListener('loadedmetadata', ok)
    video.addEventListener('error', bad)
    video.src = src
    return () => {
      gone = true
      video.removeEventListener('loadedmetadata', ok)
      video.removeEventListener('error', bad)
      video.removeAttribute('src')
      video.load()
    }
  }, [enabled, src])
  return ready
}

export function PhaseReel({
  tempoMs,
  mode,
  beat = 0,
  onBeatChange,
  onModeChange,
  onTempoChange,
  progress,
  paused = false,
  compact = false,
  showChrome = false,
  reducedMotion = false,
}: Props) {
  const driven = typeof progress === 'number'
  const [internalProgress, setInternalProgress] = useState(BEAT_STARTS[beat] ?? 0)
  const [playingFilm, setPlayingFilm] = useState(false)
  const [loopPaused, setLoopPaused] = useState(false)
  const accRef = useRef((BEAT_STARTS[beat] ?? 0) * tempoMs)
  const videoReady = useOptionalVideo(DEMO_VIDEO, showChrome && !compact)
  const hold = paused || loopPaused || reducedMotion
  const visualMode = reducedMotion ? 'step' : mode

  useEffect(() => {
    if (driven || visualMode !== 'loop' || hold) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      let delta = now - last
      last = now
      if (delta > 64) delta = 64
      accRef.current = (accRef.current + delta) % tempoMs
      setInternalProgress(accRef.current / tempoMs)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [driven, hold, tempoMs, visualMode])

  const liveProgress = driven ? progress : visualMode === 'step' ? (BEAT_STARTS[beat] ?? 0) + 0.12 : internalProgress
  const active = visualMode === 'step' && !driven ? beat : beatIndex(liveProgress)
  const weights = visualMode === 'step' && !driven ? BEATS.map((_, index) => (index === beat ? 1 : 0)) : beatWeights(liveProgress)
  const current = BEATS[active] ?? BEATS[0]

  useEffect(() => {
    if (visualMode === 'loop') onBeatChange?.(active)
  }, [active, onBeatChange, visualMode])

  function go(next: number) {
    const wrapped = (next + BEATS.length) % BEATS.length
    onModeChange?.('step')
    onBeatChange?.(wrapped)
    accRef.current = (BEAT_STARTS[wrapped] ?? 0) * tempoMs
    setInternalProgress(BEAT_STARTS[wrapped] ?? 0)
  }

  const drag = useRef<{ x: number; y: number } | null>(null)

  return (
    <section aria-label="Tyson push-up demonstration" className={compact ? '' : 'space-y-3'}>
      {showChrome ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full bg-white/5 p-1">
            <Pill pressed={visualMode === 'loop'} onClick={() => onModeChange?.('loop')}>
              Loop
            </Pill>
            <Pill pressed={visualMode === 'step'} onClick={() => onModeChange?.('step')}>
              Steps
            </Pill>
          </div>
          {onTempoChange ? (
            <div className="flex flex-wrap gap-1">
              {TEMPO_OPTIONS.map((ms) => (
                <Pill key={ms} pressed={tempoMs === ms} onClick={() => onTempoChange(ms)}>
                  {formatTempo(ms)}
                </Pill>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-[0_30px_80px_-36px_rgba(179,18,27,0.85)]">
        <div
          className={`relative ${compact ? 'aspect-video max-h-52' : 'aspect-video'}`}
          onPointerDown={(event) => {
            drag.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerUp={(event) => {
            const start = drag.current
            drag.current = null
            if (!start || playingFilm) return
            const dx = event.clientX - start.x
            const dy = event.clientY - start.y
            if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) {
              go(active + (dx < 0 ? 1 : -1))
              return
            }
            if (visualMode === 'step' && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
              const bounds = event.currentTarget.getBoundingClientRect()
              go(active + (event.clientX - bounds.left > bounds.width / 2 ? 1 : -1))
            }
          }}
        >
          {playingFilm ? (
            <video
              src={DEMO_VIDEO}
              poster={phaseSrc('crouch.jpg')}
              controls
              autoPlay
              playsInline
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <div className="absolute inset-0">
              {BEATS.map((item, index) => (
                <img
                  key={item.id}
                  src={phaseSrc(item.image)}
                  alt={index === active ? item.alt : ''}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  style={{
                    opacity: weights[index] ?? 0,
                    transform: `translate3d(${(1 - (weights[index] ?? 0)) * SHIFT[index]}px, 0, 0) scale(${1.045 - (weights[index] ?? 0) * 0.045})`,
                  }}
                />
              ))}
              <div
                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-blood/30 to-transparent"
                style={{
                  opacity: (weights[3] ?? 0) * 0.85,
                  transform: `translateX(${(1 - (weights[3] ?? 0)) * 80}%)`,
                }}
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-3 pt-16">
            <div key={current.id} className="animate-rise flex items-end justify-between gap-3">
              <div>
                <p className={`font-display leading-none ${compact ? 'text-3xl' : 'text-5xl'}`}>{current.name}</p>
                {visualMode === 'loop' || compact ? (
                  <p className="mt-1 max-w-[16rem] text-sm text-cream/90">{current.short}</p>
                ) : null}
              </div>
              <p className="font-display text-2xl text-ember">{current.kicker}</p>
            </div>
          </div>

          {visualMode === 'step' && !playingFilm ? (
            <>
              <button
                type="button"
                aria-label="Previous phase"
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-2xl"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => go(active - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next phase"
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-2xl"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => go(active + 1)}
              >
                ›
              </button>
            </>
          ) : null}

          {showChrome && visualMode === 'loop' && !playingFilm ? (
            <button
              type="button"
              className="absolute right-3 top-3 h-9 rounded-full bg-black/60 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
              onClick={() => setLoopPaused((value) => !value)}
            >
              {loopPaused ? 'Play' : 'Pause'}
            </button>
          ) : null}

          {videoReady && showChrome && !compact ? (
            <button
              type="button"
              className="absolute left-3 top-3 h-9 rounded-full bg-black/60 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
              onClick={() => setPlayingFilm((value) => !value)}
            >
              {playingFilm ? 'Steps' : 'Film'}
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-1 px-3 py-2">
          {BEATS.map((item, index) => (
            <div key={item.id} className="h-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-blood"
                style={{
                  width: `${(visualMode === 'step' ? (index <= active ? 1 : 0) : beatFill(liveProgress, index)) * 100}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {showChrome && visualMode === 'step' ? (
        <p className="text-sm leading-relaxed text-cream/90">{current.cue}</p>
      ) : null}
      {showChrome ? (
        <p className="text-xs uppercase tracking-[0.18em] text-mute">
          One loop is one rep · {formatTempo(tempoMs)}
          {visualMode === 'step' ? ' · tap either side to step' : ''}
        </p>
      ) : null}
    </section>
  )
}
