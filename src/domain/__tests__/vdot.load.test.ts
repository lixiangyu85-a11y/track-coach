import { describe, expect, it } from 'vitest'
import { detectHighIntensityConflicts } from '../conflicts'
import {
  analyzeWeekLoad,
  phaseCaps,
  scaleCapsForVdot,
  weeksSinceRecovery,
} from '../load'
import { formatTime, parseTimeInput } from '../paces'
import { addDaysISO, localISODate, startOfWeekISO, todayISO } from '../dates'
import { weekDayDates } from '../conflicts'
import type { TrainingSession, WeekPlan } from '../types'
import {
  equivalentRaceTimes,
  timeForDistanceFromVdot,
  vdotFromRace,
} from '../vdot'

describe('vdotFromRace', () => {
  it('returns 0 for invalid input', () => {
    expect(vdotFromRace(0, 100)).toBe(0)
    expect(vdotFromRace(1500, 0)).toBe(0)
  })

  it('computes a plausible VDOT for 1500m ~4:00', () => {
    const v = vdotFromRace(1500, 240)
    expect(v).toBeGreaterThan(50)
    expect(v).toBeLessThan(90)
  })
})

describe('parseTimeInput', () => {
  it('parses mm:ss', () => {
    expect(parseTimeInput('4:00')).toBe(240)
  })

  it('rejects garbage', () => {
    expect(parseTimeInput('abc')).toBeNull()
  })
})

describe('phaseCaps / scaleCapsForVdot', () => {
  it('scales volume up for high VDOT', () => {
    const base = phaseCaps('build')
    const scaled = scaleCapsForVdot(base, 62)
    expect(scaled.maxQualityKm).toBeGreaterThan(base.maxQualityKm)
  })

  it('scales volume down for low VDOT', () => {
    const base = phaseCaps('build')
    const scaled = scaleCapsForVdot(base, 35)
    expect(scaled.maxQualityKm).toBeLessThan(base.maxQualityKm)
  })
})

function fakeHigh(date: string, id: string): TrainingSession {
  return {
    id,
    athleteId: 'a1',
    title: `HI ${id}`,
    phase: 'build',
    date,
    venue: 'track',
    mainFocus: '',
    warmupNote: '',
    cooldownNote: '',
    blocks: [
      {
        id: 'b1',
        methodId: 'interval',
        distanceM: 400,
        reps: 5,
        sets: 1,
        targetSeconds: 70,
        restMode: 'time',
        restSeconds: 60,
        restJogMeters: 0,
        setRestMode: 'time',
        setRestSeconds: 0,
        setRestJogMeters: 0,
      },
    ],
  }
}

describe('analyzeWeekLoad + conflicts', () => {
  it('flags empty week', () => {
    const s = analyzeWeekLoad([], 'build')
    expect(s.sessionCount).toBe(0)
    expect(s.hints.some((h) => h.text.includes('尚未挂课时'))).toBe(true)
  })

  it('flags <48h high-intensity gap', () => {
    const sessions = [fakeHigh('2026-11-10', '1'), fakeHigh('2026-11-11', '2')]
    const hints = detectHighIntensityConflicts(sessions)
    expect(hints.some((h) => h.level === 'high')).toBe(true)
    const summary = analyzeWeekLoad(sessions, 'build')
    expect(summary.highIntensitySessions).toBe(2)
    expect(summary.hints.some((h) => h.text.includes('间隔'))).toBe(true)
  })
})

describe('formatTime', () => {
  it('keeps hundredths for a track PB', () => {
    const pb = parseTimeInput('1:46:36', { event: '800' })
    expect(pb).toBeCloseTo(106.36, 2)
    expect(formatTime(pb!)).toBe("1'46\"36")
  })

  it('omits hundredths for whole seconds', () => {
    expect(formatTime(240)).toBe("4'00\"")
    expect(formatTime(64)).toBe("1'04\"")
  })
})

function fakeEasy(date: string, id: string, meters = 8000): TrainingSession {
  return {
    id,
    athleteId: 'a1',
    title: `E ${id}`,
    phase: 'build',
    date,
    venue: 'track',
    mainFocus: '',
    warmupNote: '',
    cooldownNote: '',
    blocks: [
      {
        id: 'b1',
        methodId: 'easy',
        distanceM: meters,
        reps: 1,
        sets: 1,
        targetSeconds: 1800,
        restMode: 'time',
        restSeconds: 0,
        restJogMeters: 0,
        setRestMode: 'time',
        setRestSeconds: 0,
        setRestJogMeters: 0,
      },
    ],
  }
}

describe('quality vs easy load', () => {
  it('does not count easy runs as quality sessions or quality km', () => {
    const sessions = [
      fakeEasy('2026-11-09', 'e1', 8000),
      fakeHigh('2026-11-10', 'q1'),
      fakeEasy('2026-11-11', 'e2', 5000),
    ]
    const summary = analyzeWeekLoad(sessions, 'build', { vdot: 82 })
    expect(summary.sessionCount).toBe(3)
    expect(summary.qualitySessions).toBe(1)
    expect(summary.totalKm).toBeCloseTo(15, 5)
    expect(summary.qualityKm).toBeCloseTo(2, 5)
    expect(summary.hints.some((h) => h.text.includes('质量课') && h.level === 'high')).toBe(
      false,
    )
  })
})

describe('local calendar dates', () => {
  it('formats YYYY-MM-DD from a local Date, not UTC', () => {
    const d = new Date(2026, 10, 9, 1, 0, 0) // Nov 9 01:00 local
    expect(localISODate(d)).toBe('2026-11-09')
  })

  it('starts the week on Monday in the local timezone', () => {
    const mondayEarly = new Date(2026, 10, 9, 1, 0, 0) // Mon 01:00
    const sundayLate = new Date(2026, 10, 15, 23, 0, 0) // Sun 23:00
    expect(startOfWeekISO(mondayEarly)).toBe('2026-11-09')
    expect(startOfWeekISO(sundayLate)).toBe('2026-11-09')
  })

  it('adds days without UTC drift', () => {
    expect(addDaysISO('2026-11-09', 1)).toBe('2026-11-10')
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01')
    expect(weekDayDates('2026-11-09')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
  })

  it('todayISO matches the local calendar day', () => {
    expect(todayISO()).toBe(localISODate(new Date()))
  })
})

describe('equivalent race times', () => {
  it('round-trips an 800m PB close to the original time', () => {
    const pb = 106.36
    const vdot = vdotFromRace(800, pb)
    const back = timeForDistanceFromVdot(vdot, 800)
    expect(back).not.toBeNull()
    expect(back!).toBeCloseTo(pb, 1)
  })

  it('lists standard events and a slower marathon than 10k', () => {
    const rows = equivalentRaceTimes(vdotFromRace(800, 106.36))
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.seconds]))
    expect(byId['1500']).toBeGreaterThan(byId['800'])
    expect(byId['5000']).toBeGreaterThan(byId['1500'])
    expect(byId.marathon).toBeGreaterThan(byId.half)
    expect(rows.some((r) => r.id === 'steeple')).toBe(false)
  })
})

describe('Daniels intensity share and week jumps', () => {
  it('warns when I volume exceeds ~8% of the week', () => {
    const sessions = [
      fakeEasy('2026-11-09', 'e1', 8000),
      fakeHigh('2026-11-10', 'i1'),
    ]
    const summary = analyzeWeekLoad(sessions, 'build', { vdot: 55 })
    expect(
      summary.hints.some((h) => h.text.includes('I 课') && h.text.includes('8%')),
    ).toBe(true)
  })

  it('warns when weekly volume jumps more than 10%', () => {
    const sessions = [fakeEasy('2026-11-16', 'e3', 20000)]
    const summary = analyzeWeekLoad(sessions, 'build', {
      previousWeekKm: 15,
    })
    expect(summary.hints.some((h) => h.text.includes('增加了') && h.text.includes('10%'))).toBe(
      true,
    )
  })

  it('counts consecutive weeks since a recovery week', () => {
    const weeks: WeekPlan[] = [
      {
        id: 'w1',
        athleteId: 'a1',
        weekStart: '2026-10-19',
        phase: 'recovery',
        sessionIds: [],
        conditioningIds: [],
        focus: '减载',
      },
      {
        id: 'w2',
        athleteId: 'a1',
        weekStart: '2026-10-26',
        phase: 'build',
        sessionIds: [],
        conditioningIds: [],
        focus: '强化',
      },
      {
        id: 'w3',
        athleteId: 'a1',
        weekStart: '2026-11-02',
        phase: 'build',
        sessionIds: [],
        conditioningIds: [],
        focus: '强化',
      },
    ]
    expect(weeksSinceRecovery(weeks, 'a1', '2026-11-09', 'build')).toBe(3)
    expect(weeksSinceRecovery(weeks, 'a1', '2026-10-19', 'recovery')).toBe(0)
  })
})
