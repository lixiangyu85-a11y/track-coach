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
import { startOfWeekISO } from '../domain/dates'
import { CYCLE_TEMPLATES, addDaysISO } from '../domain/templates'
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

  return (
    <div className="panel-grid">
      <section className="card">
        <header className="card-head">
          <h2>周计划</h2>
          <p>
            {athlete.name} · 跑课 {load.totalKm.toFixed(1)} km · 素质课{' '}
            {plannedCond.length} 次
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

        <div className="week-calendar" aria-label="本周日历">
          <strong className="week-calendar-title">本周日历（按课时日期）</strong>
          <div className="week-calendar-grid">
            {calendarDays.map((day) => {
              const hot = day.runs.some((s) => isHighIntensitySession(s))
              return (
                <div
                  key={day.date}
                  className={
                    hot ? 'week-day week-day-high' : 'week-day'
                  }
                >
                  <div className="week-day-head">
                    <span>周{day.label}</span>
                    <time dateTime={day.date}>{day.date.slice(5)}</time>
                  </div>
                  <ul className="week-day-list">
                    {day.runs.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="week-day-item run"
                          onClick={() => onEditSession(s)}
                        >
                          {isHighIntensitySession(s) ? '⚡ ' : ''}
                          {s.title}
                        </button>
                      </li>
                    ))}
                    {day.conds.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="week-day-item cond"
                          onClick={() => onEditConditioning(s)}
                        >
                          素 {s.title}
                        </button>
                      </li>
                    ))}
                    {day.runs.length === 0 && day.conds.length === 0 && (
                      <li className="week-day-empty">休 / 未排</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
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
