export const WORD_LETTER_POINTS = 10
export const MAX_MULTIPLIER = 5
export const PERFECT_WAVE_BONUS = 50

export function pointsForWord(word: string, combo: number): number {
  const multiplier = Math.min(MAX_MULTIPLIER, Math.max(1, Math.floor(combo)))
  return [...word].length * WORD_LETTER_POINTS * multiplier
}

export function comboAfterHit(combo: number): number {
  return combo + 1
}

export function comboAfterEscape(): number {
  return 0
}
