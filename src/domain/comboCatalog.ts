import type { MethodId } from './types'

/**
 * Common mixed-distance session structures used in middle/long-distance coaching:
 * ascending/descending ladders, pyramids, cut-downs, and mixed sets.
 * Sources: HKPE mid-distance materials; ladder/pyramid coaching practice;
 * classic track progressions (200–800 family, 400–1000 family).
 */

export interface ComboStep {
  distanceM: number
  /** Reps at this distance (default 1 for classic ladder rungs) */
  reps: number
}

export interface ComboPreset {
  id: string
  name: string
  category: 'ladder_up' | 'ladder_down' | 'pyramid' | 'mixed' | 'cutdown' | 'broken'
  methodId: MethodId
  /** Short label shown in chips, e.g. 200+400+600 */
  pattern: string
  purpose: string
  steps: ComboStep[]
  /** How many times to repeat the whole sequence (outer sets) */
  rounds?: number
}

export const COMBO_PRESETS: ComboPreset[] = [
  // —— 上阶梯 ——
  {
    id: 'up_200_400_600',
    name: '上阶梯 200-400-600',
    category: 'ladder_up',
    methodId: 'interval',
    pattern: '200+400+600',
    purpose: '由短到长，逐步转入专项耐力；最常用组合之一',
    steps: [
      { distanceM: 200, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
    ],
  },
  {
    id: 'up_200_400_600_800',
    name: '上阶梯 200→800',
    category: 'ladder_up',
    methodId: 'interval',
    pattern: '200-400-600-800',
    purpose: '完整上阶梯，兼顾速度与速度耐力',
    steps: [
      { distanceM: 200, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 800, reps: 1 },
    ],
  },
  {
    id: 'up_300_500_700',
    name: '上阶梯 300-500-700',
    category: 'ladder_up',
    methodId: 'interval',
    pattern: '300-500-700',
    purpose: '非整圈距离，破坏节奏习惯，适合专项期',
    steps: [
      { distanceM: 300, reps: 1 },
      { distanceM: 500, reps: 1 },
      { distanceM: 700, reps: 1 },
    ],
  },
  {
    id: 'up_3x_ladder',
    name: '分组上阶梯 3×(200/400/600)',
    category: 'ladder_up',
    methodId: 'interval',
    pattern: '3×200 + 3×400 + 3×600',
    purpose: '每距离固定次数的上阶梯（香港中长跑教材常见写法）',
    steps: [
      { distanceM: 200, reps: 3 },
      { distanceM: 400, reps: 3 },
      { distanceM: 600, reps: 3 },
    ],
  },
  {
    id: 'up_400_600_800_1000',
    name: '上阶梯 400→1000',
    category: 'ladder_up',
    methodId: 'interval',
    pattern: '400-600-800-1000',
    purpose: '偏有氧功率/专项耐力，适合 1500–5000',
    steps: [
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 800, reps: 1 },
      { distanceM: 1000, reps: 1 },
    ],
  },

  // —— 下阶梯 ——
  {
    id: 'down_800_600_400_200',
    name: '下阶梯 800→200',
    category: 'ladder_down',
    methodId: 'interval',
    pattern: '800-600-400-200',
    purpose: '先长后短，后程提速；疲劳下保持节奏',
    steps: [
      { distanceM: 800, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 200, reps: 1 },
    ],
  },
  {
    id: 'down_600_400_200',
    name: '下阶梯 600→200',
    category: 'ladder_down',
    methodId: 'interval',
    pattern: '600-400-200',
    purpose: '短课下阶梯，收尾加速',
    steps: [
      { distanceM: 600, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 200, reps: 1 },
    ],
  },
  {
    id: 'down_1000_800_600_400',
    name: '下阶梯 1000→400',
    category: 'ladder_down',
    methodId: 'tempo',
    pattern: '1000-800-600-400',
    purpose: '较长段落递减，偏节奏/阈感',
    steps: [
      { distanceM: 1000, reps: 1 },
      { distanceM: 800, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 400, reps: 1 },
    ],
  },

  // —— 金字塔 ——
  {
    id: 'pyr_200_800',
    name: '金字塔 200↔800',
    category: 'pyramid',
    methodId: 'interval',
    pattern: '200-400-600-800-600-400-200',
    purpose: '经典中距离金字塔，短快长控',
    steps: [
      { distanceM: 200, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 800, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 200, reps: 1 },
    ],
  },
  {
    id: 'pyr_400_1000',
    name: '金字塔 400↔1000',
    category: 'pyramid',
    methodId: 'interval',
    pattern: '400-600-800-1000-800-600-400',
    purpose: '中长距离金字塔，总负荷更大',
    steps: [
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 800, reps: 1 },
      { distanceM: 1000, reps: 1 },
      { distanceM: 800, reps: 1 },
      { distanceM: 600, reps: 1 },
      { distanceM: 400, reps: 1 },
    ],
  },
  {
    id: 'pyr_200_400_center',
    name: '短金字塔 200↔400',
    category: 'pyramid',
    methodId: 'repetition',
    pattern: '200-300-400-300-200',
    purpose: '短距金字塔，偏速度与神经激活',
    steps: [
      { distanceM: 200, reps: 1 },
      { distanceM: 300, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 300, reps: 1 },
      { distanceM: 200, reps: 1 },
    ],
  },
  {
    id: 'pyr_combo_sets',
    name: '组合金字塔 2×200/300 + 3×400',
    category: 'pyramid',
    methodId: 'interval',
    pattern: '2×200 + 2×300 + 3×400 + 2×300 + 2×200',
    purpose: '教材中的组合金字塔写法',
    steps: [
      { distanceM: 200, reps: 2 },
      { distanceM: 300, reps: 2 },
      { distanceM: 400, reps: 3 },
      { distanceM: 300, reps: 2 },
      { distanceM: 200, reps: 2 },
    ],
  },

  // —— 混合 / 切断 ——
  {
    id: 'mixed_200_400_600_x2',
    name: '两轮混合 200+400+600',
    category: 'mixed',
    methodId: 'interval',
    pattern: '2×(200+400+600)',
    purpose: '短中长各一段，跑两轮，常用速度耐力组合',
    steps: [
      { distanceM: 200, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
    ],
    rounds: 2,
  },
  {
    id: 'mixed_200_400_600_x3',
    name: '三轮混合 200+400+600',
    category: 'mixed',
    methodId: 'interval',
    pattern: '3×(200+400+600)',
    purpose: '三轮 200+400+600，总量约 3600m 质量距离',
    steps: [
      { distanceM: 200, reps: 1 },
      { distanceM: 400, reps: 1 },
      { distanceM: 600, reps: 1 },
    ],
    rounds: 3,
  },
  {
    id: 'cutdown_400s',
    name: '递减配速 6×400',
    category: 'cutdown',
    methodId: 'interval',
    pattern: '6×400 递快',
    purpose: '距离不变、逐组加快（教案里写递减秒数）',
    steps: [{ distanceM: 400, reps: 6 }],
  },
  {
    id: 'broken_800',
    name: '分解 800（400+400）',
    category: 'broken',
    methodId: 'repetition',
    pattern: '4×(400+400)',
    purpose: '专项分解：两段 400 组成「断 800」感',
    steps: [
      { distanceM: 400, reps: 1 },
      { distanceM: 400, reps: 1 },
    ],
    rounds: 4,
  },
  {
    id: 'broken_1200',
    name: '分解 1200（400+800）',
    category: 'broken',
    methodId: 'repetition',
    pattern: '3×(400+800)',
    purpose: '1500 专项常用分解组合',
    steps: [
      { distanceM: 400, reps: 1 },
      { distanceM: 800, reps: 1 },
    ],
    rounds: 3,
  },
  {
    id: 'mixed_1000_400',
    name: '长短交替 1000/400',
    category: 'mixed',
    methodId: 'interval',
    pattern: '3×(1000+400)',
    purpose: '长段稳态 + 短段提速',
    steps: [
      { distanceM: 1000, reps: 1 },
      { distanceM: 400, reps: 1 },
    ],
    rounds: 3,
  },
  {
    id: 'kenyan_alternation',
    name: '交替 400/200',
    category: 'mixed',
    methodId: 'interval',
    pattern: '8×(400+200)',
    purpose: '快慢交替刺激，类似变速间歇',
    steps: [
      { distanceM: 400, reps: 1 },
      { distanceM: 200, reps: 1 },
    ],
    rounds: 8,
  },
  {
    id: 'road_km_ladder',
    name: '公路公里阶梯',
    category: 'ladder_up',
    methodId: 'threshold',
    pattern: '1k-2k-3k-2k-1k',
    purpose: '半马/全马常用分钟或公里金字塔简化版',
    steps: [
      { distanceM: 1000, reps: 1 },
      { distanceM: 2000, reps: 1 },
      { distanceM: 3000, reps: 1 },
      { distanceM: 2000, reps: 1 },
      { distanceM: 1000, reps: 1 },
    ],
  },
]

export const COMBO_CATEGORY_LABEL: Record<ComboPreset['category'], string> = {
  ladder_up: '上阶梯',
  ladder_down: '下阶梯',
  pyramid: '金字塔',
  mixed: '混合组合',
  cutdown: '递快/切断',
  broken: '专项分解',
}

export const CUSTOM_COMBO_DISTANCES = [200, 300, 400, 500, 600, 800, 1000, 1200, 1600]

/** Expand preset into ordered distance list (respecting rounds) */
export function expandComboSteps(preset: ComboPreset): ComboStep[] {
  const rounds = preset.rounds ?? 1
  const out: ComboStep[] = []
  for (let r = 0; r < rounds; r += 1) {
    out.push(...preset.steps)
  }
  return out
}
