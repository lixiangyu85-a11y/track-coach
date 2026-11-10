import { getMethod } from './catalog'
import type { ConditioningSession, LoadHint, TrainingSession } from './types'
import { addDaysISO } from './dates'

const HIGH = new Set(['I', 'R'])

export function isHighIntensitySession(session: TrainingSession): boolean {
  return session.blocks.some((b) => HIGH.has(getMethod(b.methodId).zone))
}

/** Detect I/R sessions less than 48h apart (by date string YYYY-MM-DD). */
export function detectHighIntensityConflicts(
  sessions: TrainingSession[],
): LoadHint[] {
  const highs = sessions
    .filter(isHighIntensitySession)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const hints: LoadHint[] = []
  for (let i = 1; i < highs.length; i++) {
    const prev = highs[i - 1]
    const cur = highs[i]
    const gap =
      (new Date(cur.date + 'T12:00:00').getTime() -
        new Date(prev.date + 'T12:00:00').getTime()) /
      36e5
    if (gap < 48) {
      hints.push({
        level: 'high',
        text: `高强课间隔仅 ${gap.toFixed(0)}h：${prev.date}「${prev.title}」与 ${cur.date}「${cur.title}」建议至少间隔 48h`,
      })
    }
  }
  return hints
}

/** Soft warning: heavy conditioning same day or day after I/R. */
export function detectConditioningConflicts(
  runs: TrainingSession[],
  conds: ConditioningSession[],
): LoadHint[] {
  const hints: LoadHint[] = []
  const highDates = new Set(
    runs.filter(isHighIntensitySession).map((s) => s.date),
  )
  for (const c of conds) {
    if (highDates.has(c.date)) {
      hints.push({
        level: 'watch',
        text: `${c.date} 素质课「${c.title}」与同日高强跑课重叠，注意下肢负荷`,
      })
    }
  }
  return hints
}

export function weekDayDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i))
}

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
