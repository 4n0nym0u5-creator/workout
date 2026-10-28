export type Beat = {
  id: 'crouch' | 'dive' | 'bottom' | 'press' | 'snap'
  name: string
  kicker: string
  short: string
  cue: string
  alt: string
  image: 'crouch.jpg' | 'dive.jpg' | 'bottom.jpg' | 'back.jpg'
}

export const BEATS: Beat[] = [
  {
    id: 'crouch',
    name: 'Crouch',
    kicker: '01',
    short: 'Heels on the wall. Knees low, hips high, arms long.',
    cue: 'Heels stay against the wall. Knees bent low with the shins along the floor, hips high, arms long reaching to the floor, head down.',
    alt: 'Crouch: heels against the wall, knees bent low with the shins along the floor, hips high, arms long reaching to the floor, head down.',
    image: 'crouch.jpg',
  },
  {
    id: 'dive',
    name: 'Dive',
    kicker: '02',
    short: 'Launch and dive. Shoulders pass the hands, chest low.',
    cue: 'Heels stay against the wall. Knees still bent, hips dropping, torso swooping forward so the shoulders pass the hands. Elbows bend and the chest stays low.',
    alt: 'Launch and dive: heels on the wall, knees still bent, hips dropping, shoulders passing the hands, elbows bending, chest low.',
    image: 'dive.jpg',
  },
  {
    id: 'bottom',
    name: 'Bottom',
    kicker: '03',
    short: 'Legs straight. Chest a fist above the floor.',
    cue: 'Heels stay against the wall. Legs straight, body long and flat, chest a fist above the floor.',
    alt: 'Bottom: heels on the wall, legs straight, body long and flat, chest a fist above the floor.',
    image: 'bottom.jpg',
  },
  {
    id: 'press',
    name: 'Press',
    kicker: '04',
    short: 'Chest low, heels on the wall. Press and load the snap.',
    cue: 'Body long and flat with the chest low and heels still on the wall. Press through the floor and load the hips for the snap home.',
    alt: 'Press: heels against the wall, legs straight, body long and flat, chest low above the floor, ready to snap the hips back.',
    image: 'back.jpg',
  },
  {
    id: 'snap',
    name: 'Snap back',
    kicker: '05',
    short: 'Snap the hips home into the crouch. Same shape as the start.',
    cue: 'Press and snap the hips back into the crouch — heels on the wall, knees low, hips high, arms long — then go straight into the next rep.',
    alt: 'Snap back: return to the crouch with heels against the wall, knees bent low, hips high, arms long reaching to the floor.',
    image: 'crouch.jpg',
  },
]

/** Label windows across one workout rep. Together they last exactly one tempo. */
export const BEAT_STARTS = [0, 0.2, 0.4, 0.6, 0.8]

/**
 * Demo playback only. Each photo holds for about two seconds.
 * This clock is not the workout rep tempo.
 */
export const DEMO_HOLD_MS = [2000, 2000, 2000, 2000, 2000] as const
export const DEMO_FADE_MS = 480
export const DEMO_CYCLE_MS = DEMO_HOLD_MS.reduce((total, hold) => total + hold, 0)

function emptyWeights() {
  return BEATS.map(() => 0)
}

export function demoOffset(index: number) {
  let elapsed = 0
  for (let i = 0; i < index && i < DEMO_HOLD_MS.length; i += 1) elapsed += DEMO_HOLD_MS[i]
  return elapsed
}

function smoothstep(value: number) {
  const clamped = Math.min(1, Math.max(0, value))
  return clamped * clamped * (3 - 2 * clamped)
}

/** Crossfade weights for the slow demo. A beat is solid, then blends into the next. */
export function demoFrame(elapsedMs: number) {
  const cycle = DEMO_CYCLE_MS
  const t = ((elapsedMs % cycle) + cycle) % cycle
  let start = 0
  for (let index = 0; index < DEMO_HOLD_MS.length; index += 1) {
    const hold = DEMO_HOLD_MS[index]
    const end = start + hold
    if (t < end || index === DEMO_HOLD_MS.length - 1) {
      const into = Math.min(hold, Math.max(0, t - start))
      const fadeStart = Math.max(0, hold - DEMO_FADE_MS)
      const weights = emptyWeights()
      if (into >= fadeStart && DEMO_FADE_MS > 0 && DEMO_FADE_MS < hold) {
        const next = (index + 1) % DEMO_HOLD_MS.length
        const fade = smoothstep((into - fadeStart) / DEMO_FADE_MS)
        weights[index] = 1 - fade
        weights[next] = (weights[next] ?? 0) + fade
        const shown = fade < 0.5 ? index : next
        return { index: shown, weights }
      }
      weights[index] = 1
      return { index, weights }
    }
    start = end
  }
  const fallback = emptyWeights()
  fallback[0] = 1
  return { index: 0, weights: fallback }
}

const CENTERS = [0.1, 0.3, 0.5, 0.7, 0.9]
const FALLOFF = 0.16

export function beatIndex(progress: number) {
  const wrapped = ((progress % 1) + 1) % 1
  let index = 0
  for (let i = 0; i < BEAT_STARTS.length; i += 1) {
    if (wrapped >= BEAT_STARTS[i]) index = i
  }
  return index
}

export function beatFill(progress: number, index: number) {
  const wrapped = ((progress % 1) + 1) % 1
  const start = BEAT_STARTS[index]
  const end = index === BEAT_STARTS.length - 1 ? 1 : BEAT_STARTS[index + 1]
  if (wrapped >= end) return 1
  if (wrapped <= start) return 0
  return (wrapped - start) / (end - start)
}

function circularDistance(a: number, b: number) {
  const delta = Math.abs(a - b)
  return Math.min(delta, 1 - delta)
}

/** Normalized crossfade weights so the photos blend instead of cutting. */
export function beatWeights(progress: number) {
  const wrapped = ((progress % 1) + 1) % 1
  const raw = CENTERS.map((center) => Math.max(0, 1 - circularDistance(wrapped, center) / FALLOFF))
  const sum = raw.reduce((total, weight) => total + weight, 0)
  if (sum <= 0) {
    const fallback = emptyWeights()
    fallback[0] = 1
    return fallback
  }
  return raw.map((weight) => weight / sum)
}

export function phaseSrc(file: string) {
  return `${import.meta.env.BASE_URL}phases/${file}`
}
