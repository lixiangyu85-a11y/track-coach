import { useEffect, useState } from 'react'
import { EquivRaceLine } from './EquivRaceLine'
import { EVENT_OPTIONS, SEX_OPTIONS, sexLabel } from '../domain/catalog'
import { getWeaknessModule } from '../domain/conditioningCatalog'
import {
  athleteVdot,
  formatTime,
  parseTimeInput,
  uid,
} from '../domain/paces'
import type { Athlete, EventFocus, Sex } from '../domain/types'

interface Props {
  athletes: Athlete[]
  activeId: string | null
  onSelect: (id: string) => void
  onSave: (athlete: Athlete) => void
  onUpdate: (athlete: Athlete) => void
  onDelete: (id: string) => void
  onNotice?: (message: string) => void
}

export function AthletesView({
  athletes,
  activeId,
  onSelect,
  onSave,
  onUpdate,
  onDelete,
  onNotice,
}: Props) {
  const [editing, setEditing] = useState<Athlete | null>(null)

  return (
    <div className="panel-grid">
      <section className="card">
        <header className="card-head">
          <h2>{editing ? '编辑运动员' : '运动员档案'}</h2>
          <p>
            {editing
              ? `正在修改：${editing.name}`
              : '录入主项与最好成绩，自动推算 VDOT 与训练配速区'}
          </p>
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
          <p>{athletes.length} 人 · 点击选中；点「改」编辑档案</p>
        </header>
        {athletes.length === 0 ? (
          <p className="empty">还没有运动员，先在左侧添加一位。</p>
        ) : (
          <ul className="athlete-list">
            {athletes.map((a) => (
              <li
                key={a.id}
                className={a.id === activeId ? 'athlete-row active' : 'athlete-row'}
              >
                <button
                  type="button"
                  className="athlete-main"
                  onClick={() => onSelect(a.id)}
                >
                  <span className="athlete-name">{a.name}</span>
                  <span className="athlete-meta">
                    {sexLabel(a.sex) ? `${sexLabel(a.sex)} · ` : ''}
                    {EVENT_OPTIONS.find((e) => e.id === a.event)?.label} · PB{' '}
                    {formatTime(a.pbSeconds)} · VDOT {athleteVdot(a).toFixed(1)}
                    {(a.weaknesses?.length ?? 0) > 0
                      ? ` · 弱项 ${a.weaknesses!
                          .map((id) => getWeaknessModule(id).shortName)
                          .join('/')}`
                      : ''}
                  </span>
                  <EquivRaceLine
                    vdot={athleteVdot(a)}
                    event={a.event}
                    showCaveat={a.id === activeId}
                  />
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
              </li>
            ))}
          </ul>
        )}
      </section>
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
