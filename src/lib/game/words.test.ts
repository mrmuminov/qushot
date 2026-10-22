import { describe, expect, it } from 'vitest'
import words from '../data/words.json'
import { isValidWord, normalizeWord } from './normalize'

describe('word list', () => {
  it('has 120 words', () => {
    expect(words).toHaveLength(120)
  })

  it('contains only valid 3–6 letter words', () => {
    for (const word of words) {
      expect(isValidWord(word), word).toBe(true)
      const length = [...normalizeWord(word)].length
      expect(length, word).toBeGreaterThanOrEqual(3)
      expect(length, word).toBeLessThanOrEqual(6)
    }
  })

  it('has no duplicates once normalized', () => {
    const normalized = words.map(normalizeWord)
    expect(new Set(normalized).size).toBe(words.length)
  })

  it('uses Uzbek Latin letters and apostrophes only', () => {
    for (const word of words) {
      expect(word).toMatch(/^[a-zA-Zʻʼ’']+$/)
    }
  })
})
