export type PlanStageId = 'learn' | 'build' | 'speed' | 'volume' | 'tyson'

export type VariationId =
  | 'standard'
  | 'incline'
  | 'split'
  | 'knees'
  | 'slow'
  | 'timed'
  | 'pause'
  | 'feet-up'
  | 'combo'

export type CountMode = 'log' | 'total' | 'sets' | 'tap' | 'tempo'

export type Difficulty = 'easy' | 'solid' | 'hard'

export type SetLog = {
  target: number
  completed: number
}

export type Session = {
  id: string
  date: string
  completedAt: string
  stageId: PlanStageId | 'custom'
  stageLabel: string
  optionLabel: string
  sets: SetLog[]
  totalReps: number
  restSeconds: number
  tempoMs: number | null
  countMode: CountMode
  variation: VariationId
  durationSec: number
  notes: string
  difficulty: Difficulty | null
}

export type WorkoutPlan = {
  stageId: PlanStageId | 'custom'
  stageLabel: string
  optionLabel: string
  sets: number
  reps: number
  restSeconds: number
  tempoMs: number
  countMode: CountMode
  variation: VariationId
  sound: boolean
  haptics: boolean
}

export type Settings = {
  stageId: PlanStageId
  optionId: string
  restSeconds: number
  tempoMs: number
  sound: boolean
  haptics: boolean
  variation: VariationId
  countMode: CountMode
  customSets: number
  customReps: number
  stepUpSnooze: Partial<Record<PlanStageId, number>>
  nudgeSnoozeDate: string | null
}

export const STORAGE_KEY = 'tyson-pushup-v1'

export const DEFAULT_SETTINGS: Settings = {
  stageId: 'learn',
  optionId: 'learn-8',
  restSeconds: 60,
  tempoMs: 1750,
  sound: true,
  haptics: true,
  variation: 'standard',
  countMode: 'log',
  customSets: 5,
  customReps: 8,
  stepUpSnooze: {},
  nudgeSnoozeDate: null,
}
