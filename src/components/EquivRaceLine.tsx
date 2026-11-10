import { formatTime } from '../domain/paces'
import { equivalentRaceTimes } from '../domain/vdot'
import type { EventFocus } from '../domain/types'

export function EquivRaceLine({
  vdot,
  event,
  showCaveat = false,
}: {
  vdot: number
  event?: EventFocus
  showCaveat?: boolean
}) {
  const rows = equivalentRaceTimes(vdot)
  if (rows.length === 0) return null
  return (
    <p className="equiv-races">
      <span className="equiv-races-label">等价成绩</span>
      {rows.map((r) => (
        <span
          key={r.id}
          className={r.id === event ? 'equiv-races-item is-event' : 'equiv-races-item'}
        >
          {r.label} {formatTime(r.seconds)}
        </span>
      ))}
      {showCaveat ? (
        <em className="equiv-races-note">马拉松推算对多数业余选手往往偏快</em>
      ) : null}
    </p>
  )
}
