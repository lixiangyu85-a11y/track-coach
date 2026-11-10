import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  downloadBackup,
  loadState,
  parseImportJson,
  saveState,
  type AppState,
} from '../data/storage'
import type {
  Athlete,
  ConditioningSession,
  SessionLog,
  TrainingSession,
  WeaknessId,
  WeekPlan,
} from '../domain/types'

const SAVE_DEBOUNCE_MS = 400

export function useCoachData() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [dirty, setDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNext = useRef(true)

  const persistNow = useCallback((next: AppState) => {
    saveState(next)
    setDirty(false)
    setLastSavedAt(new Date().toISOString())
  }, [])

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persistNow(state), SAVE_DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [state, persistNow])

  const activeAthlete = useMemo(
    () => state.athletes.find((a) => a.id === state.activeAthleteId) ?? null,
    [state.athletes, state.activeAthleteId],
  )

  const setActiveAthleteId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeAthleteId: id }))
  }, [])

  const upsertAthlete = useCallback((athlete: Athlete) => {
    setState((prev) => ({
      ...prev,
      athletes: [...prev.athletes, athlete],
      activeAthleteId: athlete.id,
    }))
  }, [])

  const updateAthlete = useCallback((athlete: Athlete) => {
    setState((prev) => ({
      ...prev,
      athletes: prev.athletes.map((a) => (a.id === athlete.id ? athlete : a)),
      activeAthleteId: athlete.id,
    }))
  }, [])

  const updateWeaknesses = useCallback(
    (athleteId: string, weaknesses: WeaknessId[]) => {
      setState((prev) => ({
        ...prev,
        athletes: prev.athletes.map((a) =>
          a.id === athleteId ? { ...a, weaknesses } : a,
        ),
      }))
    },
    [],
  )

  const deleteAthlete = useCallback((id: string) => {
    if (
      !confirm(
        '删除该运动员及其相关周计划关联？课时记录会保留但不再关联周表勾选。',
      )
    )
      return false
    setState((prev) => ({
      ...prev,
      athletes: prev.athletes.filter((a) => a.id !== id),
      weeks: prev.weeks.filter((w) => w.athleteId !== id),
      activeAthleteId: prev.activeAthleteId === id ? null : prev.activeAthleteId,
    }))
    return true
  }, [])

  const saveSession = useCallback((session: TrainingSession) => {
    setState((prev) => ({
      ...prev,
      sessions: [session, ...prev.sessions],
    }))
  }, [])

  const updateSession = useCallback((session: TrainingSession) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === session.id ? session : s)),
    }))
  }, [])

  const saveSessions = useCallback((list: TrainingSession[]) => {
    setState((prev) => ({
      ...prev,
      sessions: [...list, ...prev.sessions],
    }))
  }, [])

  const deleteSession = useCallback((id: string) => {
    if (!confirm('删除该课时？')) return false
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      weeks: prev.weeks.map((w) => ({
        ...w,
        sessionIds: w.sessionIds.filter((x) => x !== id),
      })),
      logs: prev.logs.filter((l) => !(l.kind === 'run' && l.refId === id)),
    }))
    return true
  }, [])

  const saveConditioning = useCallback((session: ConditioningSession) => {
    setState((prev) => ({
      ...prev,
      conditioning: [session, ...prev.conditioning],
    }))
  }, [])

  const updateConditioning = useCallback((session: ConditioningSession) => {
    setState((prev) => ({
      ...prev,
      conditioning: prev.conditioning.map((s) =>
        s.id === session.id ? session : s,
      ),
    }))
  }, [])

  const deleteConditioning = useCallback((id: string) => {
    if (!confirm('删除该素质课？')) return false
    setState((prev) => ({
      ...prev,
      conditioning: prev.conditioning.filter((s) => s.id !== id),
      weeks: prev.weeks.map((w) => ({
        ...w,
        conditioningIds: (w.conditioningIds ?? []).filter((x) => x !== id),
      })),
      logs: prev.logs.filter(
        (l) => !(l.kind === 'conditioning' && l.refId === id),
      ),
    }))
    return true
  }, [])

  const saveWeek = useCallback((week: WeekPlan) => {
    setState((prev) => {
      const others = prev.weeks.filter(
        (w) =>
          !(w.athleteId === week.athleteId && w.weekStart === week.weekStart),
      )
      return { ...prev, weeks: [week, ...others] }
    })
  }, [])

  const applyWeeks = useCallback((list: WeekPlan[]) => {
    setState((prev) => {
      let weeks = [...prev.weeks]
      for (const week of list) {
        weeks = weeks.filter(
          (w) =>
            !(w.athleteId === week.athleteId && w.weekStart === week.weekStart),
        )
        weeks = [week, ...weeks]
      }
      return { ...prev, weeks }
    })
  }, [])

  const saveLog = useCallback((log: SessionLog) => {
    setState((prev) => {
      const others = prev.logs.filter(
        (l) => !(l.kind === log.kind && l.refId === log.refId),
      )
      return { ...prev, logs: [log, ...others] }
    })
  }, [])

  const saveNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    persistNow(state)
  }, [persistNow, state])

  const exportBackup = useCallback(() => {
    downloadBackup(state)
  }, [state])

  const importBackup = useCallback((raw: string) => {
    const next = parseImportJson(raw)
    skipNext.current = true
    setState(next)
    persistNow(next)
  }, [persistNow])

  return {
    state,
    dirty,
    lastSavedAt,
    activeAthlete,
    setActiveAthleteId,
    upsertAthlete,
    updateAthlete,
    updateWeaknesses,
    deleteAthlete,
    saveSession,
    updateSession,
    saveSessions,
    deleteSession,
    saveConditioning,
    updateConditioning,
    deleteConditioning,
    saveWeek,
    applyWeeks,
    saveLog,
    saveNow,
    exportBackup,
    importBackup,
  }
}
