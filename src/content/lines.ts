export const SET_LINES = [
  'Stay mean. Stay smooth.',
  'Hands planted. The legs do the travel.',
  'No pause at the top. Spring it.',
  'Chest low, or that one was a rehearsal.',
  'Elbows in. About forty-five, not a T.',
  'Breathe in on the dive.',
  'Blow the breath out on the way back.',
  'Knees off the floor. Every single rep.',
  'Quality first. Speed is something you earn.',
  'Core locked. Hips do not sag.',
  'Same shape on the next one.',
  'Do not negotiate with the burn.',
  'Eyes just ahead of your hands.',
  'The floor is not a place to rest.',
  'Smooth is fast. Sloppy is just loud.',
  'Load the crouch, then launch.',
  'Long body at the bottom. Tight back.',
  'You came here to finish the set.',
  'Plant the hands and leave them there.',
  'One clean rep. Then another.',
]

export const FINISH_LINES = [
  'Session is in the book. That is how a day gets heavy.',
  'You finished what you started. Come back meaner.',
  'That is the work. No crowd required.',
  'Logged. Recover like you plan to return.',
  'The set ended. Your standard did not.',
  'You did not gift away the last reps. Remember that.',
  'Another one on the board. Stack them.',
  'Hard, and clean. That is the whole sport.',
  'Sweat is the receipt. Keep it.',
  'You showed up. Next time you show up sharper.',
]

export const NUDGE_COPY = {
  cold: 'The week is moving and the floor has not seen you.',
  pace: 'This week is behind the plan. One honest session closes the gap.',
  short: 'The weekly target is out of reach. Train today anyway.',
} as const

export function lineForSet(setIndex: number, reps: number) {
  const slot = setIndex * 3 + Math.floor(Math.max(reps - 1, 0) / 4)
  return SET_LINES[slot % SET_LINES.length]
}

export function lineForFinish(seed: number) {
  const index = Math.abs(seed) % FINISH_LINES.length
  return FINISH_LINES[index]
}
