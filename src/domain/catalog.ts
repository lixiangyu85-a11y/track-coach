import type { EventFocus, MethodDef, PeriodPhase, Sex } from './types'

/** Track + road distance presets (meters) */
export const DISTANCES: number[] = [
  100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000, 3000,
  5000, 8000, 10000, 12000, 15000, 16000, 20000, 21097, 25000, 30000, 32180, 42195,
]

export const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: 'male', label: '男子' },
  { id: 'female', label: '女子' },
]

export function sexLabel(sex?: Sex | null): string {
  return SEX_OPTIONS.find((s) => s.id === sex)?.label ?? ''
}

export const EVENT_OPTIONS: {
  id: EventFocus
  label: string
  meters: number
  group: 'track' | 'road'
}[] = [
  { id: '800', label: '800米', meters: 800, group: 'track' },
  { id: '1500', label: '1500米', meters: 1500, group: 'track' },
  { id: '3000', label: '3000米', meters: 3000, group: 'track' },
  { id: '5000', label: '5000米', meters: 5000, group: 'track' },
  { id: '10000', label: '10000米', meters: 10000, group: 'track' },
  { id: 'steeple', label: '障碍', meters: 3000, group: 'track' },
  { id: 'half', label: '半程马拉松', meters: 21097.5, group: 'road' },
  { id: 'marathon', label: '马拉松', meters: 42195, group: 'road' },
]

export const PHASE_OPTIONS: { id: PeriodPhase; label: string; hint: string }[] = [
  { id: 'base', label: '基础期', hint: '有氧积累，控强度' },
  { id: 'build', label: '强化期', hint: '专项耐力上升' },
  { id: 'specific', label: '专项期', hint: '接近比赛配速' },
  { id: 'taper', label: '赛前减量', hint: '减量保强度' },
  { id: 'race', label: '比赛周', hint: '激活与恢复为主' },
  { id: 'recovery', label: '恢复期', hint: '低负荷再生' },
]

const zeroRest: Record<PeriodPhase, number> = {
  base: 0, build: 0, specific: 0, taper: 0, race: 0, recovery: 0,
}

export const METHODS: MethodDef[] = [
  {
    id: 'easy',
    name: '有氧轻松跑',
    purpose: '恢复与有氧基础（Daniels E 配速）',
    zone: 'E',
    defaultDistances: [5000, 8000, 10000],
    continuous: true,
    defaultReps: 1,
    defaultSets: 1,
    restRatioByPhase: zeroRest,
    setRestRatioByPhase: zeroRest,
  },
  {
    id: 'long',
    name: '长距离有氧',
    purpose: '周长课，公路耐力核心（偏 E～M）',
    zone: 'E',
    defaultDistances: [12000, 16000, 20000, 25000, 30000, 32180],
    continuous: true,
    defaultReps: 1,
    defaultSets: 1,
    restRatioByPhase: zeroRest,
    setRestRatioByPhase: zeroRest,
    road: true,
  },
  {
    id: 'marathonPace',
    name: '马拉松配速跑',
    purpose: '持续 M 配速，半马/全马专项课',
    zone: 'M',
    defaultDistances: [8000, 10000, 12000, 16000, 20000],
    continuous: true,
    defaultReps: 1,
    defaultSets: 1,
    restRatioByPhase: zeroRest,
    setRestRatioByPhase: zeroRest,
    road: true,
  },
  {
    id: 'fartlek',
    name: '法特莱克跑',
    purpose: '变速刺激，兼顾有氧与速度耐力',
    zone: 'I',
    defaultDistances: [200, 300, 400, 600, 1000],
    defaultReps: 8,
    defaultSets: 1,
    restRatioByPhase: {
      base: 1, build: 0.8, specific: 0.7, taper: 1, race: 1.2, recovery: 1.5,
    },
    setRestRatioByPhase: {
      base: 2, build: 2, specific: 2, taper: 2.5, race: 3, recovery: 3,
    },
  },
  {
    id: 'variable',
    name: '变量跑',
    purpose: '固定距离内变速，节奏转换',
    zone: 'T',
    defaultDistances: [400, 600, 800, 1000, 1600],
    defaultReps: 6,
    defaultSets: 1,
    restRatioByPhase: {
      base: 1, build: 0.9, specific: 0.75, taper: 1, race: 1.2, recovery: 1.5,
    },
    setRestRatioByPhase: {
      base: 2, build: 2, specific: 2, taper: 2.5, race: 3, recovery: 3,
    },
  },
  {
    id: 'tempo',
    name: '节奏跑',
    purpose: '持续中高强（接近 T）',
    zone: 'T',
    defaultDistances: [1000, 1600, 2000, 3000, 5000],
    defaultReps: 3,
    defaultSets: 1,
    restRatioByPhase: {
      base: 0.5, build: 0.4, specific: 0.35, taper: 0.5, race: 0.6, recovery: 0.8,
    },
    setRestRatioByPhase: {
      base: 1.5, build: 1.2, specific: 1, taper: 1.5, race: 2, recovery: 2,
    },
  },
  {
    id: 'threshold',
    name: '乳酸阈跑',
    purpose: '乳酸稳态附近（Daniels T）',
    zone: 'T',
    defaultDistances: [1000, 1600, 2000, 3000, 5000],
    defaultReps: 5,
    defaultSets: 1,
    restRatioByPhase: {
      base: 0.35, build: 0.3, specific: 0.25, taper: 0.35, race: 0.5, recovery: 0.7,
    },
    setRestRatioByPhase: {
      base: 1.2, build: 1, specific: 1, taper: 1.2, race: 1.5, recovery: 2,
    },
  },
  {
    id: 'interval',
    name: '间歇跑',
    purpose: 'VO2 / 专项耐力（Daniels I）',
    zone: 'I',
    defaultDistances: [200, 300, 400, 500, 600, 800, 1000, 1200, 1600],
    defaultReps: 5,
    defaultSets: 2,
    restRatioByPhase: {
      base: 1, build: 0.9, specific: 0.75, taper: 1, race: 1.2, recovery: 1.5,
    },
    setRestRatioByPhase: {
      base: 3, build: 2.5, specific: 2, taper: 3, race: 3, recovery: 4,
    },
  },
  {
    id: 'repetition',
    name: '重复跑',
    purpose: '充分恢复的高速重复（Daniels R）',
    zone: 'R',
    defaultDistances: [200, 300, 400, 500, 600, 800],
    defaultReps: 4,
    defaultSets: 2,
    restRatioByPhase: {
      base: 2, build: 2, specific: 2.5, taper: 2.5, race: 3, recovery: 3,
    },
    setRestRatioByPhase: {
      base: 4, build: 4, specific: 4, taper: 4, race: 5, recovery: 5,
    },
  },
  {
    id: 'sprint',
    name: '冲刺/加速跑',
    purpose: '神经肌肉与步频激活（偏 R）',
    zone: 'R',
    defaultDistances: [100, 200, 300],
    defaultReps: 4,
    defaultSets: 2,
    restRatioByPhase: {
      base: 3, build: 3, specific: 4, taper: 4, race: 4, recovery: 4,
    },
    setRestRatioByPhase: {
      base: 4, build: 4, specific: 5, taper: 5, race: 5, recovery: 5,
    },
  },
]

export function getMethod(id: string): MethodDef {
  const m = METHODS.find((x) => x.id === id)
  if (!m) throw new Error(`Unknown method: ${id}`)
  return m
}

export function isRoadEvent(event?: EventFocus): boolean {
  return event === 'half' || event === 'marathon'
}

export function formatDistance(m: number): string {
  if (m >= 1000 && m % 1000 === 0) return `${m / 1000}km`
  if (m === 21097 || m === 21097.5) return '半马'
  if (m === 42195) return '全马'
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)}km`
  return `${m}m`
}
