import type { WeaknessId } from './types'

export interface ExerciseDef {
  id: string
  name: string
  cues: string
  sets: number
  reps: string
  equipment?: string
  progression?: string
}

export interface WeaknessModule {
  id: WeaknessId
  name: string
  shortName: string
  /** How coaches often notice this in training/races */
  signs: string[]
  purpose: string
  frequencyHint: string
  /** Brief sources / practice basis */
  sources: string
  exercises: ExerciseDef[]
}

/**
 * Conditioning modules synthesised from:
 * - World Athletics NSA: core stabilisation for middle/long-distance runners
 * - Run RCT hip & core / ankle & foot programmes (BJSM)
 * - Intrinsic foot muscle / short-foot evidence (IFM reviews)
 * - Posterior tibialis & ankle protocols (clinical running physio practice)
 * - Runner posterior-chain & glute-medius work (NSCA / distance S&C samples)
 * - Anti-rotation core emphasis for runners
 * - Open refs: Zoned strength catalogue ideas, body-territory anti-movement core framing
 */
export const WEAKNESS_MODULES: WeaknessModule[] = [
  {
    id: 'ankle_foot',
    name: '脚踝 / 足内在肌偏弱',
    shortName: '脚踝足部',
    signs: [
      '支撑相塌足或过度旋前',
      '内侧胫骨不适、足弓疲劳',
      '单脚落地不稳、变向无力',
    ],
    purpose: '强化足内在肌、胫后肌与踝稳定，改善支撑刚度',
    frequencyHint: '每周 2–4 次，质量课后或恢复日，约 15–20 分钟',
    sources: 'IFM/short-foot 研究；Run RCT Ankle&Foot；胫后肌渐进强化实践',
    exercises: [
      {
        id: 'short_foot',
        name: '短足练习 Short Foot',
        cues: '前脚掌向脚跟轻收，抬高足弓，脚趾尽量不屈曲卷曲',
        sets: 3,
        reps: '10–15 次或 20–30″保持',
        progression: '坐→双脚站→单脚站',
      },
      {
        id: 'toe_yoga',
        name: '脚趾分离控制',
        cues: '大脚趾单独上抬，其余四趾不动；再反过来',
        sets: 3,
        reps: '每侧 8–12',
      },
      {
        id: 'towel_curl',
        name: '毛巾卷抓',
        cues: '脚趾抓毛巾向脚跟方向卷，踝关节保持稳定',
        sets: 3,
        reps: '10–15',
        equipment: '毛巾',
      },
      {
        id: 'band_inversion',
        name: '弹力带足内翻（胫后）',
        cues: '坐姿，弹力带抗阻做内翻+轻度跖屈，控制回放',
        sets: 3,
        reps: '12–15',
        equipment: '弹力带',
        progression: '无负重 ROM → 抗阻 → 站立提踵微内翻',
      },
      {
        id: 'heel_raise_inv',
        name: '提踵（微内翻强调）',
        cues: '双脚提踵至最高，足跟略偏内，慢速下放 3″',
        sets: 3,
        reps: '15–25',
        progression: '双脚→单脚→负重/亏距',
      },
      {
        id: 'sl_balance',
        name: '单脚平衡 / Y 平衡',
        cues: '单脚站稳骨盆水平，轻点前后外侧；膝不要塌内',
        sets: 3,
        reps: '每侧 20–40″',
        progression: '平面→软垫→闭眼→轻跳落地',
      },
    ],
  },
  {
    id: 'calf_achilles',
    name: '小腿 / 跟腱耐力不足',
    shortName: '小腿跟腱',
    signs: [
      '长课后小腿僵紧',
      '上坡或冲刺后跟腱不适',
      '提踵力量不对称',
    ],
    purpose: '提升腓肠肌/比目鱼肌与跟腱负荷能力',
    frequencyHint: '每周 2–3 次，避免在极硬场地质量课当天堆高容量',
    sources: '跟腱负荷渐进与单腿提踵耐力标准（临床常用 3×20–25）',
    exercises: [
      {
        id: 'seated_soleus',
        name: '坐姿比目鱼提踵',
        cues: '膝屈约 90°，脚掌前推提踵，顶峰稍停',
        sets: 3,
        reps: '12–20',
        equipment: '可选杠铃/壶铃压膝',
      },
      {
        id: 'standing_calf',
        name: '站姿提踵',
        cues: '全幅提踵，慢离心；膝微屈版本更打比目鱼',
        sets: 3,
        reps: '12–20',
        progression: '双脚→单脚→亏距',
      },
      {
        id: 'eccentric_calf',
        name: '单腿离心提踵',
        cues: '双脚起，患侧/弱侧单独慢放 3–4″',
        sets: 3,
        reps: '8–12',
      },
      {
        id: 'isometric_hold',
        name: '提踵等长保持',
        cues: '中高位保持，踝不晃，呼吸平稳',
        sets: 3,
        reps: '20–40″',
      },
    ],
  },
  {
    id: 'quad',
    name: '大腿前侧（股四头）偏弱',
    shortName: '大腿前侧',
    signs: [
      '下坡控速差、膝发软',
      '蹲起不对称或膝内扣',
      '终点冲刺支撑感不足',
    ],
    purpose: '加强伸膝与单腿支撑力量，改善减速与落地控制',
    frequencyHint: '每周 2 次力量日；赛前减量周降低离心量',
    sources: '距离跑者下肢力量模板；分腿蹲/台阶常见处方',
    exercises: [
      {
        id: 'split_squat',
        name: '分腿蹲 / 保加利亚分腿蹲',
        cues: '前膝沿脚尖方向，躯干微前倾，后膝轻点',
        sets: 3,
        reps: '每侧 6–10',
        progression: '自重→哑铃→后脚垫高',
      },
      {
        id: 'step_up',
        name: '台阶上步',
        cues: '整脚踩实，靠前腿蹬起，勿借后腿弹',
        sets: 3,
        reps: '每侧 8–12',
        equipment: '箱/台阶 20–40cm',
      },
      {
        id: 'wall_sit',
        name: '靠墙静蹲',
        cues: '膝约 90°，脚跟踩实，核心收紧',
        sets: 3,
        reps: '30–60″',
      },
      {
        id: 'leg_ext_iso',
        name: '伸膝等长（护膝友好）',
        cues: '坐姿或机上中角度保持，无锐痛',
        sets: 3,
        reps: '20–40″',
        equipment: '可选伸膝机',
      },
    ],
  },
  {
    id: 'hamstring',
    name: '大腿后侧（腘绳）偏弱',
    shortName: '大腿后侧',
    signs: [
      '高速途中腿后侧易紧/抽筋倾向',
      '髋铰链动作代偿明显',
      '北欧或 RDL 两侧差距大',
    ],
    purpose: '强化后链与偏心控制，服务速度耐力与伤防',
    frequencyHint: '每周 1–2 次；大强度间歇日勿叠高容量北欧',
    sources: '跑者后链训练实践；Nordic / RDL 经典组合',
    exercises: [
      {
        id: 'rdl',
        name: '罗马尼亚硬拉 RDL',
        cues: '髋后坐、背平、杠贴近腿；感受腘绳与臀',
        sets: 3,
        reps: '6–10',
        equipment: '杠铃/哑铃',
        progression: '双腿→单腿 RDL',
      },
      {
        id: 'nordic',
        name: '北欧腿屈（偏心）',
        cues: '踝固定，躯干直立慢放；能撑多久撑多久再手撑缓冲',
        sets: 2,
        reps: '4–8',
        progression: '辅助带→完整偏心→向心',
      },
      {
        id: 'slider_leg_curl',
        name: '滑盘腿弯举',
        cues: '桥式姿势下脚跟滑出再拉回，髋不塌',
        sets: 3,
        reps: '8–12',
        equipment: '滑盘/毛巾',
      },
      {
        id: 'bridge_walkout',
        name: '桥式走步',
        cues: '抬髋后交替小步前移脚跟，保持骨盆水平',
        sets: 3,
        reps: '8–12 步',
      },
    ],
  },
  {
    id: 'glute_hip',
    name: '臀 / 髋外展稳定不足',
    shortName: '臀髋',
    signs: [
      '跑姿骨盆侧倾、膝内扣',
      '易出现髂胫束外侧不适',
      '单腿蹲对侧髋掉',
    ],
    purpose: '强化臀中肌与髋外展/外旋，稳住骨盆与膝',
    frequencyHint: '每周 2–3 次；可放在质量课热身激活段',
    sources: 'Run RCT Hip&Core；ITBS 相关臀中肌强化；WA 核心进展中的髋稳定',
    exercises: [
      {
        id: 'side_lying_abd',
        name: '侧卧髋外展',
        cues: '骨盆不前后滚，脚尖微外旋，顶峰稍停',
        sets: 3,
        reps: '每侧 10–15',
      },
      {
        id: 'clamshell',
        name: '蚌式开合',
        cues: '侧卧屈髋屈膝，脚跟贴合，上方膝打开不翻腰',
        sets: 3,
        reps: '每侧 12–20',
        equipment: '可选迷你带',
      },
      {
        id: 'band_lateral_walk',
        name: '弹力带侧向走',
        cues: '半蹲位，带绕踝或膝上，步伐均匀，骨盆不晃',
        sets: 3,
        reps: '每侧 8–12 步',
        equipment: '迷你带',
      },
      {
        id: 'hip_thrust',
        name: '髋推 / 臀桥',
        cues: '下巴微收，顶峰挤臀，勿过度塌腰',
        sets: 3,
        reps: '8–12',
        progression: '双腿桥→单腿桥→杠铃髋推',
      },
      {
        id: 'monster_walk',
        name: '怪物步（前/后向）',
        cues: '带阻下保持膝外展张力，小步前进后退',
        sets: 2,
        reps: '10–15m×2',
        equipment: '迷你带',
      },
    ],
  },
  {
    id: 'core',
    name: '核心不稳（抗动不足）',
    shortName: '核心',
    signs: [
      '途中塌腰、躯干过度扭转',
      '疲劳后跑姿散、能量泄漏',
      '平板/死虫时腰离开地面',
    ],
    purpose: '以抗伸展、抗旋转、抗侧屈为主，提升传递效率',
    frequencyHint: '每周 2–3 次，20–30 分钟；先活动度再稳定（WA 建议）',
    sources: 'World Athletics 中长跑核心进展；抗旋转训练；body-territory 抗动框架',
    exercises: [
      {
        id: 'dead_bug',
        name: '死虫 Dead Bug',
        cues: '腰贴地，对侧手脚慢伸；腰一离地就缩小幅度',
        sets: 3,
        reps: '每侧 6–10',
      },
      {
        id: 'bird_dog',
        name: '鸟狗 Bird Dog',
        cues: '四点支撑，对侧手脚伸出，髋不扭、背平',
        sets: 3,
        reps: '每侧 6–10',
      },
      {
        id: 'front_plank',
        name: '平板支撑',
        cues: '头-背-臀一线，收腹微后倾；质量优于时长',
        sets: 3,
        reps: '20–45″',
        progression: '短时高质量→加肩点触抗旋转',
      },
      {
        id: 'side_plank',
        name: '侧平板',
        cues: '肩肘垂直，髋上推，身体一条线',
        sets: 3,
        reps: '每侧 20–40″',
      },
      {
        id: 'pallof_press',
        name: 'Pallof 抗旋转推',
        cues: '侧对弹力带/绳，双手前推保持躯干不转',
        sets: 3,
        reps: '每侧 8–12',
        equipment: '弹力带或绳索',
      },
      {
        id: 'plank_shoulder_tap',
        name: '平板肩点触',
        cues: '宽站距，点肩时髋几乎不动（抗旋转）',
        sets: 3,
        reps: '每侧 8–12',
      },
    ],
  },
  {
    id: 'single_leg',
    name: '单腿支撑 / 落地控制差',
    shortName: '单腿稳定',
    signs: [
      '单腿跳或落地膝晃',
      '弯道外侧支撑无力',
      '疲劳后步态不对称加重',
    ],
    purpose: '整合踝-膝-髋在单腿条件下的稳定与力量',
    frequencyHint: '每周 2 次；可与臀髋/脚踝模块组合，总时勿过长',
    sources: '感觉运动训练进展（站立平衡→功能动作）；跑者单腿力量实践',
    exercises: [
      {
        id: 'sl_rdl',
        name: '单腿 RDL',
        cues: '支撑腿微屈，髋铰链，骨盆正对前方',
        sets: 3,
        reps: '每侧 6–8',
      },
      {
        id: 'sl_sit_to_stand',
        name: '单腿坐起',
        cues: '单脚从凳上站起再慢坐，膝脚尖同向',
        sets: 3,
        reps: '每侧 6–10',
        equipment: '箱子/凳',
      },
      {
        id: 'lateral_step_down',
        name: '侧向台阶下放',
        cues: '支撑腿控速下放，对侧脚轻点地；防膝内扣',
        sets: 3,
        reps: '每侧 8–12',
      },
      {
        id: 'pogos',
        name: '小跳 Pogo（低强度超等长）',
        cues: '踝主导短触地，膝髋几乎不深屈；无痛才做',
        sets: 2,
        reps: '20–30 次',
        progression: '双脚→分腿→单脚轻跳',
      },
    ],
  },
]

export function getWeaknessModule(id: WeaknessId): WeaknessModule {
  const m = WEAKNESS_MODULES.find((x) => x.id === id)
  if (!m) throw new Error(`Unknown weakness: ${id}`)
  return m
}

export function exercisesForWeaknesses(ids: WeaknessId[]): {
  module: WeaknessModule
  exercise: ExerciseDef
}[] {
  const out: { module: WeaknessModule; exercise: ExerciseDef }[] = []
  for (const id of ids) {
    const module = getWeaknessModule(id)
    for (const exercise of module.exercises) {
      out.push({ module, exercise })
    }
  }
  return out
}
