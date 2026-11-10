import type { PeriodPhase } from './types'

export type VenueId = 'track' | 'road' | 'trail' | 'gym' | 'mixed'

export const VENUE_OPTIONS: { id: VenueId; label: string }[] = [
  { id: 'track', label: '田径场' },
  { id: 'road', label: '公路' },
  { id: 'trail', label: '越野/山地' },
  { id: 'gym', label: '力量房/室内' },
  { id: 'mixed', label: '综合' },
]

export interface WarmupTemplate {
  id: string
  name: string
  venue: VenueId | 'any'
  text: string
}

export const WARMUP_TEMPLATES: WarmupTemplate[] = [
  {
    id: 'track_easy',
    name: '田径场轻松跑/恢复',
    venue: 'track',
    text: '轻松走跑 8–10′ → 动态拉伸 → 无需加速跑',
  },
  {
    id: 'track_quality',
    name: '田径场质量课',
    venue: 'track',
    text: '慢跑 10–12′ → 动态拉伸 5′ → 跑跳练习（高抬腿/后蹬跑/车轮）→ 加速跑 4×80–100m',
  },
  {
    id: 'track_speed',
    name: '速度/重复跑',
    venue: 'track',
    text: '慢跑 8–10′ → 动态拉伸 → 专项跑技术 2–3 组 → 行进间加速 5×60–80m（充分走歇）',
  },
  {
    id: 'road_easy',
    name: '公路有氧/长距离',
    venue: 'road',
    text: '走路 2′ → 轻松跑渐进 10–15′ 进入主课配速；可穿插 4×20″ 步频激活',
  },
  {
    id: 'road_mp',
    name: '马拉松配速课',
    venue: 'road',
    text: '轻松跑 15′ → 动态拉伸 → 3×1′ 略快节奏激活 → 进入 M 配速主段',
  },
  {
    id: 'gym_sc',
    name: '力量/素质课',
    venue: 'gym',
    text: '跳绳或开合跳 3′ → 髋踝活动度 → 激活：蚌式/桥式/死虫各 1 组',
  },
  {
    id: 'mixed_recovery',
    name: '恢复日轻课',
    venue: 'mixed',
    text: '轻松走跑 8–10′ → 全身动态拉伸 → 无需加速跑',
  },
]

export const COOLDOWN_TEMPLATES: WarmupTemplate[] = [
  {
    id: 'cd_track',
    name: '田径场整理',
    venue: 'track',
    text: '慢跑 8–10′ → 静态拉伸（髋屈肌/腘绳/小腿）→ 可选泡沫轴 5′',
  },
  {
    id: 'cd_road',
    name: '公路整理',
    venue: 'road',
    text: '降速跑 5–8′ → 走路 3′ → 小腿/足底拉伸',
  },
  {
    id: 'cd_gym',
    name: '力量课整理',
    venue: 'gym',
    text: '轻松功率自行车或走 5′ → 针对性拉伸 → 呼吸放松 2′',
  },
]

export interface CycleWeekSkeleton {
  weekIndex: number
  phase: PeriodPhase
  focus: string
  runHints: string[]
  conditioningHints: string[]
}

export interface CycleTemplate {
  id: string
  name: string
  weeks: number
  description: string
  skeleton: CycleWeekSkeleton[]
}

/** Simple mesocycle skeletons coaches can fill with real sessions */
export const CYCLE_TEMPLATES: CycleTemplate[] = [
  {
    id: '4w_build',
    name: '4 周强化块',
    weeks: 4,
    description: '基础巩固 → 强化 → 专项刺激 → 小减量',
    skeleton: [
      {
        weekIndex: 0,
        phase: 'base',
        focus: '有氧巩固 + 技术',
        runHints: ['轻松跑/节奏控速', '短间歇或法特莱克 1 次'],
        conditioningHints: ['核心', '臀髋激活'],
      },
      {
        weekIndex: 1,
        phase: 'build',
        focus: '质量课上升',
        runHints: ['主间歇 1 次', '乳酸阈/节奏 1 次', '长距离'],
        conditioningHints: ['单腿稳定', '后链轻量'],
      },
      {
        weekIndex: 2,
        phase: 'specific',
        focus: '专项配速',
        runHints: ['接近比赛配速重复/间歇', '控量质量课'],
        conditioningHints: ['核心抗旋转', '脚踝维护'],
      },
      {
        weekIndex: 3,
        phase: 'taper',
        focus: '小减量保强度',
        runHints: ['短促激活课', '有氧恢复'],
        conditioningHints: ['低容量核心/活动度'],
      },
    ],
  },
  {
    id: '6w_peak',
    name: '6 周赛前块',
    weeks: 6,
    description: '强化 2 周 → 专项 2 周 → 减量 → 比赛周',
    skeleton: [
      {
        weekIndex: 0,
        phase: 'build',
        focus: '有氧+力量耐力',
        runHints: ['阈跑', '中长间歇'],
        conditioningHints: ['臀髋', '大腿前侧'],
      },
      {
        weekIndex: 1,
        phase: 'build',
        focus: '质量课密度',
        runHints: ['间歇', '节奏', '长距离'],
        conditioningHints: ['核心', '单腿'],
      },
      {
        weekIndex: 2,
        phase: 'specific',
        focus: '专项速度耐力',
        runHints: ['比赛配速段落', '重复跑'],
        conditioningHints: ['脚踝', '核心维护'],
      },
      {
        weekIndex: 3,
        phase: 'specific',
        focus: '专项巩固',
        runHints: ['主质量课', '控速有氧'],
        conditioningHints: ['低容量后链'],
      },
      {
        weekIndex: 4,
        phase: 'taper',
        focus: '减量',
        runHints: ['短质量', '轻松跑'],
        conditioningHints: ['活动度+轻核心'],
      },
      {
        weekIndex: 5,
        phase: 'race',
        focus: '比赛周',
        runHints: ['激活课', '赛前轻松'],
        conditioningHints: ['可选极短激活，勿新增酸痛'],
      },
    ],
  },
  {
    id: '8w_general',
    name: '8 周一般准备',
    weeks: 8,
    description: '偏基础积累，适合冬训或公路准备期',
    skeleton: [
      {
        weekIndex: 0,
        phase: 'base',
        focus: '有氧起步',
        runHints: ['轻松跑为主', '短法特莱克'],
        conditioningHints: ['核心基础', '脚踝'],
      },
      {
        weekIndex: 1,
        phase: 'base',
        focus: '跑量渐进',
        runHints: ['轻松跑', '长距离引入'],
        conditioningHints: ['臀髋', '核心'],
      },
      {
        weekIndex: 2,
        phase: 'base',
        focus: '有氧巩固',
        runHints: ['节奏跑轻量', '长距离'],
        conditioningHints: ['单腿', '小腿跟腱'],
      },
      {
        weekIndex: 3,
        phase: 'recovery',
        focus: '恢复小周',
        runHints: ['轻松跑', '技术跑'],
        conditioningHints: ['活动度为主'],
      },
      {
        weekIndex: 4,
        phase: 'build',
        focus: '引入质量',
        runHints: ['阈跑', '间歇引入'],
        conditioningHints: ['后链', '核心'],
      },
      {
        weekIndex: 5,
        phase: 'build',
        focus: '质量巩固',
        runHints: ['间歇', '长距离'],
        conditioningHints: ['臀髋', '大腿'],
      },
      {
        weekIndex: 6,
        phase: 'build',
        focus: '负荷峰值',
        runHints: ['双质量课（注意间隔）', '长距离'],
        conditioningHints: ['核心维护'],
      },
      {
        weekIndex: 7,
        phase: 'taper',
        focus: '卸掉疲劳',
        runHints: ['减量', '短刺激'],
        conditioningHints: ['轻量素质'],
      },
    ],
  },
]

export { addDaysISO } from './dates'
