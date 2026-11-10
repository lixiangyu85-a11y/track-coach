import { useEffect, useMemo, useState } from 'react'
import { DateInput } from './DateInput'
import {
  WEAKNESS_MODULES,
  getWeaknessModule,
} from '../domain/conditioningCatalog'
import {
  conditioningToText,
  copyText,
  downloadText,
  printConditioningCard,
} from '../domain/exportText'
import { uid } from '../domain/paces'
import { addDaysISO, todayISO } from '../domain/dates'
import type {
  Athlete,
  ConditioningItem,
  ConditioningSession,
  WeaknessId,
} from '../domain/types'

interface Props {
  athlete: Athlete | null
  sessions: ConditioningSession[]
  editingSession: ConditioningSession | null
  onUpdateWeaknesses: (athleteId: string, weaknesses: WeaknessId[]) => void
  onSave: (session: ConditioningSession) => void
  onUpdate: (session: ConditioningSession) => void
  onDelete: (id: string) => void
  onCancelEdit: () => void
  onStartEdit: (session: ConditioningSession) => void
  onNotice?: (message: string) => void
}

export function ConditioningView({
  athlete,
  sessions,
  editingSession,
  onUpdateWeaknesses,
  onSave,
  onUpdate,
  onDelete,
  onCancelEdit,
  onStartEdit,
  onNotice,
}: Props) {
  const [pickedWeaknesses, setPickedWeaknesses] = useState<WeaknessId[]>([])
  const [selectedExerciseKeys, setSelectedExerciseKeys] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => todayISO())
  const [coachNote, setCoachNote] = useState('')
  const [items, setItems] = useState<ConditioningItem[]>([])

  useEffect(() => {
    if (!editingSession) return
    setTitle(editingSession.title)
    setDate(editingSession.date)
    setCoachNote(editingSession.coachNote ?? '')
    setItems(editingSession.items.map((i) => ({ ...i })))
    setPickedWeaknesses([...editingSession.weaknessIds])
  }, [editingSession])

  const athleteSessions = useMemo(
    () =>
      athlete
        ? sessions
            .filter((s) => s.athleteId === athlete.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [athlete, sessions],
  )

  if (!athlete) {
    return (
      <div className="card">
        <p className="empty">请先选中运动员，再标记弱项并组素质课。</p>
      </div>
    )
  }

  const marked = athlete.weaknesses ?? []

  function toggleAthleteWeakness(id: WeaknessId) {
    if (!athlete) return
    const next = marked.includes(id)
      ? marked.filter((x) => x !== id)
      : [...marked, id]
    onUpdateWeaknesses(athlete.id, next)
  }

  function togglePick(id: WeaknessId) {
    setPickedWeaknesses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function loadFromMarked() {
    setPickedWeaknesses(marked.length ? [...marked] : [])
  }

  const availableExercises = useMemo(() => {
    const ids = pickedWeaknesses.length ? pickedWeaknesses : marked
    return ids.flatMap((wid) => {
      const mod = getWeaknessModule(wid)
      return mod.exercises.map((ex) => ({
        key: `${wid}:${ex.id}`,
        weaknessId: wid,
        moduleName: mod.shortName,
        exercise: ex,
      }))
    })
  }, [pickedWeaknesses, marked])

  function toggleExercise(key: string) {
    setSelectedExerciseKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function addSelectedToSession() {
    const toAdd = availableExercises.filter((x) =>
      selectedExerciseKeys.includes(x.key),
    )
    if (toAdd.length === 0) {
      onNotice?.('请先勾选动作')
      return
    }
    const nextItems: ConditioningItem[] = toAdd.map((x) => ({
      id: uid('cex'),
      exerciseId: x.exercise.id,
      weaknessId: x.weaknessId,
      name: x.exercise.name,
      sets: x.exercise.sets,
      reps: x.exercise.reps,
      cues: x.exercise.cues,
    }))
    setItems((prev) => {
      const existing = new Set(prev.map((p) => `${p.weaknessId}:${p.exerciseId}`))
      const merged = [
        ...prev,
        ...nextItems.filter((n) => !existing.has(`${n.weaknessId}:${n.exerciseId}`)),
      ]
      return merged
    })
    if (!title) {
      const names = (pickedWeaknesses.length ? pickedWeaknesses : marked)
        .map((id) => getWeaknessModule(id).shortName)
        .join('+')
      setTitle(`素质：${names || '综合'}`)
    }
    setSelectedExerciseKeys([])
  }

  function addPresetModule(id: WeaknessId) {
    const mod = getWeaknessModule(id)
    const next: ConditioningItem[] = mod.exercises.map((ex) => ({
      id: uid('cex'),
      exerciseId: ex.id,
      weaknessId: id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      cues: ex.cues,
    }))
    setItems((prev) => {
      const existing = new Set(prev.map((p) => `${p.weaknessId}:${p.exerciseId}`))
      return [
        ...prev,
        ...next.filter((n) => !existing.has(`${n.weaknessId}:${n.exerciseId}`)),
      ]
    })
    setPickedWeaknesses((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (!title) setTitle(`素质：${mod.shortName}`)
  }

  function updateItem(id: string, patch: Partial<ConditioningItem>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  function handleSave() {
    if (!athlete) return
    if (items.length === 0) {
      onNotice?.('请至少添加一个动作')
      return
    }
    const weaknessIds = [
      ...new Set(items.map((i) => i.weaknessId)),
    ] as WeaknessId[]
    const payload = {
      athleteId: athlete.id,
      title: title || '素质训练',
      date,
      weaknessIds,
      items,
      coachNote: coachNote || undefined,
    }
    if (editingSession) {
      onUpdate({ ...editingSession, ...payload })
      setItems([])
      setTitle('')
      setCoachNote('')
      setSelectedExerciseKeys([])
      onNotice?.('素质课已更新')
      return
    }
    onSave({
      id: uid('cond'),
      ...payload,
    })
    setItems([])
    setTitle('')
    setCoachNote('')
    setSelectedExerciseKeys([])
    setDate(addDaysISO(date, 1))
    onNotice?.('素质课已保存，可在「周计划」中勾选')
  }

  return (
    <div className="builder-layout">
      <section className="card">
        <header className="card-head">
          <h2>日常素质训练</h2>
          <p>{athlete.name}</p>
        </header>

        <h3 className="subhead">1. 档案弱项</h3>
        <div className="weakness-grid">
          {WEAKNESS_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={
                marked.includes(m.id) ? 'weakness-chip active' : 'weakness-chip'
              }
              onClick={() => toggleAthleteWeakness(m.id)}
            >
              {m.shortName}
            </button>
          ))}
        </div>

        <h3 className="subhead">2. 本次课弱项</h3>
        <div className="btn-row tight">
          <button type="button" className="ghost solid" onClick={loadFromMarked}>
            用档案弱项填充
          </button>
        </div>
        <div className="weakness-grid">
          {WEAKNESS_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={
                pickedWeaknesses.includes(m.id)
                  ? 'weakness-chip active'
                  : 'weakness-chip'
              }
              onClick={() => togglePick(m.id)}
            >
              {m.shortName}
            </button>
          ))}
        </div>

        <div className="module-cards">
          {(pickedWeaknesses.length ? pickedWeaknesses : marked).map((id) => {
            const m = getWeaknessModule(id)
            return (
              <article key={id} className="module-card">
                <header>
                  <h4>{m.name}</h4>
                  <button
                    type="button"
                    className="ghost solid"
                    onClick={() => addPresetModule(id)}
                  >
                    整模块加入
                  </button>
                </header>
                <p className="muted">{m.purpose}</p>
                <p className="hint">{m.frequencyHint}</p>
              </article>
            )
          })}
        </div>

        {availableExercises.length > 0 && (
          <>
            <h3 className="subhead">3. 勾选动作</h3>
            <ul className="exercise-pick">
              {availableExercises.map((x) => (
                <li key={x.key}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selectedExerciseKeys.includes(x.key)}
                      onChange={() => toggleExercise(x.key)}
                    />
                    <span>
                      <strong>
                        [{x.moduleName}] {x.exercise.name}
                      </strong>
                      <em>
                        {x.exercise.sets}×{x.exercise.reps} · {x.exercise.cues}
                      </em>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" className="primary" onClick={addSelectedToSession}>
              将勾选动作加入素质课
            </button>
          </>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2>{editingSession ? '编辑素质课' : '素质课预览'}</h2>
          <p>{items.length} 个动作</p>
        </header>

        <div className="form-grid">
          <label>
            日期
            <DateInput value={date} onChange={setDate} required />
          </label>
          <label>
            标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：素质：脚踝+核心"
            />
          </label>
          <label className="span-2">
            教练备注
            <input
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              placeholder="疼痛即停；质量优先于次数"
            />
          </label>
        </div>

        {items.length === 0 ? (
          <p className="empty">从左侧抽取模块或勾选动作。</p>
        ) : (
          <ol className="block-list">
            {items.map((item, i) => (
              <li key={item.id} className="block-item">
                <div className="block-top">
                  <span className="block-index">{i + 1}</span>
                  <div>
                    <strong>
                      {item.name}{' '}
                      <span className="tag">
                        {getWeaknessModule(item.weaknessId).shortName}
                      </span>
                    </strong>
                    <p>{item.cues}</p>
                  </div>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => removeItem(item.id)}
                  >
                    移除
                  </button>
                </div>
                <div className="block-edit">
                  <label>
                    组数
                    <input
                      type="number"
                      value={item.sets}
                      onChange={(e) =>
                        updateItem(item.id, {
                          sets: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </label>
                  <label>
                    次数/时间
                    <input
                      value={item.reps}
                      onChange={(e) =>
                        updateItem(item.id, { reps: e.target.value })
                      }
                    />
                  </label>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="btn-row">
          {editingSession ? (
            <button
              type="button"
              className="ghost solid"
              onClick={() => {
                setItems([])
                setTitle('')
                setCoachNote('')
                onCancelEdit()
              }}
            >
              取消编辑
            </button>
          ) : null}
          <button
            type="button"
            className="primary"
            onClick={handleSave}
            disabled={items.length === 0}
          >
            {editingSession ? '更新素质课' : '保存素质课'}
          </button>
        </div>

        <h3 className="subhead">已保存的素质课</h3>
        {athleteSessions.length === 0 ? (
          <p className="empty">暂无。</p>
        ) : (
          <ul className="session-pick">
            {athleteSessions.map((s) => (
              <li key={s.id}>
                <span className="check-row">
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
                </span>
                <div className="row-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onStartEdit(s)}
                  >
                    编辑
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
                    onClick={() => onDelete(s.id)}
                  >
                    删
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
