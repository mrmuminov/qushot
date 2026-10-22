const APOSTROPHES = /[\u2018\u2019\u02BB\u02BC']/g

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(APOSTROPHES, "'")
}

export function normalizeChar(key: string): string | null {
  if ([...key].length !== 1) return null
  const char = key.toLowerCase().replace(APOSTROPHES, "'")
  return /^[a-z']$/.test(char) ? char : null
}

export function letterCount(word: string): number {
  return [...word].length
}

export function isValidWord(word: string): boolean {
  const normalized = normalizeWord(word)
  if (!/^[a-z][a-z']*$/.test(normalized)) return false
  if (normalized.includes("''")) return false
  if (normalized.endsWith("'") && !/[go]'$/.test(normalized)) return false
  const length = letterCount(normalized)
  return length >= 3 && length <= 6
}
