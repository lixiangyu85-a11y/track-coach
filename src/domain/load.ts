import { getMethod } from './catalog'
import {
  detectConditioningConflicts,
  detectHighIntensityConflicts,
} from './conflicts'
import { addDaysISO } from './dates'
import { sessionVolumeMeters } from './paces'
import { zonePaces } from './vdot'
import type {
  ConditioningSession,
  LoadHint,
  PeriodPhase,
  TrainingSession,
  WeekPlan,
} from './types'

const HIGH_ZONES = new Set(['I', 'R'])
/** Quality work: marathon-pace, threshold, interval, repetition (not easy/long). */
const QUALITY_ZONES = new Set(['M', 'T', 'I', 'R'])

export function isQualitySession(session: TrainingSession): boolean {
  return session.blocks.some((b) => QUALITY_ZONES.has(getMethod(b.methodId).zone))
}

export function qualityVolumeMeters(session: TrainingSession): number {
  return session.blocks
    .filter((b) => QUALITY_ZONES.has(getMethod(b.methodId).zone))
    .reduce((sum, b) => sum + b.distanceM * b.reps * (b.sets ?? 1), 0)
}

/** Daniels suggested share of weekly volume (vtrain / Daniels Running Formula). */
export const DANIELS_WEEKLY_SHARE: Record<'T' | 'I' | 'R', number> = {
  T: 0.1,
  I: 0.08,
  R: 0.05,
}

const MAX_I_REP_METERS = 1200
const MAX_I_REP_SECONDS = 5 * 60
const WEEK_JUMP = 0.1
const LONG_RUN_JUMP_KM = 3
const DELOAD_AFTER_WEEKS = 3

export function totalWeekKm(sessions: TrainingSession[]): number {
  return sessions.reduce((sum, s) => sum + sessionVolumeMeters(s.blocks), 0) / 1000
}

export function longestSessionKm(sessions: TrainingSession[]): number {
  if (sessions.length === 0) return 0
  return Math.max(
    ...sessions.map((s) => sessionVolumeMeters(s.blocks) / 1000),
  )
}

function zoneVolumeKm(
  sessions: TrainingSession[],
  zones: Set<string>,
): number {
  let meters = 0
  for (const session of sessions) {
    for (const b of session.blocks) {
      if (zones.has(getMethod(b.methodId).zone)) {
        meters += b.distanceM * b.reps * (b.sets ?? 1)
      }
    }
  }
  return meters / 1000
}

const DELOAD_PHASES = new Set<PeriodPhase>(['recovery', 'taper', 'race'])

/** Consecutive base/build/specific weeks ending at weekStart (current included). */
export function weeksSinceRecovery(
  weeks: WeekPlan[],
  athleteId: string,
  weekStart: string,
  currentPhase: PeriodPhase,
): number {
  if (DELOAD_PHASES.has(currentPhase)) return 0
  let n = 1
  let start = addDaysISO(weekStart, -7)
  for (let i = 0; i < 20; i += 1) {
    const w = weeks.find(
      (x) => x.athleteId === athleteId && x.weekStart === start,
    )
    if (!w || DELOAD_PHASES.has(w.phase)) break
    n += 1
    start = addDaysISO(start, -7)
  }
  return n
}


export interface PhaseCaps {
  label: string
  maxQualitySessions: number
  maxHighSessions: number
  maxQualityKm: number
}

export interface WeekLoadSummary {
  sessionCount: number
  qualitySessions: number
  totalKm: number
  qualityKm: number
  highIntensitySessions: number
  highIntensityKm: number
  hints: LoadHint[]
}

/** Base caps by period phase. */
export function phaseCaps(phase: PeriodPhase): PhaseCaps {
  switch (phase) {
    case 'base':
      return {
        label: '基础期',
        maxQualitySessions: 3,
        maxHighSessions: 1,
        maxQualityKm: 12,
      }
    case 'build':
      return {
        label: '强化期',
        maxQualitySessions: 4,
        maxHighSessions: 2,
        maxQualityKm: 18,
      }
    case 'specific':
      return {
        label: '专项期',
        maxQualitySessions: 4,
        maxHighSessions: 2,
        maxQualityKm: 16,
      }
    case 'taper':
      return {
        label: '赛前',
        maxQualitySessions: 3,
        maxHighSessions: 2,
        maxQualityKm: 10,
      }
    case 'race':
      return {
        label: '比赛周',
        maxQualitySessions: 2,
        maxHighSessions: 1,
        maxQualityKm: 6,
      }
    case 'recovery':
      return {
        label: '恢复期',
        maxQualitySessions: 2,
        maxHighSessions: 0,
        maxQualityKm: 8,
      }
  }
}

/**
 * Scale caps by VDOT: higher fitness → slightly higher volume allowance.
 * vdot ~30–40 beginner, ~50 intermediate, ~60+ advanced.
 */
export function scaleCapsForVdot(caps: PhaseCaps, vdot: number): PhaseCaps {
  if (!vdot || vdot <= 0) return caps
  let factor = 1
  if (vdot < 40) factor = 0.85
  else if (vdot < 50) factor = 1
  else if (vdot < 60) factor = 1.1
  else factor = 1.2
  return {
    ...caps,
    maxQualityKm: Math.round(caps.maxQualityKm * factor * 10) / 10,
    maxQualitySessions:
      factor >= 1.15
        ? caps.maxQualitySessions + 1
        : caps.maxQualitySessions,
  }
}

export function analyzeWeekLoad(
  sessions: TrainingSession[],
  phase: PeriodPhase,
  options?: {
    vdot?: number
    conditioning?: ConditioningSession[]
    previousWeekKm?: number
    previousLongRunKm?: number
    weeksSinceRecovery?: number
  },
): WeekLoadSummary {
  const sessionCount = sessions.length
  const qualitySessions = sessions.filter(isQualitySession).length
  const totalKm =
    sessions.reduce((s, x) => s + sessionVolumeMeters(x.blocks), 0) / 1000
  const qualityKm =
    sessions.reduce((s, x) => s + qualityVolumeMeters(x), 0) / 1000
  const easyKm = Math.max(0, totalKm - qualityKm)

  let highIntensitySessions = 0
  let highIntensityKm = 0

  for (const session of sessions) {
    const hasHigh = session.blocks.some((b) =>
      HIGH_ZONES.has(getMethod(b.methodId).zone),
    )
    if (hasHigh) {
      highIntensitySessions += 1
      highIntensityKm +=
        session.blocks
          .filter((b) => HIGH_ZONES.has(getMethod(b.methodId).zone))
          .reduce((s, b) => s + b.distanceM * b.reps * (b.sets ?? 1), 0) / 1000
    }
  }

  const hints: LoadHint[] = []
  const caps = scaleCapsForVdot(phaseCaps(phase), options?.vdot ?? 0)

  if (sessionCount === 0) {
    hints.push({ level: 'ok', text: '本周尚未挂课时' })
  } else {
    hints.push({
      level: 'ok',
      text:
        `跑课 ${sessionCount} 次（质量课 ${qualitySessions} 次）· 质量 ${qualityKm.toFixed(1)} km · 有氧 ${easyKm.toFixed(1)} km · 高强 ${highIntensityKm.toFixed(1)} km` +
        (options?.vdot ? ` · VDOT ${options.vdot.toFixed(1)}` : ''),
    })
  }

  if (qualitySessions > caps.maxQualitySessions) {
    hints.push({
      level: 'high',
      text: `${caps.label}建议质量课 ≤${caps.maxQualitySessions} 次，当前 ${qualitySessions} 次`,
    })
  } else if (qualitySessions === caps.maxQualitySessions) {
    hints.push({
      level: 'watch',
      text: `质量课次数已到 ${caps.label}建议上限（${caps.maxQualitySessions}）`,
    })
  }

  if (highIntensitySessions > caps.maxHighSessions) {
    hints.push({
      level: 'high',
      text: `高强课（I/R）建议 ≤${caps.maxHighSessions} 次，当前 ${highIntensitySessions} 次`,
    })
  }

  if (qualityKm > caps.maxQualityKm) {
    hints.push({
      level: 'high',
      text: `质量课距离建议 ≤${caps.maxQualityKm} km，当前 ${qualityKm.toFixed(1)} km`,
    })
  } else if (qualityKm > caps.maxQualityKm * 0.85) {
    hints.push({
      level: 'watch',
      text: `质量课距离接近 ${caps.label}建议上限（${caps.maxQualityKm} km）`,
    })
  }

  const tKm = zoneVolumeKm(sessions, new Set(['T']))
  const iKm = zoneVolumeKm(sessions, new Set(['I']))
  const rKm = zoneVolumeKm(sessions, new Set(['R']))
  if (totalKm > 0) {
    const shares: Array<['T' | 'I' | 'R', number]> = [
      ['T', tKm],
      ['I', iKm],
      ['R', rKm],
    ]
    for (const [zone, km] of shares) {
      const cap = DANIELS_WEEKLY_SHARE[zone]
      const share = km / totalKm
      if (km <= 0 || share <= cap + 1e-6) continue
      hints.push({
        level: share > cap * 1.2 ? 'high' : 'watch',
        text: `${zone} 课 ${km.toFixed(1)} km，约占本周跑量的 ${Math.round(share * 100)}%，Daniels 建议不超过 ${Math.round(cap * 100)}%`,
      })
    }
  }

  const vdot = options?.vdot ?? 0
  const iSecPerMeter =
    vdot > 0 ? zonePaces(vdot, 'I').midSecPerKm / 1000 : 0
  const seenIRep = new Set<string>()
  for (const session of sessions) {
    for (const b of session.blocks) {
      if (getMethod(b.methodId).zone !== 'I') continue
      const repSec = b.targetSeconds || (iSecPerMeter > 0 ? b.distanceM * iSecPerMeter : 0)
      if (b.distanceM <= MAX_I_REP_METERS && !(repSec > MAX_I_REP_SECONDS)) continue
      const key = `${b.distanceM}-${Math.round(repSec)}`
      if (seenIRep.has(key)) continue
      seenIRep.add(key)
      const bits = [`单次间歇 ${b.distanceM}m`]
      if (repSec > 0) bits.push(`约 ${Math.round(repSec / 60)} 分钟`)
      hints.push({
        level: 'watch',
        text: `${bits.join('，')}，超过 Daniels 建议的单次 I 课上限（约 1.2 km 或 5 分钟）`,
      })
    }
  }

  const prevKm = options?.previousWeekKm
  if (prevKm != null && prevKm >= 8 && totalKm > prevKm * (1 + WEEK_JUMP) + 0.05) {
    const pct = Math.round(((totalKm - prevKm) / prevKm) * 100)
    hints.push({
      level: pct >= 20 ? 'high' : 'watch',
      text: `本周计划 ${totalKm.toFixed(1)} km，较上周 ${prevKm.toFixed(1)} km 增加了 ${pct}%，建议把周跑量增幅控制在约 10% 以内`,
    })
  }

  const longKm = longestSessionKm(sessions)
  const prevLong = options?.previousLongRunKm
  if (
    prevLong != null &&
    prevLong >= 8 &&
    longKm > prevLong + LONG_RUN_JUMP_KM + 0.05
  ) {
    hints.push({
      level: 'watch',
      text: `本周最长一次跑 ${longKm.toFixed(1)} km，较上周最长 ${prevLong.toFixed(1)} km 多了 ${(longKm - prevLong).toFixed(1)} km，建议单次长距离增幅不超过约 3 km`,
    })
  }

  const streak = options?.weeksSinceRecovery
  if (
    streak != null &&
    streak >= DELOAD_AFTER_WEEKS &&
    !DELOAD_PHASES.has(phase)
  ) {
    hints.push({
      level: streak >= 4 ? 'high' : 'watch',
      text:
        streak >= 4
          ? `已连续 ${streak} 周未减载，建议本周降低质量课或安排恢复周`
          : `已连续 ${streak} 周基础/强化，可考虑安排减载周`,
    })
  }

  hints.push(...detectHighIntensityConflicts(sessions))
  if (options?.conditioning?.length) {
    hints.push(...detectConditioningConflicts(sessions, options.conditioning))
  }

  return {
    sessionCount,
    qualitySessions,
    totalKm,
    qualityKm,
    highIntensitySessions,
    highIntensityKm,
    hints,
  }
}
