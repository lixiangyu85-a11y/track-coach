import { useMemo } from 'react'
import { EquivRaceLine } from './EquivRaceLine'
import { EVENT_OPTIONS, PHASE_OPTIONS, sexLabel } from '../domain/catalog'
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
import { addDaysISO, startOfWeekISO, todayISO } from '../domain/dates'
import { athleteVdot, formatTime, sessionVolumeMeters } from '../domain/paces'
import type {
  Athlete,
  ConditioningSession,
  TrainingSession,
  WeekPlan,
} from '../domain/types'

export type HomeTabTarget =
  | 'athletes'
  | 'builder'
  | 'conditioning'
  | 'week'
  | 'methods'

interface Props {
  athletes: Athlete[]
  activeAthlete: Athlete | null
  sessions: TrainingSession[]
  conditioning: ConditioningSession[]
  weeks: WeekPlan[]
  onNavigate: (tab: HomeTabTarget) => void
  onSelectAthlete: (id: string) => void
  onOpenSession?: (session: TrainingSession) => void
  onOpenConditioning?: (session: ConditioningSession) => void
}

function estimateMinutes(s: TrainingSession): number {
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

function formatCnDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${Number(m[2])}月${Number(m[3])}日 周${weekdays[d.getDay()]}`
}

export function HomeDashboard({
  athletes,
  activeAthlete,
  sessions,
  conditioning,
  weeks,
  onNavigate,
  onSelectAthlete,
  onOpenSession,
  onOpenConditioning,
}: Props) {
  const weekStart = startOfWeekISO()
  const today = todayISO()
  const dates = weekDayDates(weekStart)

  const scopedRuns = useMemo(() => {
    if (!activeAthlete) return sessions
    return sessions.filter((s) => s.athleteId === activeAthlete.id)
  }, [sessions, activeAthlete])

  const scopedCond = useMemo(() => {
    if (!activeAthlete) return conditioning
    return conditioning.filter((s) => s.athleteId === activeAthlete.id)
  }, [conditioning, activeAthlete])

  const weekRuns = useMemo(
    () => scopedRuns.filter((s) => dates.includes(s.date)),
    [scopedRuns, dates],
  )
  const weekCond = useMemo(
    () => scopedCond.filter((s) => dates.includes(s.date)),
    [scopedCond, dates],
  )

  const weekMeta = useMemo(() => {
    if (!activeAthlete) return null
    return (
      weeks.find(
        (w) => w.athleteId === activeAthlete.id && w.weekStart === weekStart,
      ) ?? null
    )
  }, [weeks, activeAthlete, weekStart])

  const prevRuns = useMemo(() => {
    const prevDates = weekDayDates(addDaysISO(weekStart, -7))
    return scopedRuns.filter((s) => prevDates.includes(s.date))
  }, [scopedRuns, weekStart])

  const load = useMemo(() => {
    const phase = weekMeta?.phase ?? 'build'
    const v = activeAthlete ? athleteVdot(activeAthlete) : undefined
    return analyzeWeekLoad(weekRuns, phase, {
      vdot: v,
      conditioning: weekCond,
      previousWeekKm: prevRuns.length ? totalWeekKm(prevRuns) : undefined,
      previousLongRunKm: prevRuns.length
        ? longestSessionKm(prevRuns)
        : undefined,
      weeksSinceRecovery: activeAthlete
        ? weeksSinceRecovery(weeks, activeAthlete.id, weekStart, phase)
        : undefined,
    })
  }, [weekRuns, weekCond, weekMeta, activeAthlete, prevRuns, weeks, weekStart])

  const loadAlerts = load.hints.filter(
    (h) => h.level === 'watch' || h.level === 'high',
  )

  const bannerLevel = loadAlerts.some((h) => h.level === 'high')
    ? 'high'
    : loadAlerts.some((h) => h.level === 'watch')
      ? 'watch'
      : 'ok'

  const bannerText =
    loadAlerts[0]?.text ??
    (activeAthlete
      ? `本周跑量 ${load.totalKm.toFixed(1)} km · 跑课 ${weekRuns.length} · 素质 ${weekCond.length}，负荷整体可控。`
      : `共 ${athletes.length} 名运动员 · 本周跑课 ${weekRuns.length} · 素质 ${weekCond.length}。`)

  const byDay = useMemo(() => {
    const map = new Map<
      string,
      { runs: TrainingSession[]; conds: ConditioningSession[] }
    >()
    for (const d of dates) map.set(d, { runs: [], conds: [] })
    for (const s of weekRuns) map.get(s.date)?.runs.push(s)
    for (const c of weekCond) map.get(c.date)?.conds.push(c)
    return map
  }, [dates, weekRuns, weekCond])

  const eventLabel = activeAthlete
    ? (EVENT_OPTIONS.find((e) => e.id === activeAthlete.event)?.label ??
      activeAthlete.event)
    : null

  const vdot = activeAthlete ? athleteVdot(activeAthlete) : null
  const weekKm = totalWeekKm(weekRuns)
  const longKm = weekRuns.length ? longestSessionKm(weekRuns) : 0
  const plannedMin = weekRuns.reduce((s, x) => s + estimateMinutes(x), 0)
  const loadTone =
    bannerLevel === 'high'
      ? { value: '偏高', cls: 'orange' as const }
      : bannerLevel === 'watch'
        ? { value: '关注', cls: 'yellow' as const }
        : { value: '平稳', cls: 'green' as const }

  const todayRuns = weekRuns.filter((s) => s.date === today)
  const todayConds = weekCond.filter((s) => s.date === today)
  const upcoming = useMemo(() => {
    const items: {
      id: string
      kind: 'run' | 'cond'
      title: string
      date: string
      meta: string
      session?: TrainingSession
      cond?: ConditioningSession
    }[] = []
    for (const s of weekRuns) {
      if (s.date <= today) continue
      items.push({
        id: s.id,
        kind: 'run',
        title: s.title,
        date: s.date,
        meta: `${estimateMinutes(s)}min · ${(sessionVolumeMeters(s.blocks) / 1000).toFixed(1)} km`,
        session: s,
      })
    }
    for (const c of weekCond) {
      if (c.date <= today) continue
      items.push({
        id: c.id,
        kind: 'cond',
        title: c.title,
        date: c.date,
        meta: `${c.items.length} 动作`,
        cond: c,
      })
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
  }, [weekRuns, weekCond, today])

  const phaseLabel = weekMeta
    ? (PHASE_OPTIONS.find((p) => p.id === weekMeta.phase)?.label ?? weekMeta.phase)
    : null

  return (
    <div className="home">
      {/* ===== Mobile today layout ===== */}
      <div className="home-mobile mobile-only-block">
        <header className="m-today-head">
          <div className="m-today-head-row">
            <p className="m-today-date">{formatCnDate(today)}</p>
          </div>
          <h1 className="m-today-hello">
            你好，{activeAthlete?.name ?? '教练'}
          </h1>
        </header>

        <section className="m-section">
          <h2 className="m-section-title">今日训练</h2>
          {todayRuns.length === 0 && todayConds.length === 0 ? (
            <div className="m-today-card muted-card">
              <div className="m-today-card-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l2.5 2.5" />
                </svg>
              </div>
              <div className="m-today-card-body">
                <strong>今日休息 / 未排课</strong>
                <span>可去周计划或排课安排</span>
              </div>
            </div>
          ) : (
            <div className="m-today-stack">
              {todayRuns.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="m-today-card"
                  onClick={() => onOpenSession?.(s)}
                >
                  <div className="m-today-card-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M5 16c2-4 4-7 7-7s5 3 7 7" />
                      <circle cx="8" cy="8" r="1.4" />
                      <circle cx="16" cy="8" r="1.4" />
                    </svg>
                  </div>
                  <div className="m-today-card-body">
                    <strong>{s.title}</strong>
                    <span>
                      {estimateMinutes(s)}min ·{' '}
                      {(sessionVolumeMeters(s.blocks) / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <span className="m-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
              {todayConds.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="m-today-card"
                  onClick={() => onOpenConditioning?.(c)}
                >
                  <div className="m-today-card-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M7 9v6M17 9v6M4 11v2M20 11v2M7 12h10" />
                    </svg>
                  </div>
                  <div className="m-today-card-body">
                    <strong>{c.title}</strong>
                    <span>{c.items.length} 动作</span>
                  </div>
                  <span className="m-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="m-metric-grid">
          <div className="m-metric-card">
            <p className="m-metric-label">本周负荷</p>
            <p className={`m-metric-value tone-${loadTone.cls}`}>
              {loadAlerts.length}
            </p>
            <p className="m-metric-sub">
              <span className={`status-dot ${loadTone.cls}`} />
              {loadTone.value}
            </p>
          </div>
          <div className="m-metric-card">
            <p className="m-metric-label">本周</p>
            <p className="m-metric-value">{weekKm.toFixed(1)}</p>
            <p className="m-metric-sub">
              km · 计划约 {plannedMin || 0} min
            </p>
            <div className="progress-track m-metric-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, weekRuns.length ? 55 + weekKm * 4 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {activeAthlete && eventLabel ? (
          <div className="m-goal-card">
            <div className="m-goal-copy">
              <strong>{eventLabel}</strong>
              <span>
                PB {formatTime(activeAthlete.pbSeconds)}
                {phaseLabel ? ` · ${phaseLabel}` : ''}
              </span>
            </div>
            <div className="m-goal-days">
              <strong>{vdot != null ? vdot.toFixed(0) : '—'}</strong>
              <span>VDOT</span>
            </div>
          </div>
        ) : null}

        {loadAlerts.length > 0 ? (
          <div className={`m-alert-strip level-${bannerLevel}`} role="status">
            {bannerText}
          </div>
        ) : null}

        <section className="m-section">
          <h2 className="m-section-title">接下来</h2>
          {upcoming.length === 0 ? (
            <p className="empty">本周暂无后续课程。</p>
          ) : (
            <div className="m-coming-card">
              {upcoming.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    idx === upcoming.length - 1
                      ? 'm-coming-row last'
                      : 'm-coming-row'
                  }
                  onClick={() => {
                    if (item.kind === 'run' && item.session) {
                      onOpenSession?.(item.session)
                    } else if (item.cond) {
                      onOpenConditioning?.(item.cond)
                    }
                  }}
                >
                  <div className="m-today-card-icon sm" aria-hidden="true">
                    {item.kind === 'run' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M5 16c2-4 4-7 7-7s5 3 7 7" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M7 9v6M17 9v6M7 12h10" />
                      </svg>
                    )}
                  </div>
                  <div className="m-today-card-body">
                    <strong>{item.title}</strong>
                    <span>
                      周
                      {
                        WEEKDAY_LABELS[
                          dates.indexOf(item.date) >= 0
                            ? dates.indexOf(item.date)
                            : 0
                        ]
                      }{' '}
                      · {item.meta}
                    </span>
                  </div>
                  <span className="m-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ===== Desktop layout ===== */}
      <div className="home-desktop desktop-only-block">
        <div className={`home-banner level-${bannerLevel}`} role="status">
          <span className="home-banner-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19V5M4 19h16" />
              <path d="m7 14 3.5-4.5L14 13l4-7" />
            </svg>
          </span>
          <span>{bannerText}</span>
        </div>

        <div className="home-summary" aria-label="概览指标">
          <div className="home-summary-col">
            <p className="home-summary-label">即将到来的比赛 / 目标</p>
            {activeAthlete ? (
              <ul className="home-goal-list">
                <li>
                  <span className="status-pill orange">主项</span>
                  <span>
                    {eventLabel} · PB {formatTime(activeAthlete.pbSeconds)}
                  </span>
                </li>
                <li>
                  <span className="status-pill blue">主题</span>
                  <span>{weekMeta?.focus || '本周主题待定'}</span>
                </li>
                {phaseLabel ? (
                  <li>
                    <span className="status-pill purple">阶段</span>
                    <span>{phaseLabel}</span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                选择或添加运动员后显示主项目标。
              </p>
            )}
          </div>

          <div className="home-summary-col">
            <p className="home-summary-label">训练负荷</p>
            <div className="metric-blocks">
              <div className="metric-block">
                <strong>{weekKm.toFixed(1)}</strong>
                <span>本周跑量 km</span>
              </div>
              <div className="metric-block">
                <strong>{weekRuns.length}</strong>
                <span>跑课</span>
              </div>
              <div className="metric-block">
                <strong>{loadAlerts.length}</strong>
                <span>提醒</span>
              </div>
            </div>
          </div>

          <div className="home-summary-col">
            <p className="home-summary-label">近期指标</p>
            <div className="metric-blocks">
              <div className="metric-block">
                <strong>{vdot != null ? vdot.toFixed(1) : '—'}</strong>
                <span>VDOT</span>
              </div>
              <div className="metric-block">
                <strong>{longKm ? longKm.toFixed(1) : '—'}</strong>
                <span>最长课 km</span>
              </div>
              <div className="metric-block">
                <strong>{weekCond.length}</strong>
                <span>素质课</span>
              </div>
            </div>
          </div>
        </div>

        {activeAthlete && vdot != null ? (
          <div className="home-equiv soft-panel">
            <p className="home-summary-label">等价成绩参考</p>
            <EquivRaceLine
              vdot={vdot}
              event={activeAthlete.event}
              showCaveat
            />
          </div>
        ) : null}

        <section aria-labelledby="home-week-title">
          <div className="home-page-head">
            <div>
              <h1 id="home-week-title">本周日历</h1>
              <p>
                {weekStart} 起 ·{' '}
                {activeAthlete ? activeAthlete.name : '全部运动员'}
                {activeAthlete
                  ? ` · ${sexLabel(activeAthlete.sex) ? `${sexLabel(activeAthlete.sex)} · ` : ''}${eventLabel}`
                  : ''}
              </p>
            </div>
            <div className="page-head-actions">
              {activeAthlete ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onNavigate('builder')}
                >
                  新建跑步课
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onNavigate('athletes')}
                >
                  添加运动员
                </button>
              )}
              <button
                type="button"
                className="ghost solid"
                onClick={() => onNavigate('week')}
              >
                打开周计划
              </button>
            </div>
          </div>

          <div className="home-week-strip" role="list">
            {dates.map((date, i) => {
              const cell = byDay.get(date) ?? { runs: [], conds: [] }
              const isToday = date === today
              const hasHigh = cell.runs.some(isHighIntensitySession)
              return (
                <article
                  key={date}
                  role="listitem"
                  className={
                    isToday
                      ? 'home-day today'
                      : hasHigh
                        ? 'home-day high'
                        : 'home-day'
                  }
                >
                  <div className="home-day-top">
                    <span>周{WEEKDAY_LABELS[i]}</span>
                    <span className={isToday ? 'is-today' : undefined}>
                      {date.slice(5)}
                    </span>
                  </div>
                  {cell.runs.length === 0 && cell.conds.length === 0 ? (
                    <p className="home-day-empty">休息 / 未排</p>
                  ) : (
                    <ul className="home-day-items">
                      {cell.runs.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className={
                              isHighIntensitySession(s)
                                ? 'cal-event run high'
                                : 'cal-event run'
                            }
                            onClick={() => onOpenSession?.(s)}
                          >
                            <span className="cal-event-title">{s.title}</span>
                            <span className="cal-event-meta">
                              {estimateMinutes(s)}min ·{' '}
                              {(sessionVolumeMeters(s.blocks) / 1000).toFixed(1)}{' '}
                              km
                            </span>
                          </button>
                        </li>
                      ))}
                      {cell.conds.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="cal-event cond"
                            onClick={() => onOpenConditioning?.(c)}
                          >
                            <span className="cal-event-title">{c.title}</span>
                            <span className="cal-event-meta">
                              {c.items.length} 动作
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              )
            })}
          </div>

          {athletes.length > 1 ? (
            <div className="home-quick-athletes">
              <p className="home-summary-label">快速选人</p>
              <div className="home-athlete-chips">
                {athletes.map((a) => {
                  const active = activeAthlete?.id === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={
                        active ? 'chip-btn active' : 'chip-btn'
                      }
                      onClick={() => onSelectAthlete(a.id)}
                      aria-pressed={active}
                    >
                      {a.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
