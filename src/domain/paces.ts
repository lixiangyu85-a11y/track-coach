import { EVENT_OPTIONS, getMethod, isRoadEvent } from './catalog'
import type { EventFocus } from './types'
import { allZonePaces, vdotFromRace } from './vdot'
import type {
  Athlete,
  MethodId,
  PeriodPhase,
  SessionBlock,
} from './types'

export function athleteVdot(athlete: Athlete): number {
  const event = EVENT_OPTIONS.find((e) => e.id === athlete.event)
  const meters = event?.meters ?? 1500
  return vdotFromRace(meters, athlete.pbSeconds)
}

export function racePaceSecPerMeter(athlete: Athlete): number {
  const event = EVENT_OPTIONS.find((e) => e.id === athlete.event)
  const meters = event?.meters ?? 1500
  return athlete.pbSeconds / meters
}

export function intensityBandTimes(
  athlete: Athlete,
  methodId: MethodId,
  distanceM: number,
  phase: PeriodPhase,
): { minSec: number; maxSec: number; midSec: number; zone: string; vdot: number } {
  const method = getMethod(methodId)
  const vdot = athleteVdot(athlete)
  const zones = allZonePaces(vdot, phase)
  const zp = zones[method.zone]
  const minSec = Math.round((zp.minSecPerKm / 1000) * distanceM)
  const maxSec = Math.round((zp.maxSecPerKm / 1000) * distanceM)
  const midSec = Math.round((minSec + maxSec) / 2)
  return { minSec, maxSec, midSec, zone: method.zone, vdot }
}

/** Common jog-rest distances on track (prefer ≤ work distance) */
export function defaultJogRestMeters(distanceM: number): number {
  if (distanceM <= 200) return 200
  if (distanceM <= 400) return 200
  if (distanceM <= 600) return 200
  if (distanceM <= 800) return 400
  return 400
}

export function formatRest(
  mode: SessionBlock['restMode'] | undefined,
  seconds: number,
  jogMeters: number,
): string {
  const m = mode ?? 'time'
  if (m === 'jog') {
    if (!jogMeters) return '连续'
    return `慢跑 ${jogMeters}m`
  }
  if (!seconds) return '连续'
  return formatTime(seconds)
}

export function suggestBlock(
  athlete: Athlete,
  methodId: MethodId,
  distanceM: number,
  phase: PeriodPhase,
  reps?: number,
  sets?: number,
): Omit<SessionBlock, 'id'> {
  const method = getMethod(methodId)
  const band = intensityBandTimes(athlete, methodId, distanceM, phase)
  const targetSeconds = band.midSec
  const restSeconds = method.continuous
    ? 0
    : Math.round(targetSeconds * method.restRatioByPhase[phase])
  const setCount = sets ?? method.defaultSets
  const setRestSeconds =
    method.continuous || setCount <= 1
      ? 0
      : Math.round(targetSeconds * method.setRestRatioByPhase[phase])
  const jog = method.continuous ? 0 : defaultJogRestMeters(distanceM)

  return {
    methodId,
    distanceM,
    reps: reps ?? method.defaultReps,
    sets: setCount,
    targetSeconds,
    restMode: 'time',
    restSeconds,
    restJogMeters: jog,
    setRestMode: 'time',
    setRestSeconds,
    setRestJogMeters: jog > 0 ? Math.max(jog, 200) : 0,
  }
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—'
  let remaining = totalSeconds
  let h = Math.floor(remaining / 3600)
  remaining -= h * 3600
  let m = Math.floor(remaining / 60)
  remaining -= m * 60
  let hundredths = Math.round(remaining * 100)
  let whole = Math.floor(hundredths / 100)
  hundredths -= whole * 100
  if (whole >= 60) {
    whole -= 60
    m += 1
  }
  if (m >= 60) {
    m -= 60
    h += 1
  }
  const ss = whole.toString().padStart(2, '0')
  const frac = hundredths > 0 ? hundredths.toString().padStart(2, '0') : ''
  if (h > 0) {
    const mm = m.toString().padStart(2, '0')
    return frac ? `${h}:${mm}:${ss}.${frac}` : `${h}:${mm}:${ss}`
  }
  if (m === 0) {
    return frac ? `${whole}"${frac}` : `${whole}"`
  }
  return frac ? `${m}'${ss}"${frac}` : `${m}'${ss}"`
}

export function formatPacePerKmFromSec(secPerKm: number): string {
  return `${formatTime(secPerKm)}/km`
}

export function formatPacePerKm(secPerMeter: number): string {
  return formatPacePerKmFromSec(secPerMeter * 1000)
}

/**
 * Parse race times:
 * - 106 / 1:46 / 1：46.34
 * - Track 3-part with a<=1 → hundredths (1:46:34)
 * - Road / a>=2 → h:mm:ss (3:15:00, 1:22:30)
 */
export function parseTimeInput(
  raw: string,
  opts?: { event?: EventFocus },
): number | null {
  let t = raw.trim()
  if (!t) return null

  t = t
    .replace(/：/g, ':')
    .replace(/[＇']/g, "'")
    .replace(/[＂″"]/g, '"')
    .replace(/\s+/g, '')
    .replace(/分/g, ':')
    .replace(/秒/g, '')

  if (/^\d+(\.\d+)?$/.test(t)) return Number(t)

  const two = t.match(/^(\d+)[:'](\d{1,2}(?:\.\d+)?)"?$/)
  if (two) {
    const minutes = Number(two[1])
    const seconds = Number(two[2])
    if (seconds >= 60) return null
    // 125:30 style unlikely; 3:15 for marathon partial — treat as m:ss if minutes < 60,
    // else as hours wrongly... For marathon often 3:15:00 three-part.
    // If minutes >= 60 interpret as h:mm? rare. Keep m:ss / for long: if minutes>30 and no event road, still m:ss (30:00 10k)
    return minutes * 60 + seconds
  }

  const three = t.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/)
  if (three) {
    const a = Number(three[1])
    const b = Number(three[2])
    const c = Number(three[3])
    if (b >= 60) return null
    const road = isRoadEvent(opts?.event) || opts?.event === '10000'
    if (a >= 2 || road) {
      if (c >= 60) return null
      return a * 3600 + b * 60 + c
    }
    // Track: treat third as hundredths
    return a * 60 + b + c / 100
  }

  return null
}

export function blockLabel(block: SessionBlock): string {
  const d =
    block.distanceM >= 1000
      ? `${(block.distanceM / 1000).toFixed(block.distanceM % 1000 === 0 ? 0 : 2)}km`
      : `${block.distanceM}m`
  if ((block.sets ?? 1) > 1) return `${block.sets}×(${block.reps}×${d})`
  return `${block.reps}×${d}`
}

export function blockVolumeMeters(block: SessionBlock): number {
  return block.distanceM * block.reps * (block.sets ?? 1)
}

export function sessionVolumeMeters(blocks: SessionBlock[]): number {
  return blocks.reduce((sum, b) => sum + blockVolumeMeters(b), 0)
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}
