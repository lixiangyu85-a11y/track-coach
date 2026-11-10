import { todayISO } from '../domain/dates'
import type {
  Athlete,
  ConditioningSession,
  SessionBlock,
  SessionLog,
  TrainingSession,
  WeekPlan,
} from '../domain/types'

export const STORAGE_KEY = 'track-coach:v2'
const LEGACY_KEY = 'track-coach:v1'
export const STORAGE_VERSION = 2

export interface AppState {
  athletes: Athlete[]
  sessions: TrainingSession[]
  conditioning: ConditioningSession[]
  weeks: WeekPlan[]
  logs: SessionLog[]
  activeAthleteId: string | null
}

export interface PersistedEnvelope {
  version: number
  savedAt: string
  state: AppState
}

const empty: AppState = {
  athletes: [],
  sessions: [],
  conditioning: [],
  weeks: [],
  logs: [],
  activeAthleteId: null,
}

function normalizeBlock(b: SessionBlock): SessionBlock {
  return {
    ...b,
    sets: b.sets ?? 1,
    restMode: b.restMode ?? 'time',
    restSeconds: b.restSeconds ?? 0,
    restJogMeters: b.restJogMeters ?? 0,
    setRestMode: b.setRestMode ?? 'time',
    setRestSeconds: b.setRestSeconds ?? 0,
    setRestJogMeters: b.setRestJogMeters ?? 0,
  }
}

function normalizeSession(s: TrainingSession): TrainingSession {
  return {
    ...s,
    venue: s.venue ?? 'track',
    mainFocus: s.mainFocus ?? '',
    blocks: (s.blocks ?? []).map(normalizeBlock),
  }
}

function normalizeWeek(w: WeekPlan): WeekPlan {
  return {
    ...w,
    sessionIds: w.sessionIds ?? [],
    conditioningIds: w.conditioningIds ?? [],
  }
}

function normalizeAthlete(a: Athlete): Athlete {
  return {
    ...a,
    weaknesses: a.weaknesses ?? [],
    sex: a.sex === 'male' || a.sex === 'female' ? a.sex : undefined,
  }
}

function normalizeState(parsed: Partial<AppState>): AppState {
  return {
    athletes: (parsed.athletes ?? []).map(normalizeAthlete),
    sessions: (parsed.sessions ?? []).map(normalizeSession),
    conditioning: parsed.conditioning ?? [],
    weeks: (parsed.weeks ?? []).map(normalizeWeek),
    logs: parsed.logs ?? [],
    activeAthleteId: parsed.activeAthleteId ?? null,
  }
}

export function loadState(): AppState {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY)
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as PersistedEnvelope | Partial<AppState>
      if (parsed && typeof parsed === 'object' && 'state' in parsed && (parsed as PersistedEnvelope).state) {
        return normalizeState((parsed as PersistedEnvelope).state)
      }
      return normalizeState(parsed as Partial<AppState>)
    }
    const rawV1 = localStorage.getItem(LEGACY_KEY)
    if (!rawV1) return { ...empty }
    const migrated = normalizeState(JSON.parse(rawV1) as Partial<AppState>)
    saveState(migrated)
    localStorage.removeItem(LEGACY_KEY)
    return migrated
  } catch {
    return { ...empty }
  }
}

export function saveState(state: AppState): void {
  const envelope: PersistedEnvelope = {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
}

export function exportStateJson(state: AppState): string {
  const envelope: PersistedEnvelope = {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  }
  return JSON.stringify(envelope, null, 2)
}

export function parseImportJson(raw: string): AppState {
  const parsed = JSON.parse(raw) as PersistedEnvelope | Partial<AppState>
  if (parsed && typeof parsed === 'object' && 'state' in parsed && (parsed as PersistedEnvelope).state) {
    return normalizeState((parsed as PersistedEnvelope).state)
  }
  return normalizeState(parsed as Partial<AppState>)
}

export function downloadBackup(state: AppState, filename?: string): void {
  const blob = new Blob([exportStateJson(state)], {
    type: 'application/json;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download =
    filename ??
    `track-coach-backup-${todayISO()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
