export type Beat = {
  id: 'crouch' | 'dive' | 'bottom' | 'back'
  name: string
  kicker: string
  short: string
  cue: string
  alt: string
  image: 'crouch.jpg' | 'dive.jpg' | 'bottom.jpg'
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
    id: 'back',
    name: 'Snap back',
    kicker: '04',
    short: 'Press up and snap the hips back into the crouch.',
    cue: 'Press up and snap the hips back into the crouch. Heels stay against the wall the whole rep, then go straight into the next one.',
    alt: 'Snap back into the crouch: heels against the wall, knees bent low, hips high, arms long, head down.',
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
