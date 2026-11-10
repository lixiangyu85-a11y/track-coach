import { EVENT_OPTIONS, PHASE_OPTIONS, getMethod } from './catalog'
import { getWeaknessModule } from './conditioningCatalog'
import {
  athleteVdot,
  blockLabel,
  formatRest,
  formatTime,
  sessionVolumeMeters,
} from './paces'
import { VENUE_OPTIONS } from './templates'
import type {
  Athlete,
  ConditioningSession,
  TrainingSession,
  WeekPlan,
} from './types'

export function sessionToText(athlete: Athlete, session: TrainingSession): string {
  const phase = PHASE_OPTIONS.find((p) => p.id === session.phase)?.label ?? session.phase
  const event = EVENT_OPTIONS.find((e) => e.id === athlete.event)?.label ?? athlete.event
  const venue =
    VENUE_OPTIONS.find((v) => v.id === session.venue)?.label ?? session.venue ?? ''
  const lines = [
    `Track Coach 课时`,
    `${athlete.name} · ${event} · PB ${formatTime(athlete.pbSeconds)} · VDOT ${athleteVdot(athlete).toFixed(1)}`,
    `${session.date} · ${session.title} · ${phase}${venue ? ` · ${venue}` : ''}`,
    ``,
  ]
  if (session.mainFocus) lines.push(`主课要点：${session.mainFocus}`, ``)
  lines.push(
    `热身：${session.warmupNote}`,
    `主课：`,
    ...session.blocks.map((b) => {
      const m = getMethod(b.methodId)
      const restLabel = formatRest(b.restMode, b.restSeconds, b.restJogMeters ?? 0)
      const rest = restLabel === '连续' ? '' : `，间歇 ${restLabel}`
      const setRestLabel = formatRest(
        b.setRestMode,
        b.setRestSeconds,
        b.setRestJogMeters ?? 0,
      )
      const setRest =
        (b.sets ?? 1) > 1 && setRestLabel !== '连续'
          ? `，组间 ${setRestLabel}`
          : ''
      return `  · ${blockLabel(b)} ${m.name}（${m.zone}）@ ${formatTime(b.targetSeconds)}${rest}${setRest}`
    }),
    `整理：${session.cooldownNote}`,
  )
  if (session.coachNote) lines.push(`备注：${session.coachNote}`)
  lines.push(
    ``,
    `质量距离 ${(sessionVolumeMeters(session.blocks) / 1000).toFixed(2)} km`,
  )
  return lines.join('\n')
}

export function conditioningToText(
  athlete: Athlete,
  session: ConditioningSession,
): string {
  return [
    `Track Coach 素质课`,
    `${athlete.name} · ${session.date} · ${session.title}`,
    `针对：${session.weaknessIds.map((id) => getWeaknessModule(id).name).join('、')}`,
    ``,
    ...session.items.map(
      (it) =>
        `  · ${it.name} ${it.sets}×${it.reps}`,
    ),
    ``,
    ...session.items.map(
      (it) => `  要点·${it.name}：${it.cues}`,
    ),
    session.coachNote ? `\n备注：${session.coachNote}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function weekToText(
  athlete: Athlete,
  week: WeekPlan,
  sessions: TrainingSession[],
  conditioning: ConditioningSession[] = [],
): string {
  const phase = PHASE_OPTIONS.find((p) => p.id === week.phase)?.label ?? week.phase
  const planned = week.sessionIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter(Boolean) as TrainingSession[]
  const plannedCond = (week.conditioningIds ?? [])
    .map((id) => conditioning.find((s) => s.id === id))
    .filter(Boolean) as ConditioningSession[]

  const parts = [
    `Track Coach 周计划`,
    `${athlete.name} · 周起始 ${week.weekStart} · ${phase} · ${week.focus}`,
    ``,
  ]
  for (const s of planned) {
    parts.push(sessionToText(athlete, s), ``, '---', ``)
  }
  for (const s of plannedCond) {
    parts.push(conditioningToText(athlete, s), ``, '---', ``)
  }
  return parts.join('\n')
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function openPrintHtml(title: string, bodyHtml: string) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: "Segoe UI", "PingFang SC", sans-serif; padding: 24px; color: #1a2421; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .meta { color: #5f6f68; margin-bottom: 16px; }
    .box { border: 1px solid #d9d2c6; border-radius: 12px; padding: 14px; margin: 10px 0; }
    li { margin: 6px 0; }
  </style>
</head>
<body>
${bodyHtml}
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`
  const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
  if (!w) {
    alert('浏览器拦截了打印窗口，请允许弹窗后重试')
    return
  }
  w.document.write(html)
  w.document.close()
}

export function printSessionCard(athlete: Athlete, session: TrainingSession): void {
  const venue =
    VENUE_OPTIONS.find((v) => v.id === session.venue)?.label ?? ''
  openPrintHtml(
    session.title,
    `
  <h1>${session.title}</h1>
  <p class="meta">${athlete.name} · ${session.date} · ${
    PHASE_OPTIONS.find((p) => p.id === session.phase)?.label ?? ''
  }${venue ? ` · ${venue}` : ''}</p>
  ${session.mainFocus ? `<div class="box"><strong>主课要点</strong><br/>${session.mainFocus}</div>` : ''}
  <div class="box"><strong>热身</strong><br/>${session.warmupNote}</div>
  <div class="box"><strong>主课</strong>
    <ul>
      ${session.blocks
        .map((b) => {
          const m = getMethod(b.methodId)
          const restLabel = formatRest(b.restMode, b.restSeconds, b.restJogMeters ?? 0)
          const setRestLabel = formatRest(
            b.setRestMode,
            b.setRestSeconds,
            b.setRestJogMeters ?? 0,
          )
          return `<li>${blockLabel(b)} ${m.name} (${m.zone}) @ ${formatTime(b.targetSeconds)}${
            restLabel !== '连续' ? ` · 间歇 ${restLabel}` : ''
          }${
            (b.sets ?? 1) > 1 && setRestLabel !== '连续'
              ? ` · 组间 ${setRestLabel}`
              : ''
          }</li>`
        })
        .join('')}
    </ul>
  </div>
  <div class="box"><strong>整理</strong><br/>${session.cooldownNote}</div>
  ${session.coachNote ? `<div class="box"><strong>备注</strong><br/>${session.coachNote}</div>` : ''}
`,
  )
}

export function printConditioningCard(
  athlete: Athlete,
  session: ConditioningSession,
): void {
  openPrintHtml(
    session.title,
    `
  <h1>${session.title}</h1>
  <p class="meta">${athlete.name} · ${session.date}</p>
  <div class="box"><strong>针对弱项</strong><br/>${session.weaknessIds
    .map((id) => getWeaknessModule(id).name)
    .join('、')}</div>
  <div class="box"><strong>动作</strong>
    <ul>
      ${session.items
        .map(
          (it) =>
            `<li><strong>${it.name}</strong> ${it.sets}×${it.reps}<br/><span style="color:#5f6f68">${it.cues}</span></li>`,
        )
        .join('')}
    </ul>
  </div>
  ${session.coachNote ? `<div class="box"><strong>备注</strong><br/>${session.coachNote}</div>` : ''}
`,
  )
}
