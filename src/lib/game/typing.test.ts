import { describe, expect, it } from 'vitest'
import { backspace, canStartTarget, typeChar, type Target } from './typing'

const targets: Target[] = [
  { id: 'a', word: 'olma', danger: 10 },
  { id: 'b', word: 'oʻrik', normalized: "o'rik", danger: 80 },
]

describe('typing', () => {
  it('accepts keys that keep the buffer as a prefix', () => {
    const result = typeChar('', 'o', targets)
    expect(result).toEqual({ kind: 'accepted', buffer: 'o', targetId: undefined })
  })

  it('fires when the buffer matches a whole word', () => {
    const result = typeChar("o'ri", 'k', targets)
    expect(result).toEqual({ kind: 'accepted', buffer: "o'rik", targetId: 'b' })
  })

  it('picks the most dangerous target when several match', () => {
    const duplicates: Target[] = [
      { id: 'left', word: 'qush', normalized: 'qush', danger: 10 },
      { id: 'right', word: 'qush', normalized: 'qush', danger: 90 },
    ]
    const result = typeChar('qus', 'h', duplicates)
    expect(result).toEqual({ kind: 'accepted', buffer: 'qush', targetId: 'right' })
  })

  it('keeps a wrong key in the buffer and flags it', () => {
    const result = typeChar('o', 'x', targets)
    expect(result).toEqual({ kind: 'wrong', buffer: 'ox', char: 'x' })
  })

  it('treats all apostrophe variants as the same key', () => {
    const result = typeChar('o', 'ʻ', targets)
    expect(result).toEqual({ kind: 'accepted', buffer: "o'", targetId: undefined })
  })

  it('ignores non-letter keys', () => {
    expect(typeChar('', 'Shift', targets)).toEqual({ kind: 'ignored' })
  })

  it('does not start a buffer when no target starts with the key', () => {
    expect(typeChar('', 'z', targets)).toEqual({ kind: 'wrong', buffer: 'z', char: 'z' })
  })

  it('can tell whether a first letter has a target', () => {
    expect(canStartTarget('o', targets)).toBe(true)
    expect(canStartTarget('z', targets)).toBe(false)
  })

  it('backspace removes the last character', () => {
    expect(backspace('qus')).toBe('qu')
    expect(backspace('')).toBe('')
  })
})
