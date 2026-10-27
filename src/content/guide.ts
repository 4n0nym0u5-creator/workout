import type { PlanStageId, VariationId } from '../lib/types'

export const GOAL_REPS = 250

export const TEMPO_OPTIONS = [1500, 1750, 2000, 3000] as const

export const REST_OPTIONS = [45, 60, 75, 90] as const

export type PlanOption = {
  id: string
  sets: number
  reps: number
  label: string
}

export type PlanStage = {
  id: PlanStageId
  name: string
  weeks: string
  blurb: string
  setsLabel: string
  totalLabel: string
  daysLabel: string
  daysPerWeek: number
  defaultOptionId: string
  options: PlanOption[]
}

export const PLAN: PlanStage[] = [
  {
    id: 'learn',
    name: 'Learn it',
    weeks: 'Weeks 1–2',
    blurb: 'Slow and controlled. Learn the shape before you chase speed.',
    setsLabel: '5 × 6–8',
    totalLabel: '30–40',
    daysLabel: '3 days · Mon / Wed / Fri',
    daysPerWeek: 3,
    defaultOptionId: 'learn-8',
    options: [
      { id: 'learn-6', sets: 5, reps: 6, label: '5 × 6' },
      { id: 'learn-7', sets: 5, reps: 7, label: '5 × 7' },
      { id: 'learn-8', sets: 5, reps: 8, label: '5 × 8' },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    weeks: 'Weeks 3–4',
    blurb: 'Add a set and let the rhythm settle.',
    setsLabel: '6 × 10',
    totalLabel: '60',
    daysLabel: '3–4 days',
    daysPerWeek: 3,
    defaultOptionId: 'build-10',
    options: [{ id: 'build-10', sets: 6, reps: 10, label: '6 × 10' }],
  },
  {
    id: 'speed',
    name: 'Speed up',
    weeks: 'Weeks 5–6',
    blurb: 'Same clean shape, less time between reps.',
    setsLabel: '5 × 20',
    totalLabel: '100',
    daysLabel: '4 days',
    daysPerWeek: 4,
    defaultOptionId: 'speed-20',
    options: [{ id: 'speed-20', sets: 5, reps: 20, label: '5 × 20' }],
  },
  {
    id: 'volume',
    name: 'Volume',
    weeks: 'Weeks 7–8',
    blurb: 'The work gets long. Form still leads.',
    setsLabel: '6 × 25',
    totalLabel: '150',
    daysLabel: '4–5 days',
    daysPerWeek: 4,
    defaultOptionId: 'volume-25',
    options: [{ id: 'volume-25', sets: 6, reps: 25, label: '6 × 25' }],
  },
  {
    id: 'tyson',
    name: 'Tyson mode',
    weeks: 'Week 9+',
    blurb: '250 a day is the target, not the starting line. Keep two easy or rest days.',
    setsLabel: '10 × 25 or 5 × 50',
    totalLabel: '250',
    daysLabel: '5 days · 2 easy or rest',
    daysPerWeek: 5,
    defaultOptionId: 'tyson-10x25',
    options: [
      { id: 'tyson-10x25', sets: 10, reps: 25, label: '10 × 25' },
      { id: 'tyson-5x50', sets: 5, reps: 50, label: '5 × 50' },
    ],
  },
]

export type Variation = {
  id: VariationId
  name: string
  group: 'standard' | 'easier' | 'harder'
  detail: string
}

export const VARIATIONS: Variation[] = [
  {
    id: 'standard',
    group: 'standard',
    name: 'Standard',
    detail: 'Full squat-to-push-up on the floor. Hands planted. Feet braced so they do not slide.',
  },
  {
    id: 'incline',
    group: 'easier',
    name: 'Hands on a step',
    detail: 'Same flow with your hands on a step or couch, so less weight sits on your arms.',
  },
  {
    id: 'split',
    group: 'easier',
    name: 'Split it',
    detail: '5 push-ups, then 5 squat-thrusts back into the crouch.',
  },
  {
    id: 'knees',
    group: 'easier',
    name: 'Knees for the push-up',
    detail: 'Drop the knees for the push-up part only. They come back up to travel.',
  },
  {
    id: 'slow',
    group: 'easier',
    name: 'Slow tempo',
    detail: 'Fewer reps, three seconds each. Own the shape before you speed it up.',
  },
  {
    id: 'timed',
    group: 'harder',
    name: 'Timed rounds',
    detail: 'As many clean reps as possible in 60 seconds, five rounds.',
  },
  {
    id: 'pause',
    group: 'harder',
    name: 'Bottom pause',
    detail: 'Hold one second at the bottom before you snap back.',
  },
  {
    id: 'feet-up',
    group: 'harder',
    name: 'Feet elevated',
    detail: 'Feet on a low step. More load through the chest and shoulders.',
  },
  {
    id: 'combo',
    group: 'harder',
    name: 'Jump combo',
    detail: '10 reps plus 10 squat jumps, five rounds.',
  },
]

export const FORM_CUES = [
  { title: 'Keep it flowing', detail: 'No pause at the top or bottom. It should feel springy.' },
  { title: 'Hands do not move', detail: 'All the travel comes from your legs and hips.' },
  { title: 'Tight core', detail: 'Straight line from head to heels at the bottom.' },
  { title: 'Elbows at about 45°', detail: 'Not flared straight out to the sides.' },
  { title: 'Breathe', detail: 'In as you dive forward, out as you push back.' },
  {
    title: 'Feet',
    detail: 'Brace them against a wall or skirting board, or use a grippy mat so they do not slide.',
  },
]

export const MISTAKES = [
  'Hips sagging at the bottom. That loads the lower back.',
  'Only half the push-up. The chest never gets low.',
  'Rushing so fast that form falls apart. Quality first, speed second.',
  'Head dropping. Look slightly ahead of your hands.',
  'Knees slamming the floor. Knees stay off the ground the whole time.',
]

export const MUSCLES = ['Quads', 'Glutes', 'Chest', 'Shoulders', 'Triceps', 'Core', 'Upper back']

export const SAFETY = [
  'Warm up for 3–5 minutes first: arm circles, bodyweight squats, a few easy push-ups.',
  'Stop if you feel sharp pain in the wrists, shoulders, or lower back.',
  'Sore wrists? Do them on your fists or on push-up handles.',
  'Teens can do this, and should stay on the early stages with the focus on form.',
  'Anyone with shoulder, back, or wrist issues should check with a physio first.',
  'Only move up a stage when every rep in the current one looks clean. If you are sore for more than two days, repeat the stage.',
]

export function stageById(id: PlanStageId) {
  return PLAN.find((stage) => stage.id === id) ?? PLAN[0]
}

export function optionFor(stage: PlanStage, optionId: string) {
  return (
    stage.options.find((option) => option.id === optionId) ??
    stage.options.find((option) => option.id === stage.defaultOptionId) ??
    stage.options[0]
  )
}

export function nextStage(id: PlanStageId) {
  const index = PLAN.findIndex((stage) => stage.id === id)
  if (index < 0 || index >= PLAN.length - 1) return null
  return PLAN[index + 1]
}

export function variationById(id: VariationId) {
  return VARIATIONS.find((item) => item.id === id) ?? VARIATIONS[0]
}
