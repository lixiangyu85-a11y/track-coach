import { useEffect, useMemo, useState } from 'react'
import { DateInput } from './DateInput'
import {
  DISTANCES,
  EVENT_OPTIONS,
  METHODS,
  PHASE_OPTIONS,
  formatDistance,
  getMethod,
} from '../domain/catalog'
import {
  COMBO_CATEGORY_LABEL,
  COMBO_PRESETS,
  CUSTOM_COMBO_DISTANCES,
  expandComboSteps,
  type ComboPreset,
} from '../domain/comboCatalog'
import {
  athleteVdot,
  blockLabel,
  defaultJogRestMeters,
  formatPacePerKm,
  formatRest,
  formatTime,
  intensityBandTimes,
  racePaceSecPerMeter,
  sessionVolumeMeters,
  suggestBlock,
  uid,
} from '../domain/paces'
import { cloneSessionForAthletes, paceCompareRows } from '../domain/sessionClone'
import {
  COOLDOWN_TEMPLATES,
  VENUE_OPTIONS,
  WARMUP_TEMPLATES,
  type VenueId,
} from '../domain/templates'
import { addDaysISO, todayISO } from '../domain/dates'
import { allZonePaces } from '../domain/vdot'
import type {
  Athlete,
  MethodId,
  PeriodPhase,
  RestMode,
  SessionBlock,
  TrainingSession,
} from '../domain/types'


const EASY_WARMUP_IDS = new Set(['track_easy', 'road_easy', 'mixed_recovery'])

function sessionIsEasy(methodId: MethodId, blocks: SessionBlock[]): boolean {
  if (blocks.length > 0) {
    return blocks.every((b) => getMethod(b.methodId).zone === 'E')
  }
  return getMethod(methodId).zone === 'E'
}

function suggestedWarmup(venue: VenueId, easy: boolean) {
  if (easy) {
    return (
      WARMUP_TEMPLATES.find((t) => t.venue === venue && EASY_WARMUP_IDS.has(t.id)) ??
      WARMUP_TEMPLATES.find((t) => t.id === 'mixed_recovery') ??
      WARMUP_TEMPLATES.find((t) => t.venue === venue)
    )
  }
  return (
    WARMUP_TEMPLATES.find((t) => t.venue === venue && !EASY_WARMUP_IDS.has(t.id)) ??
    WARMUP_TEMPLATES.find((t) => t.venue === venue)
  )
}

function isTemplateWarmup(note: string) {
  return !note || WARMUP_TEMPLATES.some((t) => t.text === note)
}

interface Props {
  athlete: Athlete | null
  allAthletes: Athlete[]
  editingSession: TrainingSession | null
  onSave: (session: TrainingSession) => void
  onUpdate: (session: TrainingSession) => void
  onSaveMany: (sessions: TrainingSession[]) => void
  onCancelEdit: () => void
  onNotice?: (message: string) => void
}

export function SessionBuilder({
  athlete,
  allAthletes,
  editingSession,
  onSave,
  onUpdate,
  onSaveMany,
  onCancelEdit,
  onNotice,
}: Props) {
  const [phase, setPhase] = useState<PeriodPhase>('build')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => todayISO())
  const [venue, setVenue] = useState<VenueId>('track')
  const [mainFocus, setMainFocus] = useState('')
  const [methodId, setMethodId] = useState<MethodId>('interval')
  const [distanceM, setDistanceM] = useState(400)
  const [reps, setReps] = useState(5)
  const [sets, setSets] = useState(2)
  const [blocks, setBlocks] = useState<SessionBlock[]>([])
  const [warmupNote, setWarmupNote] = useState(
    WARMUP_TEMPLATES.find((t) => t.id === 'track_quality')?.text ?? '',
  )
  const [cooldownNote, setCooldownNote] = useState(
    COOLDOWN_TEMPLATES.find((t) => t.id === 'cd_track')?.text ?? '',
  )
  const [coachNote, setCoachNote] = useState('')
  const [cloneIds, setCloneIds] = useState<string[]>([])
  const [comboCategory, setComboCategory] = useState<ComboPreset['category'] | 'all'>(
    'mixed',
  )
  const [customDistances, setCustomDistances] = useState<number[]>([200, 400, 600])
  const [customRounds, setCustomRounds] = useState(1)
  const [customRepsEach, setCustomRepsEach] = useState(1)
  const [defaultRestMode, setDefaultRestMode] = useState<RestMode>('time')

  useEffect(() => {
    if (!editingSession) return
    setPhase(editingSession.phase)
    setTitle(editingSession.title)
    setDate(editingSession.date)
    setVenue(editingSession.venue ?? 'track')
    setMainFocus(editingSession.mainFocus ?? '')
    setWarmupNote(editingSession.warmupNote)
    setCooldownNote(editingSession.cooldownNote)
    setCoachNote(editingSession.coachNote ?? '')
    setBlocks(editingSession.blocks.map((b) => ({ ...b })))
    setCloneIds([])
  }, [editingSession])

  const method = getMethod(methodId)
  const filteredCombos = useMemo(
    () =>
      comboCategory === 'all'
        ? COMBO_PRESETS
        : COMBO_PRESETS.filter((c) => c.category === comboCategory),
    [comboCategory],
  )
  const distanceOptions = method.defaultDistances.length
    ? method.defaultDistances
    : DISTANCES

  const band = useMemo(() => {
    if (!athlete) return null
    return intensityBandTimes(athlete, methodId, distanceM, phase)
  }, [athlete, methodId, distanceM, phase])

  const zoneSummary = useMemo(() => {
    if (!athlete) return null
    return allZonePaces(athleteVdot(athlete), phase)
  }, [athlete, phase])

  const compareRows = useMemo(() => {
    if (allAthletes.length < 2) return []
    return paceCompareRows(allAthletes, methodId, distanceM, phase)
  }, [allAthletes, methodId, distanceM, phase])


  useEffect(() => {
    if (editingSession) return
    const suggested = suggestedWarmup(venue, sessionIsEasy(methodId, blocks))
    if (!suggested) return
    setWarmupNote((prev) =>
      isTemplateWarmup(prev) && prev !== suggested.text ? suggested.text : prev,
    )
  }, [methodId, blocks, venue, editingSession])

  const warmupChoices = WARMUP_TEMPLATES.filter(
    (t) => t.venue === 'any' || t.venue === venue,
  )
  const cooldownChoices = COOLDOWN_TEMPLATES.filter(
    (t) => t.venue === 'any' || t.venue === venue,
  )

  if (!athlete) {
    return (
      <div className="card">
        <p className="empty">请先在「运动员」页选中一位运动员，再开始排课。</p>
      </div>
    )
  }

  const vdot = athleteVdot(athlete)
  const racePace = racePaceSecPerMeter(athlete)
  const others = allAthletes.filter((a) => a.id !== athlete.id)

  function withRestPreference(
    draft: Omit<SessionBlock, 'id'>,
  ): Omit<SessionBlock, 'id'> {
    if (draft.restSeconds === 0 && draft.restJogMeters === 0) return draft
    if (defaultRestMode === 'jog') {
      return {
        ...draft,
        restMode: 'jog',
        restJogMeters:
          draft.restJogMeters || defaultJogRestMeters(draft.distanceM),
        setRestMode: draft.sets > 1 ? 'jog' : draft.setRestMode,
        setRestJogMeters:
          draft.sets > 1
            ? draft.setRestJogMeters || defaultJogRestMeters(draft.distanceM)
            : 0,
      }
    }
    return { ...draft, restMode: 'time', setRestMode: 'time' }
  }

  function addBlock() {
    if (!athlete) return
    const draft = withRestPreference(
      suggestBlock(athlete, methodId, distanceM, phase, reps, sets),
    )
    setBlocks((prev) => [...prev, { ...draft, id: uid('blk') }])
    if (!title) {
      const m = getMethod(methodId)
      const label =
        sets > 1
          ? `${sets}×(${reps}×${formatDistance(distanceM)})`
          : `${reps}×${formatDistance(distanceM)}`
      setTitle(`${m.name} ${label}`)
    }
  }

  function appendSteps(
    steps: { distanceM: number; reps: number }[],
    mid: MethodId,
    label: string,
  ) {
    if (!athlete) return
    const next = steps.map((step) => {
      const draft = withRestPreference(
        suggestBlock(athlete, mid, step.distanceM, phase, step.reps, 1),
      )
      return { ...draft, id: uid('blk') }
    })
    setBlocks((prev) => [...prev, ...next])
    setMethodId(mid)
    if (!title) setTitle(`${getMethod(mid).name} ${label}`)
  }

  function resetForm() {
    setBlocks([])
    setTitle('')
    setCoachNote('')
    setMainFocus('')
    setCloneIds([])
  }

  function applyCombo(preset: ComboPreset) {
    appendSteps(expandComboSteps(preset), preset.methodId, preset.pattern)
  }

  function applyCustomCombo() {
    if (customDistances.length === 0) {
      onNotice?.('请至少选择一个距离')
      return
    }
    const steps: { distanceM: number; reps: number }[] = []
    for (let r = 0; r < customRounds; r += 1) {
      for (const d of customDistances) {
        steps.push({ distanceM: d, reps: customRepsEach })
      }
    }
    const pattern =
      customRounds > 1
        ? `${customRounds}×(${customDistances.join('+')})`
        : customDistances.join('+')
    appendSteps(steps, methodId, pattern)
  }

  function toggleCustomDistance(d: number) {
    setCustomDistances((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d)
      return [...prev, d] // keep click order（可做上/下阶梯）
    })
  }

  function updateBlock(id: string, patch: Partial<SessionBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  function draftPayload() {
    return {
      title: title || `${getMethod(blocks[0].methodId).name}`,
      phase,
      date,
      venue,
      mainFocus,
      warmupNote,
      cooldownNote,
      coachNote: coachNote || undefined,
      blocks,
    }
  }

  function handleSave() {
    if (!athlete) return
    if (blocks.length === 0) {
      onNotice?.('请至少添加一个训练模块')
      return
    }
    const payload = draftPayload()
    if (editingSession) {
      onUpdate({
        ...editingSession,
        ...payload,
        athleteId: athlete.id,
      })
      resetForm()
      onNotice?.('课时已更新')
      return
    }
    onSave({
      id: uid('ses'),
      athleteId: athlete.id,
      ...payload,
    })
    resetForm()
    setDate(addDaysISO(date, 1))
    onNotice?.('课时已保存，可在「周计划」中挂到本周')
  }

  function handleSaveClone() {
    if (!athlete) return
    if (editingSession) {
      handleSave()
      return
    }
    if (blocks.length === 0) {
      onNotice?.('请至少添加一个训练模块')
      return
    }
    const targets = allAthletes.filter(
      (a) => a.id === athlete.id || cloneIds.includes(a.id),
    )
    if (targets.length <= 1) {
      handleSave()
      return
    }
    const sessions = cloneSessionForAthletes(draftPayload(), targets)
    onSaveMany(sessions)
    resetForm()
    setDate(addDaysISO(date, 1))
    onNotice?.(`已为 ${targets.length} 名运动员生成个性化配速课时`)
  }

  return (
    <div className="builder-layout">
      <section className="card">
        <header className="card-head">
          <h2>{editingSession ? '编辑课时' : '课时搭建'}</h2>
          <p>
            {athlete.name} ·{' '}
            {EVENT_OPTIONS.find((e) => e.id === athlete.event)?.label} · VDOT{' '}
            {vdot.toFixed(1)} · {formatPacePerKm(racePace)}
            {editingSession ? ' · 编辑中' : ''}
          </p>
        </header>

        {zoneSummary && (
          <div className="zone-strip">
            {(['E', 'M', 'T', 'I', 'R'] as const).map((z) => (
              <div
                key={z}
                className={method.zone === z ? 'zone-pill active' : 'zone-pill'}
              >
                <span>{z}</span>
                <strong>{formatTime(zoneSummary[z].midSecPerKm)}/km</strong>
              </div>
            ))}
          </div>
        )}

        <div className="form-grid">
          <label>
            周期阶段
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
          <label>
            日期
            <DateInput value={date} onChange={setDate} required />
          </label>
          <label>
            场地
            <select
              value={venue}
              onChange={(e) => {
                const v = e.target.value as VenueId
                setVenue(v)
                const wu = suggestedWarmup(v, sessionIsEasy(methodId, blocks))
                const cd = COOLDOWN_TEMPLATES.find((t) => t.venue === v)
                setWarmupNote((prev) =>
                  wu && isTemplateWarmup(prev) ? wu.text : prev,
                )
                if (cd) setCooldownNote(cd.text)
              }}
            >
              {VENUE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            热身模板
            <select
              value=""
              onChange={(e) => {
                const t = WARMUP_TEMPLATES.find((x) => x.id === e.target.value)
                if (t) setWarmupNote(t.text)
              }}
            >
              <option value="">选择填入…</option>
              {warmupChoices.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            课时标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="自动生成，也可手改"
            />
          </label>
          <label className="span-2">
            主课要点（教案）
            <input
              value={mainFocus}
              onChange={(e) => setMainFocus(e.target.value)}
              placeholder="如：控速不求快；第 3–4 组保持步幅；弯道重心"
            />
          </label>
        </div>

        <div className="combo-panel">
          <h3>组合课模板（多距离一键加入）</h3>
          <p className="hint">
            例如 200+400+600：点模板即可生成多段，每段单独配速与间歇。
          </p>
          <div className="weakness-grid">
            <button
              type="button"
              className={
                comboCategory === 'all' ? 'weakness-chip active' : 'weakness-chip'
              }
              onClick={() => setComboCategory('all')}
            >
              全部
            </button>
            {(Object.keys(COMBO_CATEGORY_LABEL) as ComboPreset['category'][]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  className={
                    comboCategory === cat
                      ? 'weakness-chip active'
                      : 'weakness-chip'
                  }
                  onClick={() => setComboCategory(cat)}
                >
                  {COMBO_CATEGORY_LABEL[cat]}
                </button>
              ),
            )}
          </div>
          <div className="combo-list">
            {filteredCombos.map((c) => (
              <button
                key={c.id}
                type="button"
                className="combo-item"
                onClick={() => applyCombo(c)}
                title={c.purpose}
              >
                <strong>{c.pattern}</strong>
                <span>{c.name}</span>
                <em>{c.purpose}</em>
              </button>
            ))}
          </div>

          <h4 className="subhead">自定义组合</h4>
          <p className="hint">按点击顺序加入距离；可设轮数。如勾选 200/400/600 且轮数=2 → 2×(200+400+600)</p>
          <div className="weakness-grid">
            {CUSTOM_COMBO_DISTANCES.map((d) => (
              <button
                key={d}
                type="button"
                className={
                  customDistances.includes(d)
                    ? 'weakness-chip active'
                    : 'weakness-chip'
                }
                onClick={() => toggleCustomDistance(d)}
              >
                {d}m
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>
              每段次数
              <input
                type="number"
                min={1}
                max={20}
                value={customRepsEach}
                onChange={(e) => setCustomRepsEach(Number(e.target.value) || 1)}
              />
            </label>
            <label>
              整串轮数
              <input
                type="number"
                min={1}
                max={10}
                value={customRounds}
                onChange={(e) => setCustomRounds(Number(e.target.value) || 1)}
              />
            </label>
            <label>
              所用方法区
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value as MethodId)}
              >
                {METHODS.filter((m) => !m.continuous).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}（{m.zone}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              预览
              <input
                readOnly
                value={
                  customDistances.length
                    ? customRounds > 1
                      ? `${customRounds}×(${customDistances.join('+')})`
                      : customDistances.join('+')
                    : '未选距离'
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="primary"
            onClick={applyCustomCombo}
            disabled={customDistances.length === 0}
          >
            加入自定义组合
          </button>
        </div>

        <div className="module-picker">
          <h3>单距离模块（可继续追加）</h3>
          <div className="form-grid">
            <label>
              默认间歇方式
              <select
                value={defaultRestMode}
                onChange={(e) =>
                  setDefaultRestMode(e.target.value as RestMode)
                }
              >
                <option value="time">按时间（秒）</option>
                <option value="jog">按慢跑距离（如休 200m）</option>
              </select>
              <span className="hint">新加入的段落会套用此方式，仍可在预览里改</span>
            </label>
            <label>
              训练方法
              <select
                value={methodId}
                onChange={(e) => {
                  const next = e.target.value as MethodId
                  setMethodId(next)
                  const m = getMethod(next)
                  setDistanceM(m.defaultDistances[0])
                  setReps(m.defaultReps)
                  setSets(m.defaultSets)
                }}
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}（{m.zone}）
                  </option>
                ))}
              </select>
              <span className="hint">{method.purpose}</span>
            </label>
            <label>
              距离
              <select
                value={distanceM}
                onChange={(e) => setDistanceM(Number(e.target.value))}
              >
                {distanceOptions.map((d) => (
                  <option key={d} value={d}>
                    {formatDistance(d)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              每组次数
              <input
                type="number"
                min={1}
                max={40}
                value={reps}
                onChange={(e) => setReps(Number(e.target.value) || 1)}
              />
            </label>
            <label>
              套组数
              <input
                type="number"
                min={1}
                max={10}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value) || 1)}
              />
              <span className="hint">
                {sets > 1
                  ? `结构：${sets}×(${reps}×${formatDistance(distanceM)})`
                  : `结构：${reps}×${formatDistance(distanceM)}`}
              </span>
            </label>
          </div>

          {band && (
            <div className="pace-suggest">
              <div>
                <span className="label">Daniels {band.zone} 建议单次</span>
                <strong>
                  {formatTime(band.minSec)} – {formatTime(band.maxSec)}
                </strong>
              </div>
              <div>
                <span className="label">默认中值</span>
                <strong>{formatTime(band.midSec)}</strong>
              </div>
              <button type="button" className="primary" onClick={addBlock}>
                加入课时
              </button>
            </div>
          )}

          {compareRows.length > 1 && (
            <div className="compare-box">
              <h4>
                多人配速对照 · 当前模块 {formatDistance(distanceM)}（{method.zone}）
              </h4>
              <table className="method-table">
                <thead>
                  <tr>
                    <th>运动员</th>
                    <th>建议区间</th>
                    <th>中值</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr
                      key={row.athlete.id}
                      className={
                        row.athlete.id === athlete.id ? 'row-active' : undefined
                      }
                    >
                      <td>
                        {row.athlete.name}
                        {row.athlete.id === athlete.id ? '（当前）' : ''}
                      </td>
                      <td>
                        {formatTime(row.minSec)} – {formatTime(row.maxSec)}
                      </td>
                      <td>{formatTime(row.midSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="form-stack tight">
          <label>
            热身
            <textarea
              rows={2}
              value={warmupNote}
              onChange={(e) => setWarmupNote(e.target.value)}
            />
          </label>
          <label>
            整理模板
            <select
              value=""
              onChange={(e) => {
                const t = COOLDOWN_TEMPLATES.find((x) => x.id === e.target.value)
                if (t) setCooldownNote(t.text)
              }}
            >
              <option value="">选择填入…</option>
              {cooldownChoices.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            整理
            <textarea
              rows={2}
              value={cooldownNote}
              onChange={(e) => setCooldownNote(e.target.value)}
            />
          </label>
          <label>
            教练备注
            <input
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              placeholder="天气、分组、安全提示等"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h2>课时预览</h2>
          <p>
            {VENUE_OPTIONS.find((v) => v.id === venue)?.label} · 质量距离{' '}
            {(sessionVolumeMeters(blocks) / 1000).toFixed(2)} km · {blocks.length}{' '}
            个模块
          </p>
        </header>

        {mainFocus ? <p className="note">主课要点：{mainFocus}</p> : null}

        {blocks.length === 0 ? (
          <p className="empty">例如：2×(5×400) 间歇，或 12km 马拉松配速跑。</p>
        ) : (
          <ol className="block-list">
            {blocks.map((b, i) => {
              const m = getMethod(b.methodId)
              return (
                <li key={b.id} className="block-item">
                  <div className="block-top">
                    <span className="block-index">{i + 1}</span>
                    <div>
                      <strong>
                        {blockLabel(b)} · {m.name}（{m.zone}）
                      </strong>
                      <p>
                        目标 {formatTime(b.targetSeconds)} · 间歇{' '}
                        {formatRest(
                          b.restMode,
                          b.restSeconds,
                          b.restJogMeters ?? 0,
                        )}
                        {(b.sets ?? 1) > 1
                          ? ` · 组间 ${formatRest(
                              b.setRestMode,
                              b.setRestSeconds,
                              b.setRestJogMeters ?? 0,
                            )}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => removeBlock(b.id)}
                    >
                      移除
                    </button>
                  </div>
                  <div className="block-edit">
                    <label>
                      目标秒
                      <input
                        type="number"
                        value={b.targetSeconds}
                        onChange={(e) =>
                          updateBlock(b.id, {
                            targetSeconds: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                    <label>
                      间歇方式
                      <select
                        value={b.restMode ?? 'time'}
                        onChange={(e) =>
                          updateBlock(b.id, {
                            restMode: e.target.value as RestMode,
                          })
                        }
                      >
                        <option value="time">时间</option>
                        <option value="jog">慢跑距离</option>
                      </select>
                    </label>
                    {(b.restMode ?? 'time') === 'time' ? (
                      <label>
                        间歇秒
                        <input
                          type="number"
                          value={b.restSeconds}
                          onChange={(e) =>
                            updateBlock(b.id, {
                              restSeconds: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        慢跑米
                        <select
                          value={b.restJogMeters || 200}
                          onChange={(e) =>
                            updateBlock(b.id, {
                              restJogMeters: Number(e.target.value) || 0,
                            })
                          }
                        >
                          {[100, 200, 300, 400, 600, 800].map((m) => (
                            <option key={m} value={m}>
                              {m}m
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      次数
                      <input
                        type="number"
                        value={b.reps}
                        onChange={(e) =>
                          updateBlock(b.id, {
                            reps: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      套组
                      <input
                        type="number"
                        value={b.sets ?? 1}
                        onChange={(e) =>
                          updateBlock(b.id, {
                            sets: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      组间方式
                      <select
                        value={b.setRestMode ?? 'time'}
                        onChange={(e) =>
                          updateBlock(b.id, {
                            setRestMode: e.target.value as RestMode,
                          })
                        }
                      >
                        <option value="time">时间</option>
                        <option value="jog">慢跑距离</option>
                      </select>
                    </label>
                    {(b.setRestMode ?? 'time') === 'time' ? (
                      <label>
                        组间秒
                        <input
                          type="number"
                          value={b.setRestSeconds ?? 0}
                          onChange={(e) =>
                            updateBlock(b.id, {
                              setRestSeconds: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        组间慢跑米
                        <select
                          value={b.setRestJogMeters || 200}
                          onChange={(e) =>
                            updateBlock(b.id, {
                              setRestJogMeters: Number(e.target.value) || 0,
                            })
                          }
                        >
                          {[100, 200, 300, 400, 600, 800].map((m) => (
                            <option key={m} value={m}>
                              {m}m
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {others.length > 0 && (
          <div className="clone-box">
            <h4>同步生成给其他运动员（按各自 VDOT 重算配速）</h4>
            <div className="weakness-grid">
              {others.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={
                    cloneIds.includes(a.id)
                      ? 'weakness-chip active'
                      : 'weakness-chip'
                  }
                  onClick={() =>
                    setCloneIds((prev) =>
                      prev.includes(a.id)
                        ? prev.filter((id) => id !== a.id)
                        : [...prev, a.id],
                    )
                  }
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="btn-row">
          {editingSession ? (
            <>
              <button
                type="button"
                className="ghost solid"
                onClick={() => {
                  resetForm()
                  onCancelEdit()
                }}
              >
                取消编辑
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleSave}
                disabled={blocks.length === 0}
              >
                更新课时
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="primary"
                onClick={handleSave}
                disabled={blocks.length === 0}
              >
                保存当前运动员
              </button>
              {others.length > 0 ? (
                <button
                  type="button"
                  className="ghost solid"
                  onClick={handleSaveClone}
                  disabled={blocks.length === 0 || cloneIds.length === 0}
                  title={
                    cloneIds.length === 0
                      ? '请先勾选要同步的运动员'
                      : undefined
                  }
                >
                  保存并同步选中
                </button>
              ) : (
                <p className="field-hint">
                  添加其他运动员后，可将本课同步给他们
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
