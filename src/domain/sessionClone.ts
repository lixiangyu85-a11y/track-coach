import { intensityBandTimes, suggestBlock, uid } from './paces'
import type {
  Athlete,
  MethodId,
  PeriodPhase,
  SessionBlock,
  TrainingSession,
  VenueId,
} from './types'

/** Rebuild block paces for a different athlete, keep structure */
export function retargetBlocks(
  athlete: Athlete,
  blocks: SessionBlock[],
  phase: PeriodPhase,
): SessionBlock[] {
  return blocks.map((b) => {
    const draft = suggestBlock(
      athlete,
      b.methodId,
      b.distanceM,
      phase,
      b.reps,
      b.sets ?? 1,
    )
    return {
      ...draft,
      id: uid('blk'),
      note: b.note,
      reps: b.reps,
      sets: b.sets ?? 1,
      restMode: b.restMode ?? draft.restMode,
      restJogMeters: b.restJogMeters ?? draft.restJogMeters,
      setRestMode: b.setRestMode ?? draft.setRestMode,
      setRestJogMeters: b.setRestJogMeters ?? draft.setRestJogMeters,
    }
  })
}

export function cloneSessionForAthletes(
  source: {
    title: string
    phase: PeriodPhase
    date: string
    venue: VenueId
    mainFocus: string
    warmupNote: string
    cooldownNote: string
    coachNote?: string
    blocks: SessionBlock[]
  },
  athletes: Athlete[],
): TrainingSession[] {
  return athletes.map((athlete) => ({
    id: uid('ses'),
    athleteId: athlete.id,
    title: source.title,
    phase: source.phase,
    date: source.date,
    venue: source.venue,
    mainFocus: source.mainFocus,
    warmupNote: source.warmupNote,
    cooldownNote: source.cooldownNote,
    coachNote: source.coachNote,
    blocks: retargetBlocks(athlete, source.blocks, source.phase),
  }))
}

export function paceCompareRows(
  athletes: Athlete[],
  methodId: MethodId,
  distanceM: number,
  phase: PeriodPhase,
) {
  return athletes.map((athlete) => {
    const band = intensityBandTimes(athlete, methodId, distanceM, phase)
    return {
      athlete,
      midSec: band.midSec,
      minSec: band.minSec,
      maxSec: band.maxSec,
      zone: band.zone,
    }
  })
}
