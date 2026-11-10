import { useMemo } from 'react'
import { EquivRaceLine } from './EquivRaceLine'
import { EVENT_OPTIONS, sexLabel } from '../domain/catalog'
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
import { athleteVdot, formatTime } from '../domain/paces'
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
}

function greetingForNow(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const QUICK: {
  id: HomeTabTarget
  title: string
  desc: string
  tone: 'track' | 'accent' | 'ink' | 'chip'
}[] = [
  {
    id: 'athletes',
    title: '运动员',
    desc: '档案 · VDOT · 弱点标记',
    tone: 'ink',
  },
  {
    id: 'builder',
    title: '排课',
    desc: 'Daniels 配速与组合课',
    tone: 'track',
  },
  {
    id: 'conditioning',
    title: '素质',
    desc: '针对弱点的力量与稳定',
    tone: 'accent',
  },
  {
    id: 'week',
    title: '周计划',
    desc: '日历 · 负荷 · 打卡导出',
    tone: 'ink',
  },
  {
    id: 'methods',
    title: '方法库',
    desc: '课型与组合一览',
    tone: 'chip',
  },
]

export function HomeDashboard({
  athletes,
  activeAthlete,
  sessions,
  conditioning,
  weeks,
  onNavigate,
  onSelectAthlete,
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
      previousLongRunKm: prevRuns.length ? longestSessionKm(prevRuns) : undefined,
      weeksSinceRecovery: activeAthlete
        ? weeksSinceRecovery(
            weeks,
            activeAthlete.id,
            weekStart,
            phase,
          )
        : undefined,
    })
  }, [weekRuns, weekCond, weekMeta, activeAthlete, prevRuns, weeks, weekStart])

  const loadAlerts = load.hints.filter(
    (h) => h.level === 'watch' || h.level === 'high',
  )

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

  return (
    <div className="home">
      <section className="home-hero card">
        <div className="home-hero-copy">
          <p className="home-kicker">{greetingForNow()} · Track Coach</p>
          <h1>
            {activeAthlete
              ? `本周盯紧 ${activeAthlete.name}`
              : '从一位运动员开始'}
          </h1>
          <p className="home-lead">
            {activeAthlete ? (
              <>
                {sexLabel(activeAthlete.sex)
                  ? `${sexLabel(activeAthlete.sex)} · `
                  : ''}
                {eventLabel} · PB {formatTime(activeAthlete.pbSeconds)}
                {vdot != null ? ` · VDOT ${vdot.toFixed(1)}` : ''}
                {weekMeta
                  ? ` · ${weekMeta.focus || '本周主题待定'}`
                  : ' · 本周计划尚未填写主题'}
              </>
            ) : (
              '录入主项与最好成绩后，可自动推算配速区，再排课、排素质、看周负荷。'
            )}
          </p>
          {activeAthlete && vdot != null ? (
            <EquivRaceLine
              vdot={vdot}
              event={activeAthlete.event}
              showCaveat
            />
          ) : null}
          <div className="home-hero-actions">
            {activeAthlete ? (
              <>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onNavigate('week')}
                >
                  打开周计划
                </button>
                <button
                  type="button"
                  className="ghost solid"
                  onClick={() => onNavigate('builder')}
                >
                  新建跑步课
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onNavigate('athletes')}
                >
                  切换运动员
                </button>
              </>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={() => onNavigate('athletes')}
              >
                添加运动员
              </button>
            )}
          </div>
        </div>
        <aside className="home-hero-stats" aria-label="本周概览">
          <div className="home-stat">
            <span className="home-stat-value">{athletes.length}</span>
            <span className="home-stat-label">运动员</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-value">{weekRuns.length}</span>
            <span className="home-stat-label">本周跑课</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-value">{weekCond.length}</span>
            <span className="home-stat-label">本周素质</span>
          </div>
          <div
            className={
              loadAlerts.length
                ? 'home-stat home-stat-warn'
                : 'home-stat home-stat-ok'
            }
          >
            <span className="home-stat-value">{loadAlerts.length}</span>
            <span className="home-stat-label">负荷提醒</span>
          </div>
        </aside>
      </section>

      <section className="home-week card" aria-labelledby="home-week-title">
        <header className="card-head home-week-head">
          <div>
            <h2 id="home-week-title">本周一览</h2>
            <p>
              {weekStart} 起 ·{' '}
              {activeAthlete ? activeAthlete.name : '全部运动员'}
              {!activeAthlete && athletes.length > 1
                ? '（未选中时汇总所有人）'
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => onNavigate('week')}
          >
            进入周计划
          </button>
        </header>

        <div className="home-week-grid" role="list">
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
                  <span className="home-day-label">周{WEEKDAY_LABELS[i]}</span>
                  <span className="home-day-date">{date.slice(5)}</span>
                </div>
                {cell.runs.length === 0 && cell.conds.length === 0 ? (
                  <p className="home-day-empty">休息 / 未排</p>
                ) : (
                  <ul className="home-day-items">
                    {cell.runs.map((s) => (
                      <li key={s.id}>
                        <span
                          className={
                            isHighIntensitySession(s)
                              ? 'pill high'
                              : 'pill run'
                          }
                        >
                          跑
                        </span>
                        {s.title}
                      </li>
                    ))}
                    {cell.conds.map((c) => (
                      <li key={c.id}>
                        <span className="pill cond">素</span>
                        {c.title}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>

        {loadAlerts.length > 0 && (
          <div className="home-alerts" role="status">
            <h3>本周提醒</h3>
            <ul>
              {loadAlerts.map((h, idx) => (
                <li key={`${h.level}-${idx}`} className={`hint-${h.level}`}>
                  {h.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {athletes.length > 0 && (
        <section className="home-roster card" aria-labelledby="home-roster-title">
          <header className="card-head">
            <h2 id="home-roster-title">快速选人</h2>
            <p>点选后，排课 / 素质 / 周计划会围绕该运动员</p>
          </header>
          <ul className="home-roster-list">
            {athletes.map((a) => {
              const label =
                EVENT_OPTIONS.find((e) => e.id === a.event)?.label ?? a.event
              const active = activeAthlete?.id === a.id
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={
                      active ? 'home-roster-btn active' : 'home-roster-btn'
                    }
                    onClick={() => onSelectAthlete(a.id)}
                    aria-pressed={active}
                  >
                    <span className="home-roster-name">{a.name}</span>
                    <span className="home-roster-meta">
                      {sexLabel(a.sex) ? `${sexLabel(a.sex)} · ` : ''}
                      {label} · PB {formatTime(a.pbSeconds)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="home-quick" aria-label="功能入口">
        {QUICK.map((q) => (
          <button
            key={q.id}
            type="button"
            className={`home-quick-card tone-${q.tone}`}
            onClick={() => onNavigate(q.id)}
          >
            <span className="home-quick-title">{q.title}</span>
            <span className="home-quick-desc">{q.desc}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
