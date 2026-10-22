import { normalizeWord } from './normalize'

export interface WordEntry {
  word: string
  normalized: string
  length: number
}

export interface ActiveWord {
  word: string
  normalized?: string
}

export interface WordPool {
  readonly size: number
  pick(active: readonly ActiveWord[], preferredLengths?: readonly number[]): WordEntry
}

function sharesFirstLetter(a: string, b: string): boolean {
  return a.charAt(0) === b.charAt(0)
}

export function createWordPool(
  words: readonly string[],
  random: () => number = Math.random,
): WordPool {
  const entries: WordEntry[] = []
  const seen = new Set<string>()

  for (const word of words) {
    const normalized = normalizeWord(word)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    entries.push({ word, normalized, length: [...normalized].length })
  }

  let bag: WordEntry[] = []

  function refill(): void {
    bag = entries.slice()
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1))
      const current = bag[index]
      bag[index] = bag[swapIndex]!
      bag[swapIndex] = current!
    }
  }

  return {
    size: entries.length,

    pick(active, preferredLengths = []) {
      if (entries.length === 0) {
        throw new Error('Word pool is empty')
      }

      const activeWords = active.map((entry) => entry.normalized ?? normalizeWord(entry.word))
      const isFree = (entry: WordEntry): boolean =>
        activeWords.every(
          (activeWord) =>
            activeWord !== entry.normalized &&
            !sharesFirstLetter(activeWord, entry.normalized) &&
            !activeWord.startsWith(entry.normalized) &&
            !entry.normalized.startsWith(activeWord),
        )

      const preferred = new Set(preferredLengths)

      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (bag.length === 0) refill()

        const free = bag.filter(isFree)
        const preferredFree =
          preferred.size > 0 ? free.filter((entry) => preferred.has(entry.length)) : []
        const chosen = preferredFree[0] ?? free[0]

        if (chosen) {
          bag = bag.filter((entry) => entry !== chosen)
          return chosen
        }

        refill()
      }

      throw new Error('No word is available for the active birds')
    },
  }
}
