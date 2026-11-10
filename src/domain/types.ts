export type Sex = 'male' | 'female'

export type EventFocus =
  | '800'
  | '1500'
  | '3000'
  | '5000'
  | '10000'
  | 'steeple'
  | 'half'
  | 'marathon'

export type PeriodPhase =
  | 'base'
  | 'build'
  | 'specific'
  | 'taper'
  | 'race'
  | 'recovery'

/** Daniels training zone */
export type PaceZone = 'E' | 'M' | 'T' | 'I' | 'R'

export type MethodId =
  | 'easy'
  | 'long'
  | 'marathonPace'
  | 'fartlek'
  | 'variable'
  | 'tempo'
  | 'threshold'
  | 'interval'
  | 'repetition'
  | 'sprint'

/** Observed physical weaknesses from training/competition */
export type WeaknessId =
  | 'ankle_foot'
  | 'calf_achilles'
  | 'quad'
  | 'hamstring'
  | 'glute_hip'
  | 'core'
  | 'single_leg'

export interface Athlete {
  id: string
  name: string
  sex?: Sex
  event: EventFocus
  /** Primary race PB in seconds */
  pbSeconds: number
  /** Marked weaknesses for conditioning modules */
  weaknesses?: WeaknessId[]
  notes?: string
  createdAt: string
}

export interface ConditioningItem {
  id: string
  exerciseId: string
  weaknessId: WeaknessId
  name: string
  sets: number
  reps: string
  cues: string
  note?: string
}

export interface ConditioningSession {
  id: string
  athleteId: string
  title: string
  date: string
  weaknessIds: WeaknessId[]
  items: ConditioningItem[]
  coachNote?: string
}

export interface MethodDef {
  id: MethodId
  name: string
  purpose: string
  zone: PaceZone
  defaultDistances: number[]
  defaultReps: number
  defaultSets: number
  /** Rest between reps as ratio of work time */
  restRatioByPhase: Record<PeriodPhase, number>
  /** Rest between outer sets as ratio of work time */
  setRestRatioByPhase: Record<PeriodPhase, number>
  continuous?: boolean
  /** Road-oriented method (shown preference for HM/marathon) */
  road?: boolean
}

export type RestMode = 'time' | 'jog'

/**
 * Nested structure: sets × (reps × distance)
 * e.g. sets=3, reps=5, distanceM=400 → 3×(5×400m)
 */
export interface SessionBlock {
  id: string
  methodId: MethodId
  distanceM: number
  reps: number
  sets: number
  targetSeconds: number
  /** Between-rep rest: time (seconds) or jog distance */
  restMode: RestMode
  restSeconds: number
  restJogMeters: number
  setRestMode: RestMode
  setRestSeconds: number
  setRestJogMeters: number
  note?: string
}

export type VenueId = 'track' | 'road' | 'trail' | 'gym' | 'mixed'

export interface TrainingSession {
  id: string
  athleteId: string
  title: string
  phase: PeriodPhase
  date: string
  venue: VenueId
  /** Main session coaching focus (教案主课要点) */
  mainFocus: string
  warmupNote: string
  blocks: SessionBlock[]
  cooldownNote: string
  coachNote?: string
}

/** Post-session check-in / completion log */
export interface SessionLog {
  id: string
  kind: 'run' | 'conditioning'
  refId: string
  athleteId: string
  completed: boolean
  /** e.g. "完成 5/6 组" or free text */
  doneSummary: string
  /** Actual times / notes */
  actualNote?: string
  /** Rate of Perceived Exertion 1–10 */
  rpe?: number
  loggedAt: string
}

export interface WeekPlan {
  id: string
  athleteId: string
  weekStart: string
  phase: PeriodPhase
  sessionIds: string[]
  /** Conditioning / S&C sessions */
  conditioningIds: string[]
  focus: string
}

export interface LoadHint {
  level: 'ok' | 'watch' | 'high'
  text: string
}
