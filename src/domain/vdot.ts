/**
 * Jack Daniels VDOT (oxygen-cost model) — race result → training paces.
 * Equations from Daniels & Gilbert running formula implementations.
 */

import { EVENT_OPTIONS } from './catalog'
import type { EventFocus, PaceZone } from './types'
export type { PaceZone }

/** %VDOT bands used for each training zone */
export const ZONE_PERCENT: Record<PaceZone, { min: number; max: number }> = {
  E: { min: 59, max: 74 },
  M: { min: 75, max: 84 },
  T: { min: 83, max: 88 },
  I: { min: 95, max: 100 },
  R: { min: 105, max: 110 },
}

/** Phase nudge on zone % (negative = a bit easier / slower) */
export const PHASE_ZONE_SHIFT: Record<
  string,
  Record<PaceZone, number>
> = {
  base: { E: -2, M: -2, T: -2, I: -3, R: -3 },
  build: { E: 0, M: 0, T: 0, I: -1, R: -1 },
  specific: { E: 0, M: 1, T: 1, I: 1, R: 1 },
  taper: { E: -1, M: 0, T: 0, I: 0, R: 0 },
  race: { E: -2, M: -1, T: -1, I: -1, R: -1 },
  recovery: { E: -4, M: -4, T: -4, I: -5, R: -5 },
}

export function vdotFromRace(distanceM: number, timeSec: number): number {
  if (distanceM <= 0 || timeSec <= 0) return 0
  const tMin = timeSec / 60
  const v = distanceM / tMin // m/min
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v
  const pct =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMin) +
    0.2989558 * Math.exp(-0.1932605 * tMin)
  return vo2 / pct
}

/** Velocity in m/min at a given % of VDOT */
export function velocityAtPercent(vdot: number, percent: number): number {
  const demand = (percent / 100) * vdot
  const a = 0.000104
  const b = 0.182258
  const c = -4.6 - demand
  const disc = b * b - 4 * a * c
  if (disc < 0) return 0
  return (-b + Math.sqrt(disc)) / (2 * a)
}

/** Seconds per meter at %VDOT */
export function secPerMeterAtPercent(vdot: number, percent: number): number {
  const v = velocityAtPercent(vdot, percent) // m/min
  if (v <= 0) return 0
  return 60 / v
}

export function paceSecPerKm(vdot: number, percent: number): number {
  return secPerMeterAtPercent(vdot, percent) * 1000
}

export interface ZonePaces {
  zone: PaceZone
  minSecPerKm: number
  maxSecPerKm: number
  midSecPerKm: number
}

export function zonePaces(vdot: number, zone: PaceZone, phaseShift = 0): ZonePaces {
  const band = ZONE_PERCENT[zone]
  const minPct = band.min + phaseShift
  const maxPct = band.max + phaseShift
  // Higher % = faster = lower sec/km
  const maxSecPerKm = paceSecPerKm(vdot, minPct)
  const minSecPerKm = paceSecPerKm(vdot, maxPct)
  return {
    zone,
    minSecPerKm,
    maxSecPerKm,
    midSecPerKm: (minSecPerKm + maxSecPerKm) / 2,
  }
}

export function allZonePaces(
  vdot: number,
  phase = 'build',
): Record<PaceZone, ZonePaces> {
  const shifts = PHASE_ZONE_SHIFT[phase] ?? PHASE_ZONE_SHIFT.build
  return {
    E: zonePaces(vdot, 'E', shifts.E),
    M: zonePaces(vdot, 'M', shifts.M),
    T: zonePaces(vdot, 'T', shifts.T),
    I: zonePaces(vdot, 'I', shifts.I),
    R: zonePaces(vdot, 'R', shifts.R),
  }
}

/** Invert vdotFromRace: estimate finish time (seconds) for a distance at this VDOT. */
export function timeForDistanceFromVdot(
  vdot: number,
  distanceM: number,
): number | null {
  if (!(vdot > 0) || !(distanceM > 0)) return null
  let lo = Math.max(8, distanceM * 0.07)
  let hi = Math.max(lo + 1, distanceM * 0.9)
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2
    if (vdotFromRace(distanceM, mid) > vdot) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export interface EquivalentRaceTime {
  id: EventFocus
  label: string
  meters: number
  seconds: number
}

/** Standard track/road equivalents. Steeple is omitted (not a flat 3000m). */
export function equivalentRaceTimes(vdot: number): EquivalentRaceTime[] {
  if (!(vdot > 0)) return []
  const out: EquivalentRaceTime[] = []
  for (const ev of EVENT_OPTIONS) {
    if (ev.id === 'steeple') continue
    const seconds = timeForDistanceFromVdot(vdot, ev.meters)
    if (seconds == null) continue
    out.push({ id: ev.id, label: ev.label, meters: ev.meters, seconds })
  }
  return out
}
