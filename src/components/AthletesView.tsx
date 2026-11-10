import { useEffect, useMemo, useState } from 'react'
import { EquivRaceLine } from './EquivRaceLine'
import { EVENT_OPTIONS, SEX_OPTIONS, sexLabel } from '../domain/catalog'
import { getWeaknessModule } from '../domain/conditioningCatalog'
import {
  WEEKDAY_LABELS,
  weekDayDates,
} from '../domain/conflicts'
import {
  analyzeWeekLoad,
  longestSessionKm,
  totalWeekKm,
  weeksSinceRecovery,
} from '../domain/load'
import { addDaysISO, startOfWeekISO } from '../domain/dates'
import {
  athleteVdot,
  formatTime,
  parseTimeInput,
  uid,
} from '../domain/paces'
import type {
  Athlete,
  ConditioningSession,
  EventFocus,
  Sex,
  TrainingSession,
  WeekPlan,
} from '../domain/types'

interface Props {
  athletes: Athlete[]
  activeId: string | null
  sessions: TrainingSession[]
  conditioning: ConditioningSession[]
  weeks: WeekPlan[]
  onSelect: (id: string) => void
  onSave: (athlete: Athlete) => void
  onUpdate: (athlete: Athlete) => void
  onDelete: (id: string) => void
  onNotice?: (message: string) => void
  onOpenWeek?: (id: string) => void
  onOpenBuilder?: (id: string) => void
}

function athleteWeekStats(
  athlete: Athlete,
  sessions: TrainingSession[],
  conditioning: ConditioningSession[],
  weeks: WeekPlan[],
  weekStart: string,
) {
  const dates = weekDayDates(weekStart)
  const weekRuns = sessions.filter(
    (s) => s.athleteId === athlete.id && dates.includes(s.date),
  )
  const weekCond = conditioning.filter(
    (s) => s.athleteId === athlete.id && dates.includes(s.date),
  )
  const weekMeta =
    weeks.find((w) => w.athleteId === athlete.id && w.weekStart === weekStart) ??
    null
  const prevDates = weekDayDates(addDaysISO(weekStart, -7))
  const prevRuns = sessions.filter(
    (s) => s.athleteId === athlete.id && prevDates.includes(s.date),
  )
  const phase = weekMeta?.phase ?? 'build'
  const load = analyzeWeekLoad(weekRuns, phase, {
    vdot: athleteVdot(athlete),
    conditioning: weekCond,
    previousWeekKm: prevRuns.length ? totalWeekKm(prevRuns) : undefined,
    previousLongRunKm: prevRuns.length
      ? longestSessionKm(prevRuns)
      : undefined,
    weeksSinceRecovery: weeksSinceRecovery(
      weeks,
      athlete.id,
      weekStart,
      phase,
    ),
  })
  const alerts = load.hints.filter(
    (h) => h.level === 'watch' || h.level === 'high',
  )
  return {
    weekRuns,
    weekCond,
    weekKm: totalWeekKm(weekRuns),
    alerts,
    topAlert: alerts[0] ?? null,
  }
}

export function AthletesView({
  athletes,
  activeId,
  sessions,
  conditioning,
  weeks,
  onSelect,
  onSave,
  onUpdate,
  onDelete,
  onNotice,
  onOpenWeek,
  onOpenBuilder,
}: Props) {
  const [editing, setEditing] = useState<Athlete | null>(null)
  const weekStart = startOfWeekISO()

  const rows = useMemo(
    () =>
      athletes.map((a) => ({
        athlete: a,
        stats: athleteWeekStats(a, sessions, conditioning, weeks, weekStart),
      })),
    [athletes, sessions, conditioning, weeks, weekStart],
  )

  const watchRows = rows.filter((r) => r.stats.alerts.length > 0)

  return (
    <div className="athletes-layout">
      {watchRows.length > 0 ? (
        <section className="watch-card" aria-label="需要关注">
          <h2>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 8v5" />
              <circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none" />
              <path d="M10.2 4.8h3.6L20 19.2H4Z" />
            </svg>
            需要关注
          </h2>
          <ul className="watch-list">
            {watchRows.map(({ athlete, stats }) => (
              <li key={athlete.id}>
                <button
                  type="button"
                  className="ghost"
                  style={{ padding: 0, color: 'var(--ink)', fontWeight: 650 }}
                  onClick={() => onSelect(athlete.id)}
                >
                  {athlete.name}
                </button>
                <span
                  className={
                    stats.topAlert?.level === 'high'
                      ? 'status-pill orange'
                      : 'status-pill yellow'
                  }
                >
                  {stats.topAlert?.text ?? '负荷提醒'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="panel-grid">
        <section className="card">
          <header className="card-head">
            <h2>{editing ? '编辑运动员' : '运动员档案'}</h2>
            {editing ? <p>正在修改：{editing.name}</p> : <p>添加或更新档案</p>}
          </header>
          <AthleteForm
            key={editing?.id ?? 'new'}
            initial={editing}
            onCancel={editing ? () => setEditing(null) : undefined}
            onSubmit={(draft) => {
              if (editing) {
                onUpdate({
                  ...editing,
                  ...draft,
                })
                setEditing(null)
                onNotice?.('档案已更新')
                return
              }
              onSave({
                ...draft,
                id: uid('ath'),
                createdAt: new Date().toISOString(),
              })
              onNotice?.('运动员已添加')
            }}
          />
        </section>

        <section className="card">
          <header className="card-head">
            <h2>名单</h2>
            <p>
              {athletes.length} 人 · 本周 {WEEKDAY_LABELS[0]}起 {weekStart}
            </p>
          </header>
          {athletes.length === 0 ? (
            <p className="empty">还没有运动员，先添加一位。</p>
          ) : (
            <>
              <ul className="m-athlete-list mobile-only-block">
                {rows.map(({ athlete: a, stats }) => {
                  const label =
                    EVENT_OPTIONS.find((e) => e.id === a.event)?.label ??
                    a.event
                  const vdot = athleteVdot(a)
                  const sessionCount =
                    stats.weekRuns.length + stats.weekCond.length
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={
                          a.id === activeId
                            ? 'm-athlete-row active'
                            : 'm-athlete-row'
                        }
                        onClick={() => onSelect(a.id)}
                      >
                        <span className="m-athlete-main">
                          <strong>{a.name}</strong>
                          <span>
                            {label} · VDOT {vdot.toFixed(1)} ·{' '}
                            {stats.weekKm.toFixed(1)} km
                          </span>
                        </span>
                        {stats.topAlert ? (
                          <span
                            className={
                              stats.topAlert.level === 'high'
                                ? 'status-pill orange'
                                : 'status-pill yellow'
                            }
                          >
                            负荷
                          </span>
                        ) : sessionCount > 0 ? (
                          <span className="status-pill green">正常</span>
                        ) : (
                          <span className="status-pill gray">空闲</span>
                        )}
                      </button>
                      <div className="m-athlete-actions">
                        <button
                          type="button"
                          className="ghost solid"
                          onClick={() => {
                            onSelect(a.id)
                            onOpenWeek?.(a.id)
                          }}
                        >
                          周计划
                        </button>
                        <button
                          type="button"
                          className="ghost solid"
                          onClick={() => {
                            onSelect(a.id)
                            setEditing(a)
                          }}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="ghost danger"
                          onClick={() => onDelete(a.id)}
                        >
                          删
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="data-table-wrap desktop-only-block">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>运动员</th>
                      <th>本周课次</th>
                      <th>跑量</th>
                      <th>VDOT</th>
                      <th>状态</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ athlete: a, stats }) => {
                      const label =
                        EVENT_OPTIONS.find((e) => e.id === a.event)?.label ??
                        a.event
                      const vdot = athleteVdot(a)
                      const sessionCount =
                        stats.weekRuns.length + stats.weekCond.length
                      return (
                        <tr
                          key={a.id}
                          className={a.id === activeId ? 'active' : undefined}
                        >
                          <td>
                            <button
                              type="button"
                              className="athlete-main"
                              onClick={() => onSelect(a.id)}
                            >
                              <span className="cell-name">
                                <strong>{a.name}</strong>
                                <span>
                                  {sexLabel(a.sex)
                                    ? `${sexLabel(a.sex)} · `
                                    : ''}
                                  {label} · PB {formatTime(a.pbSeconds)}
                                  {(a.weaknesses?.length ?? 0) > 0
                                    ? ` · 弱项 ${a.weaknesses!
                                        .map(
                                          (id) =>
                                            getWeaknessModule(id).shortName,
                                        )
                                        .join('/')}`
                                    : ''}
                                </span>
                              </span>
                              {a.id === activeId ? (
                                <EquivRaceLine
                                  vdot={vdot}
                                  event={a.event}
                                  showCaveat
                                />
                              ) : null}
                            </button>
                          </td>
                          <td>
                            <span className="cell-inline">
                              跑 {stats.weekRuns.length} · 素{' '}
                              {stats.weekCond.length}
                              {sessionCount === 0 ? (
                                <span className="status-pill gray">未排</span>
                              ) : stats.alerts.length > 0 ? (
                                <span className="status-pill yellow">关注</span>
                              ) : (
                                <span className="status-pill green">
                                  {sessionCount} 课
                                </span>
                              )}
                            </span>
                          </td>
                          <td>{stats.weekKm.toFixed(1)} km</td>
                          <td>{vdot.toFixed(1)}</td>
                          <td>
                            {stats.topAlert ? (
                              <span
                                className={
                                  stats.topAlert.level === 'high'
                                    ? 'status-pill orange'
                                    : 'status-pill yellow'
                                }
                                title={stats.topAlert.text}
                              >
                                负荷
                              </span>
                            ) : sessionCount > 0 ? (
                              <span className="status-pill green">正常</span>
                            ) : (
                              <span className="status-pill gray">空闲</span>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title="周计划"
                                aria-label={`${a.name} 周计划`}
                                onClick={() => {
                                  onSelect(a.id)
                                  onOpenWeek?.(a.id)
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                  <rect x="3.5" y="5" width="17" height="15" rx="2" />
                                  <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                title="排课"
                                aria-label={`${a.name} 排课`}
                                onClick={() => {
                                  onSelect(a.id)
                                  onOpenBuilder?.(a.id)
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                  <path d="M4 6h16M4 12h10M4 18h7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => {
                                  onSelect(a.id)
                                  setEditing(a)
                                }}
                              >
                                改
                              </button>
                              <button
                                type="button"
                                className="ghost danger"
                                onClick={() => onDelete(a.id)}
                                aria-label={`删除 ${a.name}`}
                              >
                                删
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function AthleteForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Athlete | null
  onSubmit: (draft: Omit<Athlete, 'id' | 'createdAt'>) => void
  onCancel?: () => void
}) {
  const [event, setEvent] = useState<EventFocus>(initial?.event ?? '1500')
  const [sex, setSex] = useState<Sex | ''>(initial?.sex ?? '')

  useEffect(() => {
    setEvent(initial?.event ?? '1500')
    setSex(initial?.sex ?? '')
  }, [initial])

  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form)
        const name = String(fd.get('name') ?? '').trim()
        const pbRaw = String(fd.get('pb') ?? '').trim()
        const pb = parseTimeInput(pbRaw, { event })
        const notes = String(fd.get('notes') ?? '').trim()
        const errEl = form.querySelector<HTMLElement>('[data-form-error]')
        if (!name) {
          if (errEl) errEl.textContent = '请填写姓名'
          return
        }
        if (pb == null) {
          if (errEl) {
            errEl.textContent = isRoad(event)
              ? '成绩格式：半马/全马用 1:22:30 或 3:15:00'
              : '成绩格式：1:46、1:46.34、1:46:34（百分秒）或 106'
          }
          return
        }
        if (errEl) errEl.textContent = ''
        onSubmit({
          name,
          event,
          sex: sex || undefined,
          pbSeconds: pb,
          notes: notes || undefined,
          weaknesses: initial?.weaknesses,
        })
        if (!initial) form.reset()
      }}
    >
      <label>
        姓名
        <input
          name="name"
          placeholder="例如：张三"
          defaultValue={initial?.name ?? ''}
          required
        />
      </label>
      <label>
        性别（可选）
        <select
          value={sex}
          onChange={(e) => setSex((e.target.value || '') as Sex | '')}
        >
          <option value="">不填</option>
          {SEX_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        主项
        <select
          name="event"
          value={event}
          onChange={(e) => setEvent(e.target.value as EventFocus)}
        >
          <optgroup label="田径">
            {EVENT_OPTIONS.filter((e) => e.group === 'track').map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="公路">
            {EVENT_OPTIONS.filter((e) => e.group === 'road').map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label>
        最好成绩
        <input
          name="pb"
          placeholder="田径 1:46.34；半马 1:22:30；全马 3:15:00"
          defaultValue={
            initial ? formatEditableTime(initial.pbSeconds, initial.event) : ''
          }
          required
        />
      </label>
      <label>
        备注
        <input
          name="notes"
          placeholder="可选"
          defaultValue={initial?.notes ?? ''}
        />
      </label>
      <p className="form-error" data-form-error role="alert" />
      <div className="btn-row">
        {onCancel ? (
          <button type="button" className="ghost solid" onClick={onCancel}>
            取消
          </button>
        ) : null}
        <button type="submit" className="primary">
          {initial ? '保存修改' : '添加运动员'}
        </button>
      </div>
    </form>
  )
}

function formatEditableTime(seconds: number, event: EventFocus): string {
  if (isRoad(event) || seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.round(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
  }
  const m = Math.floor(seconds / 60)
  const rem = seconds - m * 60
  const whole = Math.floor(rem)
  const frac = Math.round((rem - whole) * 100)
  if (frac > 0) {
    return `${m}:${whole.toString().padStart(2, '0')}.${frac.toString().padStart(2, '0')}`
  }
  return `${m}:${whole.toString().padStart(2, '0')}`
}

function isRoad(event: EventFocus) {
  return event === 'half' || event === 'marathon'
}
