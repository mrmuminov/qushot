export const RESOLVED_PER_WAVE = 10
export const MAX_WAVE = 10
export const LANE_SPEED_FACTORS = [0.85, 1, 1.15] as const

export interface Difficulty {
  wave: number
  crossingMs: number
  spawnIntervalMs: number
  maxBirds: number
  laneSpeedFactors: readonly [number, number, number]
}

export function waveForResolved(resolved: number): number {
  return Math.floor(Math.max(0, resolved) / RESOLVED_PER_WAVE) + 1
}

export function difficultyForWave(wave: number): Difficulty {
  const clamped = Math.min(MAX_WAVE, Math.max(1, Math.floor(wave)))
  const step = clamped - 1

  return {
    wave: clamped,
    crossingMs: Math.max(5000, Math.round(15000 - (step * 10000) / (MAX_WAVE - 1))),
    spawnIntervalMs: Math.max(1400, Math.round(3500 - (step * 2100) / (MAX_WAVE - 1))),
    maxBirds: Math.min(6, 1 + Math.floor((step * 5) / (MAX_WAVE - 1))),
    laneSpeedFactors: LANE_SPEED_FACTORS,
  }
}

export function preferredLengthsForWave(wave: number): number[] {
  const clamped = Math.max(1, Math.floor(wave))
  if (clamped <= 3) return [3, 4]
  if (clamped <= 6) return [3, 4, 5]
  return [4, 5, 6]
}
