import { useEffect, useMemo, useState } from 'react'
import { CheckInModal } from './CheckInModal'
import { DateInput } from './DateInput'
import { PHASE_OPTIONS, getMethod } from '../domain/catalog'
import { getWeaknessModule } from '../domain/conditioningCatalog'
import {
  conditioningToText,
  copyText,
  downloadText,
  printConditioningCard,
  printSessionCard,
  sessionToText,
  weekToText,
} from '../domain/exportText'
import {
  WEEKDAY_LABELS,
  isHighIntensitySession,
  weekDayDates,
} from '../domain/conflicts'
import {
  analyzeWeekLoad,
  longestSessionKm,
  totalWeekKm,
  weeksSinceRecovery,
} from '../domain/load'
import {
  athleteVdot,
  blockLabel,
  formatRest,
  formatTime,
  sessionVolumeMeters,
  uid,
} from '../domain/paces'
import { addDaysISO, startOfWeekISO, todayISO } from '../domain/dates'
import { CYCLE_TEMPLATES } from '../domain/templates'
import type {
  Athlete,
  ConditioningSession,
  PeriodPhase,
  SessionLog,
  TrainingSession,
  WeekPlan,
} from '../domain/types'

interface Props {
  athlete: Athlete | null
  sessions: TrainingSession[]
  conditioning: ConditioningSession[]
  weeks: WeekPlan[]
  logs: SessionLog[]
  onSaveWeek: (week: WeekPlan) => void
  onApplyWeeks: (weeks: WeekPlan[]) => void
  onDeleteSession: (id: string) => void
  onDeleteConditioning: (id: string) => void
  onEditSession: (session: TrainingSession) => void
  onEditConditioning: (session: ConditioningSession) => void
  onSaveLog: (log: SessionLog) => void
  onNotice?: (message: string) => void
}

type CalView = 'week' | 'month'

function estimateSessionMinutes(s: TrainingSession): number {
  let sec = 0
  for (const b of s.blocks) {
    const repsTotal = b.reps * (b.sets || 1)
    sec += b.targetSeconds * repsTotal
    if (b.restMode === 'time') {
      sec += b.restSeconds * Math.max(0, repsTotal - 1)
    } else {
      sec += (b.restJogMeters / 1000) * 270 * Math.max(0, repsTotal - 1)
    }
  }
  return Math.max(15, Math.round((sec + 1200) / 60))
}

function monthLabel(isoMonday: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoMonday)
  if (!m) return isoMonday
  return `${m[1]}年${Number(m[2])}月`
}

function startOfMonthISO(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[1]}-${m[2]}-01`
}

function daysInMonth(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return 30
  return new Date(Number(m[1]), Number(m[2]), 0).getDate()
}

function sessionStatus(
  kind: 'run' | 'conditioning',
  id: string,
  logs: SessionLog[],
  high?: boolean,
): 'done' | 'part' | 'far' | 'miss' | 'planned' {
  const log = logs.find((l) => l.kind === kind && l.refId === id)
  if (!log) return high ? 'far' : 'planned'
  if (log.completed) return 'done'
  if (log.doneSummary) return 'part'
  return 'miss'
}

export function WeekPlanner({
  athlete,
  sessions,
  conditioning,
  weeks,
  logs,
  onSaveWeek,
  onApplyWeeks,
  onDeleteSession,
  onDeleteConditioning,
  onEditSession,
  onEditConditioning,
  onSaveLog,
  onNotice,
}: Props) {
  const [weekStart, setWeekStart] = useState(startOfWeekISO)
  const [phase, setPhase] = useState<PeriodPhase>('build')
  const [focus, setFocus] = useState('专项耐力周')
  const [picked, setPicked] = useState<string[]>([])
  const [pickedCond, setPickedCond] = useState<string[]>([])
  const [cycleId, setCycleId] = useState(CYCLE_TEMPLATES[0].id)
  const [calView, setCalView] = useState<CalView>('week')
  const [checkIn, setCheckIn] = useState<{
    kind: 'run' | 'conditioning'
    refId: string
    title: string
  } | null>(null)

  function logFor(kind: 'run' | 'conditioning', refId: string) {
    return logs.find((l) => l.kind === kind && l.refId === refId) ?? null
  }

  const athleteSessions = useMemo(
    () =>
      athlete
        ? sessions
            .filter((s) => s.athleteId === athlete.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [athlete, sessions],
  )

  const athleteCond = useMemo(
    () =>
      athlete
        ? conditioning
            .filter((s) => s.athleteId === athlete.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [athlete, conditioning],
  )

  const currentWeek = useMemo(
    () =>
      athlete
        ? weeks.find((w) => w.athleteId === athlete.id && w.weekStart === weekStart)
        : undefined,
    [athlete, weeks, weekStart],
  )

  useEffect(() => {
    setPicked([])
    setPickedCond([])
    if (currentWeek) {
      setPhase(currentWeek.phase)
      setFocus(currentWeek.focus)
    } else {
      setPhase('build')
      setFocus('专项耐力周')
    }
  }, [athlete?.id, weekStart, currentWeek?.id, currentWeek?.phase, currentWeek?.focus])

  const selectedIds = picked.length ? picked : (currentWeek?.sessionIds ?? [])
  const selectedCondIds = pickedCond.length
    ? pickedCond
    : (currentWeek?.conditioningIds ?? [])

  const planned = selectedIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter(Boolean) as TrainingSession[]

  const plannedCond = selectedCondIds
    .map((id) => conditioning.find((s) => s.id === id))
    .filter(Boolean) as ConditioningSession[]

  const prevWeekRuns = useMemo(() => {
    const prevDates = weekDayDates(addDaysISO(weekStart, -7))
    return athleteSessions.filter((s) => prevDates.includes(s.date))
  }, [athleteSessions, weekStart])

  const load = useMemo(
    () =>
      analyzeWeekLoad(planned, phase, {
        vdot: athlete ? athleteVdot(athlete) : 0,
        conditioning: plannedCond,
        previousWeekKm: prevWeekRuns.length
          ? totalWeekKm(prevWeekRuns)
          : undefined,
        previousLongRunKm: prevWeekRuns.length
          ? longestSessionKm(prevWeekRuns)
          : undefined,
        weeksSinceRecovery: athlete
          ? weeksSinceRecovery(weeks, athlete.id, weekStart, phase)
          : undefined,
      }),
    [planned, plannedCond, phase, athlete, prevWeekRuns, weeks, weekStart],
  )

  const calendarDays = useMemo(() => {
    const dates = weekDayDates(weekStart)
    return dates.map((date, i) => ({
      date,
      label: WEEKDAY_LABELS[i],
      runs: planned.filter((s) => s.date === date),
      conds: plannedCond.filter((s) => s.date === date),
    }))
  }, [weekStart, planned, plannedCond])

  const today = todayISO()

  const doneRuns = planned.filter((s) => logFor('run', s.id)?.completed).length
  const doneCond = plannedCond.filter(
    (s) => logFor('conditioning', s.id)?.completed,
  ).length
  const plannedMinutes = planned.reduce(
    (sum, s) => sum + estimateSessionMinutes(s),
    0,
  )
  const doneMinutes = planned
    .filter((s) => logFor('run', s.id)?.completed)
    .reduce((sum, s) => sum + estimateSessionMinutes(s), 0)
  const plannedKm = totalWeekKm(planned)
  const doneKm = totalWeekKm(
    planned.filter((s) => logFor('run', s.id)?.completed),
  )
  const plannedLoad = planned.length + plannedCond.length
  const doneLoad = doneRuns + doneCond

  const monthCells = useMemo(() => {
    const monthStart = startOfMonthISO(weekStart)
    const firstMonday = startOfWeekISO(
      new Date(
        Number(monthStart.slice(0, 4)),
        Number(monthStart.slice(5, 7)) - 1,
        1,
      ),
    )
    const dim = daysInMonth(monthStart)
    const monthEnd = `${monthStart.slice(0, 8)}${String(dim).padStart(2, '0')}`
    const cells: {
      date: string
      outside: boolean
      runs: TrainingSession[]
      conds: ConditioningSession[]
    }[] = []
    for (let i = 0; i < 42; i += 1) {
      const date = addDaysISO(firstMonday, i)
      if (i >= 35 && date > monthEnd && date.slice(0, 7) !== monthStart.slice(0, 7)) {
        break
      }
      cells.push({
        date,
        outside: date.slice(0, 7) !== monthStart.slice(0, 7),
        runs: athleteSessions.filter((s) => s.date === date),
        conds: athleteCond.filter((s) => s.date === date),
      })
      if (date >= monthEnd && (i + 1) % 7 === 0) break
    }
    return cells
  }, [weekStart, athleteSessions, athleteCond])

  if (!athlete) {
    return (
      <div className="card">
        <p className="empty">请先选中运动员。</p>
      </div>
    )
  }

  function ensureRunPick(id: string) {
    if (picked.length === 0 && currentWeek) {
      setPicked(
        currentWeek.sessionIds.includes(id)
          ? currentWeek.sessionIds.filter((x) => x !== id)
          : [...currentWeek.sessionIds, id],
      )
    } else {
      setPicked((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      )
    }
  }

  function ensureCondPick(id: string) {
    if (pickedCond.length === 0 && currentWeek) {
      const cur = currentWeek.conditioningIds ?? []
      setPickedCond(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
    } else {
      setPickedCond((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      )
    }
  }

  function save() {
    if (!athlete) return
    onSaveWeek({
      id: currentWeek?.id ?? uid('week'),
      athleteId: athlete.id,
      weekStart,
      phase,
      sessionIds: selectedIds,
      conditioningIds: selectedCondIds,
      focus,
    })
    onNotice?.('周计划已保存')
  }

  async function exportWeek() {
    if (!athlete) return
    const week: WeekPlan = {
      id: currentWeek?.id ?? uid('week'),
      athleteId: athlete.id,
      weekStart,
      phase,
      sessionIds: selectedIds,
      conditioningIds: selectedCondIds,
      focus,
    }
    const text = weekToText(athlete, week, sessions, conditioning)
    try {
      await copyText(text)
      onNotice?.('周课表已复制到剪贴板')
    } catch {
      downloadText(`week-${weekStart}.txt`, text)
    }
  }

  function applyCycle() {
    if (!athlete) return
    const tpl = CYCLE_TEMPLATES.find((t) => t.id === cycleId)
    if (!tpl) return
    if (
      !confirm(
        `将从 ${weekStart} 起生成 ${tpl.weeks} 周骨架（阶段+主题+建议），覆盖同周已有周计划元数据？`,
      )
    ) {
      return
    }
    const generated: WeekPlan[] = tpl.skeleton.map((sk) => {
      const start = addDaysISO(weekStart, sk.weekIndex * 7)
      const existing = weeks.find(
        (w) => w.athleteId === athlete.id && w.weekStart === start,
      )
      const hint = [
        ...sk.runHints.map((h) => `跑：${h}`),
        ...sk.conditioningHints.map((h) => `素：${h}`),
      ].join('；')
      return {
        id: existing?.id ?? uid('week'),
        athleteId: athlete.id,
        weekStart: start,
        phase: sk.phase,
        focus: `${sk.focus}｜${hint}`,
        sessionIds: existing?.sessionIds ?? [],
        conditioningIds: existing?.conditioningIds ?? [],
      }
    })
    onApplyWeeks(generated)
    setPhase(tpl.skeleton[0].phase)
    setFocus(generated[0].focus)
    onNotice?.(`已生成 ${tpl.weeks} 周骨架，可再勾选具体课时填入`)
  }

  const cycle = CYCLE_TEMPLATES.find((t) => t.id === cycleId)

  function shiftWeek(dir: -1 | 1) {
    setWeekStart(addDaysISO(weekStart, dir * 7))
    setPicked([])
    setPickedCond([])
  }

  function shiftMonth(dir: -1 | 1) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStart)
    if (!m) return
    const dt = new Date(Number(m[1]), Number(m[2]) - 1 + dir, 1)
    setWeekStart(startOfWeekISO(dt))
    setPicked([])
    setPickedCond([])
  }

  return (
    <div className="stack-cards">
      <div>
        <div className="cal-toolbar">
          <div className="cal-title-row">
            <h1>
              {calView === 'week'
                ? `${monthLabel(weekStart)} 日历`
                : `${monthLabel(weekStart)} 月历`}
            </h1>
            <div className="cal-nav">
              <button
                type="button"
                className="icon-btn"
                aria-label="上一周期"
                onClick={() => (calView === 'week' ? shiftWeek(-1) : shiftMonth(-1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m14 6-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="ghost solid"
                onClick={() => {
                  setWeekStart(startOfWeekISO())
                  setPicked([])
                  setPickedCond([])
                }}
              >
                本周
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="下一周期"
                onClick={() => (calView === 'week' ? shiftWeek(1) : shiftMonth(1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m10 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="page-head-actions">
            <div className="segmented" role="group" aria-label="视图切换">
              <button
                type="button"
                className={calView === 'week' ? 'active' : undefined}
                onClick={() => setCalView('week')}
              >
                周
              </button>
              <button
                type="button"
                className={calView === 'month' ? 'active' : undefined}
                onClick={() => setCalView('month')}
              >
                月
              </button>
            </div>
            <button type="button" className="primary" onClick={save}>
              保存周计划
            </button>
          </div>
        </div>

        <div className="cal-legend" aria-label="图例">
          <span className="cal-legend-item">
            <span className="cal-dot done" /> 按计划完成
          </span>
          <span className="cal-legend-item">
            <span className="cal-dot part" /> 部分完成
          </span>
          <span className="cal-legend-item">
            <span className="cal-dot far" /> 偏离 / 高强度
          </span>
          <span className="cal-legend-item">
            <span className="cal-dot miss" /> 缺训
          </span>
          <span className="muted">
            {athlete.name} · 跑课 {load.totalKm.toFixed(1)} km · 素质{' '}
            {plannedCond.length} 次
          </span>
        </div>

        {calView === 'week' ? (
          <div className="week-calendar">
            {/* Mobile: vertical day list */}
            <div className="m-week-list mobile-only-block" aria-label="本周按天">
              <div className="m-week-summary-bar">
                <span>
                  完成 {doneMinutes}/{plannedMinutes} min
                </span>
                <span>
                  {doneKm.toFixed(1)}/{plannedKm.toFixed(1)} km
                </span>
                <span>
                  {doneLoad}/{plannedLoad} 课
                </span>
              </div>
              {calendarDays.map((day) => {
                const dayMin = day.runs.reduce(
                  (sum, s) => sum + estimateSessionMinutes(s),
                  0,
                )
                const dayDoneMin = day.runs
                  .filter((s) => logFor('run', s.id)?.completed)
                  .reduce((sum, s) => sum + estimateSessionMinutes(s), 0)
                return (
                  <section
                    key={day.date}
                    className={
                      day.date === today ? 'm-day-block is-today' : 'm-day-block'
                    }
                  >
                    <header className="m-day-head">
                      <h3 className={day.date === today ? 'is-today' : undefined}>
                        周{day.label} {day.date.slice(5)}
                      </h3>
                      <p>
                        {dayDoneMin}/{dayMin || 0} min · 跑 {day.runs.length} ·
                        素 {day.conds.length}
                      </p>
                    </header>
                    <div className="m-day-rule" aria-hidden="true" />
                    {day.runs.length === 0 && day.conds.length === 0 ? (
                      <p className="m-day-empty">休息 / 未排</p>
                    ) : (
                      <div className="m-day-sessions">
                        {day.runs.map((s) => {
                          const st = sessionStatus(
                            'run',
                            s.id,
                            logs,
                            isHighIntensitySession(s),
                          )
                          const km = (
                            sessionVolumeMeters(s.blocks) / 1000
                          ).toFixed(1)
                          const mins = estimateSessionMinutes(s)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`m-session-card run${st === 'done' ? ' done' : ''}${isHighIntensitySession(s) ? ' high' : ''}`}
                              onClick={() => onEditSession(s)}
                            >
                              <span className="m-session-title">{s.title}</span>
                              <span className="m-session-meta">
                                {mins}min · {km} km
                                {isHighIntensitySession(s) ? ' · 高强度' : ''}
                                {st === 'done' ? ' · 完成' : ''}
                                {st === 'part' ? ' · 部分' : ''}
                                {st === 'miss' ? ' · 缺训' : ''}
                              </span>
                            </button>
                          )
                        })}
                        {day.conds.map((s) => {
                          const st = sessionStatus('conditioning', s.id, logs)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`m-session-card cond${st === 'done' ? ' done' : ''}`}
                              onClick={() => onEditConditioning(s)}
                            >
                              <span className="m-session-title">{s.title}</span>
                              <span className="m-session-meta">
                                {s.items.length} 动作
                                {st === 'done' ? ' · 完成' : ''}
                                {st === 'part' ? ' · 部分' : ''}
                                {st === 'miss' ? ' · 缺训' : ''}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>

            {/* Desktop: 7-column grid + summary */}
            <div className="week-calendar-layout desktop-only-block">
              <div className="week-calendar-grid">
                {calendarDays.map((day) => {
                  const hot = day.runs.some((s) => isHighIntensitySession(s))
                  return (
                    <div
                      key={day.date}
                      className={hot ? 'week-day week-day-high' : 'week-day'}
                    >
                      <div className="week-day-head">
                        <span>周{day.label}</span>
                        <time
                          dateTime={day.date}
                          className={day.date === today ? 'is-today' : undefined}
                        >
                          {day.date.slice(5)}
                        </time>
                      </div>
                      <ul className="week-day-list">
                        {day.runs.map((s) => {
                          const st = sessionStatus(
                            'run',
                            s.id,
                            logs,
                            isHighIntensitySession(s),
                          )
                          const km = (
                            sessionVolumeMeters(s.blocks) / 1000
                          ).toFixed(1)
                          const mins = estimateSessionMinutes(s)
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                className={`cal-event run${st === 'done' ? ' done' : ''}${isHighIntensitySession(s) ? ' high' : ''}`}
                                onClick={() => onEditSession(s)}
                              >
                                <span className="cal-event-title">{s.title}</span>
                                <span className="cal-event-meta">
                                  {mins}min · {km} km
                                  {st === 'done' ? ' · 完成' : ''}
                                  {st === 'part' ? ' · 部分' : ''}
                                  {st === 'miss' ? ' · 缺训' : ''}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                        {day.conds.map((s) => {
                          const st = sessionStatus('conditioning', s.id, logs)
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                className={`cal-event cond${st === 'done' ? ' done' : ''}`}
                                onClick={() => onEditConditioning(s)}
                              >
                                <span className="cal-event-title">{s.title}</span>
                                <span className="cal-event-meta">
                                  {s.items.length} 动作
                                  {st === 'done' ? ' · 完成' : ''}
                                  {st === 'part' ? ' · 部分' : ''}
                                  {st === 'miss' ? ' · 缺训' : ''}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                        {day.runs.length === 0 && day.conds.length === 0 && (
                          <li className="week-day-empty">休 / 未排</li>
                        )}
                      </ul>
                    </div>
                  )
                })}
              </div>

              <aside className="week-summary" aria-label="完成与计划">
                <h3>完成 / 计划</h3>
                <div className="week-summary-metric">
                  <header>
                    <span>总时长</span>
                    <strong>
                      {doneMinutes} / {plannedMinutes} min
                    </strong>
                  </header>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${plannedMinutes ? Math.min(100, (doneMinutes / plannedMinutes) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="week-summary-metric">
                  <header>
                    <span>跑量</span>
                    <strong>
                      {doneKm.toFixed(1)} / {plannedKm.toFixed(1)} km
                    </strong>
                  </header>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${plannedKm ? Math.min(100, (doneKm / plannedKm) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="week-summary-metric">
                  <header>
                    <span>课次负荷</span>
                    <strong>
                      {doneLoad} / {plannedLoad}
                    </strong>
                  </header>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${plannedLoad ? Math.min(100, (doneLoad / plannedLoad) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                {load.hints.length > 0 ? (
                  <ul className="week-summary-hints">
                    {load.hints.slice(0, 3).map((h) => (
                      <li key={h.text} className={`hint-${h.level}`}>
                        {h.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </aside>
            </div>
          </div>
        ) : (
          <div className="month-grid" aria-label="月历">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="month-head">
                周{d}
              </div>
            ))}
            {monthCells.map((cell) => {
              const count = cell.runs.length + cell.conds.length
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={
                    cell.outside
                      ? 'month-cell outside'
                      : cell.date === today
                        ? 'month-cell is-today-cell'
                        : 'month-cell'
                  }
                  onClick={() => {
                    if (cell.outside) return
                    setWeekStart(startOfWeekISO(new Date(
                      Number(cell.date.slice(0, 4)),
                      Number(cell.date.slice(5, 7)) - 1,
                      Number(cell.date.slice(8, 10)),
                    )))
                    setCalView('week')
                    setPicked([])
                    setPickedCond([])
                  }}
                >
                  <div
                    className={
                      cell.date === today
                        ? 'month-cell-date is-today'
                        : 'month-cell-date'
                    }
                  >
                    {Number(cell.date.slice(8))}
                  </div>
                  {count > 0 ? (
                    <span className="month-dot" aria-label={`${count} 课`}>
                      {count > 1 ? count : ''}
                    </span>
                  ) : null}
                  <div className="month-cell-events desktop-only-block">
                    {cell.runs.slice(0, 2).map((s) => (
                      <span
                        key={s.id}
                        className={`cal-event run${isHighIntensitySession(s) ? ' high' : ''}`}
                      >
                        <span className="cal-event-title">{s.title}</span>
                      </span>
                    ))}
                    {cell.conds.slice(0, 1).map((s) => (
                      <span key={s.id} className="cal-event cond">
                        <span className="cal-event-title">{s.title}</span>
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel-grid">
        <section className="card">
          <header className="card-head">
            <h2>编辑本周</h2>
            <p>
              {athlete.name} · 勾选课时并保存
            </p>
          </header>

          <div className="cycle-box">
            <strong>周期骨架模板</strong>
            <div className="form-grid">
              <label>
                模板
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                >
                  {CYCLE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="hint">{cycle?.description}</span>
              </label>
              <label>
                起始周（周一）
                <DateInput value={weekStart} onChange={setWeekStart} />
              </label>
            </div>
            <button type="button" className="ghost solid" onClick={applyCycle}>
              一键生成 {cycle?.weeks ?? ''} 周骨架
            </button>
          </div>

          <div
            className={`load-box level-${
              load.hints.some((h) => h.level === 'high')
                ? 'high'
                : load.hints.some((h) => h.level === 'watch')
                  ? 'watch'
                  : 'ok'
            }`}
          >
            <strong>负荷提示</strong>
            <ul>
              {load.hints.map((h) => (
                <li key={h.text} className={`hint-${h.level}`}>
                  {h.text}
                </li>
              ))}
              {plannedCond.length >= 4 && (
                <li className="hint-watch">
                  素质课已达 {plannedCond.length} 次，注意与质量课恢复错开
                </li>
              )}
              {(athlete.weaknesses?.length ?? 0) > 0 && plannedCond.length === 0 && (
                <li className="hint-watch">
                  档案已标弱项，但本周未挂素质课
                </li>
              )}
            </ul>
          </div>

          <div className="form-grid">
            <label>
              周起始（周一）
              <DateInput
                value={weekStart}
                onChange={(iso) => {
                  setWeekStart(iso)
                  setPicked([])
                  setPickedCond([])
                }}
              />
            </label>
            <label>
              本周阶段
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as PeriodPhase)}
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              本周主题
              <input value={focus} onChange={(e) => setFocus(e.target.value)} />
            </label>
          </div>

          <h3 className="subhead">跑课（间歇/有氧等）</h3>
          {athleteSessions.length === 0 ? (
            <p className="empty">还没有跑课，先去「排课」创建。</p>
          ) : (
            <ul className="session-pick">
              {athleteSessions.map((s) => (
                <li key={s.id}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => ensureRunPick(s.id)}
                    />
                    <span>
                      <strong>
                        {s.date} · {s.title}
                      </strong>
                      <em>
                        {PHASE_OPTIONS.find((p) => p.id === s.phase)?.label} ·{' '}
                        {(sessionVolumeMeters(s.blocks) / 1000).toFixed(2)} km
                      </em>
                    </span>
                  </label>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => onEditSession(s)}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setCheckIn({ kind: 'run', refId: s.id, title: s.title })
                      }
                    >
                      {logFor('run', s.id) ? '改打卡' : '打卡'}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={async () => {
                        const text = sessionToText(athlete, s)
                        try {
                          await copyText(text)
                          onNotice?.('课时已复制')
                        } catch {
                          downloadText(`${s.title}.txt`, text)
                        }
                      }}
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => printSessionCard(athlete, s)}
                    >
                      打印
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => onDeleteSession(s.id)}
                    >
                      删
                    </button>
                  </div>
                  {logFor('run', s.id) ? (
                    <p className="log-chip">
                      打卡 RPE {logFor('run', s.id)!.rpe ?? '—'} ·{' '}
                      {logFor('run', s.id)!.doneSummary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <h3 className="subhead">素质课（弱项针对性）</h3>
          {athleteCond.length === 0 ? (
            <p className="empty">还没有素质课，去「素质」页按弱项组课。</p>
          ) : (
            <ul className="session-pick">
              {athleteCond.map((s) => (
                <li key={s.id}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selectedCondIds.includes(s.id)}
                      onChange={() => ensureCondPick(s.id)}
                    />
                    <span>
                      <strong>
                        {s.date} · {s.title}
                      </strong>
                      <em>
                        {s.weaknessIds
                          .map((id) => getWeaknessModule(id).shortName)
                          .join('、')}{' '}
                        · {s.items.length} 动作
                      </em>
                    </span>
                  </label>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => onEditConditioning(s)}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setCheckIn({
                          kind: 'conditioning',
                          refId: s.id,
                          title: s.title,
                        })
                      }
                    >
                      {logFor('conditioning', s.id) ? '改打卡' : '打卡'}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={async () => {
                        const text = conditioningToText(athlete, s)
                        try {
                          await copyText(text)
                          onNotice?.('素质课已复制')
                        } catch {
                          downloadText(`${s.title}.txt`, text)
                        }
                      }}
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => printConditioningCard(athlete, s)}
                    >
                      打印
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => onDeleteConditioning(s.id)}
                    >
                      删
                    </button>
                  </div>
                  {logFor('conditioning', s.id) ? (
                    <p className="log-chip">
                      打卡 RPE {logFor('conditioning', s.id)!.rpe ?? '—'} ·{' '}
                      {logFor('conditioning', s.id)!.doneSummary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="btn-row">
            <button type="button" className="primary" onClick={save}>
              保存周计划
            </button>
            <button
              type="button"
              className="ghost solid"
              onClick={exportWeek}
              disabled={planned.length === 0 && plannedCond.length === 0}
            >
              导出本周
            </button>
          </div>
        </section>

        <section className="card">
          <header className="card-head">
            <h2>本周课表预览</h2>
            <p>
              {currentWeek
                ? `已存：${PHASE_OPTIONS.find((p) => p.id === currentWeek.phase)?.label} · ${currentWeek.focus}`
                : '尚未保存本周'}
            </p>
          </header>
          {planned.length === 0 && plannedCond.length === 0 ? (
            <p className="empty">勾选跑课/素质课后这里会汇总。</p>
          ) : (
            <div className="week-preview">
              {planned.map((s) => (
                <article key={s.id} className="session-card">
                  <header>
                    <h3>{s.title}</h3>
                    <time>{s.date}</time>
                  </header>
                  {s.mainFocus ? <p className="note">要点：{s.mainFocus}</p> : null}
                  <p className="muted">{s.warmupNote}</p>
                  <ul>
                    {s.blocks.map((b) => (
                      <li key={b.id}>
                        {blockLabel(b)} {getMethod(b.methodId).name} @{' '}
                        {formatTime(b.targetSeconds)}
                        {`（休 ${formatRest(
                          b.restMode,
                          b.restSeconds,
                          b.restJogMeters ?? 0,
                        )}）`}
                      </li>
                    ))}
                  </ul>
                  <p className="muted">{s.cooldownNote}</p>
                </article>
              ))}
              {plannedCond.map((s) => (
                <article key={s.id} className="session-card conditioning">
                  <header>
                    <h3>{s.title}</h3>
                    <time>{s.date}</time>
                  </header>
                  <p className="muted">
                    针对：
                    {s.weaknessIds
                      .map((id) => getWeaknessModule(id).shortName)
                      .join('、')}
                  </p>
                  <ul>
                    {s.items.map((it) => (
                      <li key={it.id}>
                        {it.name} · {it.sets}×{it.reps}
                      </li>
                    ))}
                  </ul>
                  {s.coachNote ? <p className="note">备注：{s.coachNote}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {checkIn && athlete ? (
        <CheckInModal
          kind={checkIn.kind}
          refId={checkIn.refId}
          athleteId={athlete.id}
          title={checkIn.title}
          existing={logFor(checkIn.kind, checkIn.refId)}
          onSave={onSaveLog}
          onClose={() => setCheckIn(null)}
        />
      ) : null}
    </div>
  )
}
