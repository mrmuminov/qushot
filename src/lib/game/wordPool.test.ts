import { describe, expect, it } from 'vitest'
import { createWordPool } from './wordPool'

function sequenceRandom(values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length] ?? 0.5
}

describe('word pool', () => {
  it('normalizes entries and drops duplicates by normalized form', () => {
    const pool = createWordPool(['Boʻri', "bo'ri", 'qush'], sequenceRandom([0.1]))
    expect(pool.size).toBe(2)
  })

  it('never repeats a word until the bag is empty', () => {
    const pool = createWordPool(['ari', 'kit', 'qush'], sequenceRandom([0.5]))
    const picked = [pool.pick([]), pool.pick([]), pool.pick([])]
    expect(new Set(picked.map((word) => word.normalized)).size).toBe(3)
  })

  it('avoids first letters already flying', () => {
    const pool = createWordPool(['qush', 'qalam', 'kit'], sequenceRandom([0.5]))
    for (let i = 0; i < 20; i += 1) {
      const picked = pool.pick([{ word: 'qush', normalized: 'qush' }])
      expect(picked.normalized.startsWith('q')).toBe(false)
    }
  })

  it('never picks a word that is a prefix of, or starts with, an active word', () => {
    const pool = createWordPool(['qush', 'quyon', 'kit'], sequenceRandom([0.3]))
    for (let i = 0; i < 20; i += 1) {
      const picked = pool.pick([{ word: 'quyon', normalized: 'quyon' }])
      expect(picked.normalized.startsWith('q')).toBe(false)
    }
  })

  it('prefers the requested lengths but falls back when none are free', () => {
    const pool = createWordPool(['ari', 'kit', 'delfin'], sequenceRandom([0.2]))
    const short = pool.pick([], [3])
    expect(short.length).toBe(3)
    const long = pool.pick(
      [
        { word: 'ari', normalized: 'ari' },
        { word: 'kit', normalized: 'kit' },
      ],
      [3],
    )
    expect(long.length).toBe(6)
  })

  it('can still pick when every preferred word is already flying', () => {
    const pool = createWordPool(['ari', 'kit', 'qush'], sequenceRandom([0]))
    const picked = pool.pick(
      [
        { word: 'ari', normalized: 'ari' },
        { word: 'kit', normalized: 'kit' },
      ],
      [3],
    )
    expect(picked.normalized).toBe('qush')
  })
})
