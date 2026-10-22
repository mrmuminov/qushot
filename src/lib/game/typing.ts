import { normalizeChar, normalizeWord } from './normalize'

export interface Target {
  id: string
  word: string
  normalized?: string
  danger: number
}

export type TypeResult =
  | { kind: 'accepted'; buffer: string; targetId: string | undefined }
  | { kind: 'wrong'; buffer: string; char: string }
  | { kind: 'ignored' }

function normalizedOf(target: Target): string {
  return target.normalized ?? normalizeWord(target.word)
}

export function typeChar(buffer: string, key: string, targets: readonly Target[]): TypeResult {
  const char = normalizeChar(key)
  if (char === null) return { kind: 'ignored' }

  const next = buffer + char
  const exact = targets.filter((target) => normalizedOf(target) === next)
  if (exact.length > 0) {
    const target = exact.reduce((best, candidate) =>
      candidate.danger > best.danger ? candidate : best,
    )
    return { kind: 'accepted', buffer: next, targetId: target.id }
  }

  if (targets.some((target) => normalizedOf(target).startsWith(next))) {
    return { kind: 'accepted', buffer: next, targetId: undefined }
  }

  return { kind: 'wrong', buffer: next, char }
}

export function canStartTarget(key: string, targets: readonly Target[]): boolean {
  const char = normalizeChar(key)
  if (char === null) return false
  return targets.some((target) => normalizedOf(target).startsWith(char))
}

export function backspace(buffer: string): string {
  return buffer.slice(0, -1)
}
