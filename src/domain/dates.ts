/** Calendar dates as YYYY-MM-DD in the user's local timezone (not UTC). */

export function localISODate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return localISODate()
}

/** Monday-start week, using the local calendar date. */
export function startOfWeekISO(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return localISODate(x)
}

export function addDaysISO(isoDate: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return isoDate
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days)
  return localISODate(dt)
}
