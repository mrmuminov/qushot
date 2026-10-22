import { describe, expect, it } from 'vitest'
import {
  MAX_WAVE,
  RESOLVED_PER_WAVE,
  difficultyForWave,
  preferredLengthsForWave,
  waveForResolved,
} from './difficulty'

describe('difficulty', () => {
  it('advances a wave every ten resolved birds', () => {
    expect(RESOLVED_PER_WAVE).toBe(10)
    expect(waveForResolved(0)).toBe(1)
    expect(waveForResolved(9)).toBe(1)
    expect(waveForResolved(10)).toBe(2)
    expect(waveForResolved(95)).toBe(10)
    expect(waveForResolved(200)).toBe(21)
  })

  it('starts gentle', () => {
    const wave = difficultyForWave(1)
    expect(wave.crossingMs).toBe(15000)
    expect(wave.spawnIntervalMs).toBe(3500)
    expect(wave.maxBirds).toBe(1)
  })

  it('reaches the hardest cap at wave ten and stays there', () => {
    const wave = difficultyForWave(MAX_WAVE)
    expect(wave.crossingMs).toBe(5000)
    expect(wave.spawnIntervalMs).toBe(1400)
    expect(wave.maxBirds).toBe(6)
    expect(difficultyForWave(99)).toEqual(wave)
    expect(difficultyForWave(0)).toEqual(difficultyForWave(1))
  })

  it('prefers short words early, then longer words', () => {
    expect(preferredLengthsForWave(1)).toEqual([3, 4])
    expect(preferredLengthsForWave(3)).toEqual([3, 4])
    expect(preferredLengthsForWave(4)).toEqual([3, 4, 5])
    expect(preferredLengthsForWave(7)).toEqual([4, 5, 6])
  })

  it('keeps far birds slower and near birds faster', () => {
    expect(difficultyForWave(1).laneSpeedFactors).toEqual([0.85, 1, 1.15])
  })
})
