import { useEffect, useRef, useState } from 'react'
import { BEATS, DEMO_CYCLE_MS, beatFill, beatIndex, beatWeights, demoFrame, demoOffset, phaseSrc } from '../content/beats'

const DEMO_VIDEO = `${import.meta.env.BASE_URL}demo.mp4`
const SHIFT = [0, -16, -6, 18]

type Props = {
  /** Demo holds each photo. Rep follows the workout tempo. */
  pace?: 'demo' | 'rep'
  tempoMs?: number
  beat?: number
  onBeatChange?: (beat: number) => void
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

function oneHot(index: number) {
  return BEATS.map((_, beat) => (beat === index ? 1 : 0))
}

export function PhaseReel({
  pace = 'demo',
  beat,
  onBeatChange,
  progress,
  paused = false,
  compact = false,
  showChrome = false,
  reducedMotion = false,
}: Props) {
  const driven = pace === 'rep' && typeof progress === 'number'
  const controlled = beat !== undefined
  const [internalBeat, setInternalBeat] = useState(0)
  const activeBeat = controlled ? beat : internalBeat
  const [playingFilm, setPlayingFilm] = useState(false)
  const [playing, setPlaying] = useState(!reducedMotion && !paused)
  const [weights, setWeights] = useState<number[]>(() => oneHot(activeBeat))
  const elapsedRef = useRef(demoOffset(activeBeat))
  const echoRef = useRef<number | null>(null)
  const shownRef = useRef(activeBeat)
  const onBeatRef = useRef(onBeatChange)
  onBeatRef.current = onBeatChange
  const videoReady = useOptionalVideo(DEMO_VIDEO, showChrome && !compact)
  const manual = !playing || reducedMotion || paused

  function publish(index: number) {
    shownRef.current = index
    echoRef.current = index
    if (!controlled) setInternalBeat(index)
    onBeatRef.current?.(index)
  }

  function showBeat(index: number, nextWeights = oneHot(index)) {
    const wrapped = (index + BEATS.length) % BEATS.length
    elapsedRef.current = demoOffset(wrapped)
    setWeights(nextWeights)
    publish(wrapped)
  }

  function jump(index: number) {
    setPlaying(false)
    showBeat(index)
  }

  const sawBeat = useRef(false)
  useEffect(() => {
    if (!controlled) return
    if (!sawBeat.current) {
      sawBeat.current = true
      return
    }
    if (echoRef.current === beat) {
      echoRef.current = null
      return
    }
    shownRef.current = beat
    setPlaying(false)
    elapsedRef.current = demoOffset(beat)
    setWeights(oneHot(beat))
  }, [beat, controlled])

  useEffect(() => {
    if (driven || pace !== 'demo' || !playing || reducedMotion || paused) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      let delta = now - last
      last = now
      if (delta > 64) delta = 64
      elapsedRef.current = (elapsedRef.current + delta) % DEMO_CYCLE_MS
      const next = demoFrame(elapsedRef.current)
      setWeights(next.weights)
      if (next.index !== shownRef.current) publish(next.index)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [driven, pace, paused, playing, reducedMotion])

  const liveProgress = driven ? progress : 0
  const repActive = beatIndex(liveProgress)
  const active = driven ? repActive : activeBeat
  const shownWeights = driven ? beatWeights(liveProgress) : manual ? oneHot(active) : weights
  const current = BEATS[active] ?? BEATS[0]

  const drag = useRef<{ x: number; y: number } | null>(null)

  return (
    <section aria-label="Tyson push-up demonstration" className={compact ? '' : 'space-y-3'}>
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-[0_30px_80px_-36px_rgba(179,18,27,0.85)]">
        <div
          className={`relative ${compact ? 'aspect-video max-h-52' : 'aspect-video'}`}
          onPointerDown={(event) => {
            if (driven) return
            drag.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerUp={(event) => {
            const start = drag.current
            drag.current = null
            if (!start || playingFilm || driven) return
            const dx = event.clientX - start.x
            const dy = event.clientY - start.y
            if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) jump(active + (dx < 0 ? 1 : -1))
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
                    opacity: shownWeights[index] ?? 0,
                    transform: `translate3d(${(1 - (shownWeights[index] ?? 0)) * SHIFT[index]}px, 0, 0) scale(${1.045 - (shownWeights[index] ?? 0) * 0.045})`,
                  }}
                />
              ))}
            </div>
          )}

          {!compact && !playingFilm ? (
            <>
              <button
                type="button"
                aria-label="Previous phase"
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-2xl"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => jump(active - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next phase"
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-2xl"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => jump(active + 1)}
              >
                ›
              </button>
            </>
          ) : null}

          {showChrome && !playingFilm && !reducedMotion ? (
            <button
              type="button"
              aria-pressed={playing}
              data-testid="demo-play"
              className="absolute right-3 top-3 h-9 rounded-full bg-black/60 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? 'Pause' : 'Play'}
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

        {driven ? (
          <div className="grid grid-cols-5 gap-1 px-3 py-2">
            {BEATS.map((item, index) => (
              <div key={item.id} className="h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full bg-blood" style={{ width: `${beatFill(liveProgress, index) * 100}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-white/10 bg-ink px-4 py-3">
            <p className="font-display text-4xl leading-none">{current.name}</p>
            <p className="mt-1 text-sm leading-snug text-cream">{current.short}</p>
          </div>
        )}
      </div>

      {!driven && showChrome ? (
        <>
          <div className="grid grid-cols-5 gap-1" role="group" aria-label="Phases">
            {BEATS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-testid={`phase-${item.id}`}
                aria-pressed={index === active}
                onClick={() => jump(index)}
                className={`min-h-11 rounded-xl px-0.5 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] ${index === active ? 'bg-blood text-white' : 'bg-white/5 text-mute'}`}
              >
                {item.name}
              </button>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-cream/90">{current.cue}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-mute">
            {reducedMotion ? 'Stepping only' : 'Each phase holds about 2s'}
          </p>
        </>
      ) : null}
    </section>
  )
}
