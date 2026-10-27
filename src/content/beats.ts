export type Beat = {
  id: 'crouch' | 'dive' | 'bottom' | 'back'
  name: string
  kicker: string
  short: string
  cue: string
  image: 'crouch.jpg' | 'dive.jpg' | 'bottom.jpg'
}

export const BEATS: Beat[] = [
  {
    id: 'crouch',
    name: 'Crouch',
    kicker: '01',
    short: 'Hips back. Hands planted. Arms straight.',
    cue: 'Hands flat, slightly wider than shoulders, arms straight. Sit your hips back toward your heels, up on the balls of your feet. Back flat, hips just above knee height.',
    image: 'crouch.jpg',
  },
  {
    id: 'dive',
    name: 'Dive',
    kicker: '02',
    short: 'Drive through the legs. Chest goes forward.',
    cue: 'Drive hard through your legs to shoot your body forward. Hands stay planted. As you move forward, bend your elbows about 45° from your body and lower your chest.',
    image: 'dive.jpg',
  },
  {
    id: 'bottom',
    name: 'Bottom',
    kicker: '03',
    short: 'Straight plank. Chest just off the floor.',
    cue: 'Body in a straight plank, legs fully extended, chest just above the floor.',
    image: 'bottom.jpg',
  },
  {
    id: 'back',
    name: 'Snap back',
    kicker: '04',
    short: 'Push hard and spring into the crouch.',
    cue: 'Push up and back hard while bending the knees and hips to spring back into the crouch. Go straight into the next rep.',
    image: 'crouch.jpg',
  },
]

/** Label windows across one rep. Together they last exactly one tempo. */
export const BEAT_STARTS = [0, 0.25, 0.48, 0.7]

const CENTERS = [0.12, 0.36, 0.58, 0.84]
const FALLOFF = 0.2

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
  if (sum <= 0) return [1, 0, 0, 0]
  return raw.map((weight) => weight / sum)
}

export function phaseSrc(file: string) {
  return `${import.meta.env.BASE_URL}phases/${file}`
}
