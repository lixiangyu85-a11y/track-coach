import { useState } from 'react'
import { uid } from '../domain/paces'
import type { SessionLog } from '../domain/types'

interface Props {
  kind: 'run' | 'conditioning'
  refId: string
  athleteId: string
  title: string
  existing?: SessionLog | null
  onSave: (log: SessionLog) => void
  onClose: () => void
}

export function CheckInModal({
  kind,
  refId,
  athleteId,
  title,
  existing,
  onSave,
  onClose,
}: Props) {
  const [completed, setCompleted] = useState(existing?.completed ?? true)
  const [doneSummary, setDoneSummary] = useState(
    existing?.doneSummary ?? '按计划完成',
  )
  const [actualNote, setActualNote] = useState(existing?.actualNote ?? '')
  const [rpe, setRpe] = useState(existing?.rpe ?? 6)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="card-head">
          <h2>课后打卡</h2>
          <p>{title}</p>
        </header>
        <div className="form-stack">
          <label className="check-row">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
            />
            <span>已完成（未勾选表示部分完成/未练）</span>
          </label>
          <label>
            完成情况
            <input
              value={doneSummary}
              onChange={(e) => setDoneSummary(e.target.value)}
              placeholder="如：完成 5/6 组；最后一组放慢"
            />
          </label>
          <label>
            实际配速 / 感受
            <textarea
              rows={3}
              value={actualNote}
              onChange={(e) => setActualNote(e.target.value)}
              placeholder="如：400 按 68–70；第 3 组喘不过来"
            />
          </label>
          <label>
            RPE 主观疲劳（1 很轻松 – 10 极限）
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
            />
            <strong className="rpe-value">{rpe}</strong>
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="ghost solid" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onSave({
                id: existing?.id ?? uid('log'),
                kind,
                refId,
                athleteId,
                completed,
                doneSummary: doneSummary.trim() || '已记录',
                actualNote: actualNote.trim() || undefined,
                rpe,
                loggedAt: new Date().toISOString(),
              })
              onClose()
            }}
          >
            保存打卡
          </button>
        </div>
      </div>
    </div>
  )
}
