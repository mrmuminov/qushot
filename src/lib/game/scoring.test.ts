import { describe, expect, it } from 'vitest'
import { WORD_LETTER_POINTS, comboAfterEscape, comboAfterHit, pointsForWord } from './scoring'

describe('scoring', () => {
  it('gives letters × 10 × multiplier points', () => {
    expect(pointsForWord('qush', 1)).toBe(4 * WORD_LETTER_POINTS)
    expect(pointsForWord('qush', 3)).toBe(4 * WORD_LETTER_POINTS * 3)
  })

  it('caps the multiplier at five', () => {
    expect(pointsForWord('olma', 5)).toBe(4 * WORD_LETTER_POINTS * 5)
    expect(pointsForWord('olma', 8)).toBe(4 * WORD_LETTER_POINTS * 5)
  })

  it('never drops below a multiplier of one', () => {
    expect(pointsForWord('ari', 0)).toBe(3 * WORD_LETTER_POINTS)
  })

  it('increments the combo on a hit and resets it on an escape', () => {
    expect(comboAfterHit(0)).toBe(1)
    expect(comboAfterHit(4)).toBe(5)
    expect(comboAfterEscape()).toBe(0)
  })
})
