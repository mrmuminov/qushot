import { describe, expect, it } from 'vitest'
import { letterCount, normalizeChar, normalizeWord } from './normalize'

describe('normalizeWord', () => {
  it('lowercases and trims words', () => {
    expect(normalizeWord('  Qush  ')).toBe('qush')
    expect(normalizeWord('MAKTAB')).toBe('maktab')
  })

  it('folds every apostrophe variant to a plain apostrophe', () => {
    for (const word of ["bo'ri", 'bo’ri', 'bo‘ri', 'boʻri', 'boʼri']) {
      expect(normalizeWord(word)).toBe("bo'ri")
    }
  })

  it('handles oʻ and gʻ in mixed case', () => {
    expect(normalizeWord('OʻRDAK')).toBe("o'rdak")
    expect(normalizeWord('GʻOZ')).toBe("g'oz")
  })
})

describe('normalizeChar', () => {
  it('accepts letters and apostrophes', () => {
    expect(normalizeChar('A')).toBe('a')
    expect(normalizeChar('z')).toBe('z')
    expect(normalizeChar('ʻ')).toBe("'")
    expect(normalizeChar('’')).toBe("'")
  })

  it('ignores keys that are not single letters', () => {
    expect(normalizeChar('Shift')).toBeNull()
    expect(normalizeChar('1')).toBeNull()
    expect(normalizeChar(' ')).toBeNull()
    expect(normalizeChar('Backspace')).toBeNull()
    expect(normalizeChar('`')).toBeNull()
    expect(normalizeChar('´')).toBeNull()
  })
})

describe('letterCount', () => {
  it('counts every normalized character including apostrophes', () => {
    expect(letterCount('qush')).toBe(4)
    expect(letterCount(normalizeWord('boʻri'))).toBe(5)
  })
})
