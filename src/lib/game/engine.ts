import wordsData from '../data/words.json'
import {
  difficultyForWave,
  preferredLengthsForWave,
  waveForResolved,
  type Difficulty,
} from './difficulty'
import {
  comboAfterEscape,
  comboAfterHit,
  MAX_MULTIPLIER,
  PERFECT_WAVE_BONUS,
  pointsForWord,
} from './scoring'
import { backspace, typeChar, type Target } from './typing'
import { createWordPool, type WordPool } from './wordPool'

export type GameStatus = 'countdown' | 'playing' | 'paused' | 'dying' | 'gameover'
export type Lane = 0 | 1 | 2

export interface BirdView {
  id: number
  word: string
  normalized: string
  x: number
  lane: Lane
  variant: number
  speed: number
}

export interface GameSnapshot {
  status: GameStatus
  birds: readonly BirdView[]
  hearts: number
  score: number
  combo: number
  multiplier: number
  wave: number
  resolved: number
  countdown: number
  buffer: string
  wrongSeq: number
  hits: number
  escapes: number
}

export type GameEvent =
  | { type: 'spawn'; bird: BirdView }
  | { type: 'hit'; bird: BirdView; points: number; perfectBonus: number }
  | { type: 'escape'; bird: BirdView }
  | { type: 'wrong'; char: string; wrongSeq: number }
  | { type: 'wave'; wave: number; perfect: boolean; bonus: number }
  | { type: 'gameover'; score: number }

export interface GameEngineOptions {
  words?: readonly string[]
  random?: () => number
  countdownMs?: number
  dyingMs?: number
}

export interface GameEngine {
  snapshot(): GameSnapshot
  update(dtMs: number): GameEvent[]
  typeKey(key: string): GameEvent[]
  pressBackspace(): void
  togglePause(): boolean
  pause(): void
  resume(): void
  restart(): void
}

interface Bird {
  id: number
  word: string
  normalized: string
  x: number
  lane: Lane
  variant: number
  speed: number
}

export const MAX_HEARTS = 3
const DYING_SPEED = 0.35

export function createEngine(options: GameEngineOptions = {}): GameEngine {
  const random = options.random ?? Math.random
  const words = options.words ?? wordsData
  const countdownMs = options.countdownMs ?? 3000
  const dyingMs = options.dyingMs ?? 600

  let pool: WordPool
  let status: GameStatus
  let birds: Bird[]
  let buffer: string
  let hearts: number
  let score: number
  let combo: number
  let wave: number
  let resolved: number
  let hits: number
  let escapes: number
  let escapesThisWave: number
  let wrongSeq: number
  let nextId: number
  let countdownLeft: number
  let dyingLeft: number
  let spawnTimer: number
  let pausedFrom: 'countdown' | 'playing' | null

  function reset(): void {
    pool = createWordPool(words, random)
    status = countdownMs > 0 ? 'countdown' : 'playing'
    birds = []
    buffer = ''
    hearts = MAX_HEARTS
    score = 0
    combo = 0
    wave = 1
    resolved = 0
    hits = 0
    escapes = 0
    escapesThisWave = 0
    wrongSeq = 0
    nextId = 1
    countdownLeft = Math.max(0, countdownMs)
    dyingLeft = 0
    spawnTimer = 0
    pausedFrom = null
  }

  function view(bird: Bird): BirdView {
    return {
      id: bird.id,
      word: bird.word,
      normalized: bird.normalized,
      x: bird.x,
      lane: bird.lane,
      variant: bird.variant,
      speed: bird.speed,
    }
  }

  function difficulty(): Difficulty {
    return difficultyForWave(wave)
  }

  function spawnBird(events: GameEvent[]): boolean {
    const current = difficulty()
    let entry
    try {
      entry = pool.pick(birds, preferredLengthsForWave(wave))
    } catch {
      return false
    }

    const laneIndex = Math.min(2, Math.floor(random() * 3))
    const lane = laneIndex as Lane
    const variant = Math.min(4, Math.floor(random() * 5))
    const bird: Bird = {
      id: nextId,
      word: entry.word,
      normalized: entry.normalized,
      x: 0,
      lane,
      variant,
      speed: current.laneSpeedFactors[lane] / current.crossingMs,
    }
    nextId += 1
    birds.push(bird)
    events.push({ type: 'spawn', bird: view(bird) })
    return true
  }

  function updateWave(events: GameEvent[]): number {
    const nextWave = waveForResolved(resolved)
    if (nextWave === wave) return 0

    const perfect = escapesThisWave === 0
    const bonus = perfect ? PERFECT_WAVE_BONUS : 0
    score += bonus
    wave = nextWave
    escapesThisWave = 0
    events.push({ type: 'wave', wave, perfect, bonus })
    return bonus
  }

  function hitBird(bird: Bird): GameEvent[] {
    const events: GameEvent[] = []
    birds = birds.filter((candidate) => candidate.id !== bird.id)
    buffer = ''
    combo = comboAfterHit(combo)
    const points = pointsForWord(bird.normalized, combo)
    score += points
    hits += 1
    resolved += 1
    const perfectBonus = updateWave(events)
    events.unshift({ type: 'hit', bird: view(bird), points, perfectBonus })
    return events
  }

  function escapeBird(bird: Bird, events: GameEvent[]): void {
    birds = birds.filter((candidate) => candidate.id !== bird.id)
    buffer = ''
    combo = comboAfterEscape()
    hearts = Math.max(0, hearts - 1)
    escapes += 1
    escapesThisWave += 1
    resolved += 1
    events.push({ type: 'escape', bird: view(bird) })
    updateWave(events)

    if (hearts === 0 && status === 'playing') {
      status = 'dying'
      dyingLeft = dyingMs
    }
  }

  function moveBirds(dtMs: number, speedScale: number, events: GameEvent[]): void {
    for (const bird of [...birds]) {
      bird.x += bird.speed * dtMs * speedScale
      if (status === 'playing' && bird.x >= 1) {
        escapeBird(bird, events)
      }
    }
  }

  function targets(): Target[] {
    return birds.map((bird) => ({
      id: String(bird.id),
      word: bird.word,
      normalized: bird.normalized,
      danger: bird.x,
    }))
  }

  reset()

  return {
    snapshot() {
      return {
        status,
        birds: birds.map(view),
        hearts,
        score,
        combo,
        multiplier: Math.min(MAX_MULTIPLIER, combo),
        wave,
        resolved,
        countdown: Math.ceil(countdownLeft / 1000),
        buffer,
        wrongSeq,
        hits,
        escapes,
      }
    },

    update(dtMs) {
      const events: GameEvent[] = []
      const dt = Math.max(0, dtMs)

      if (status === 'countdown') {
        countdownLeft -= dt
        if (countdownLeft > 0) return events

        countdownLeft = 0
        status = 'playing'
        if (spawnBird(events)) {
          spawnTimer = difficulty().spawnIntervalMs
        }
        return events
      }

      if (status === 'playing') {
        moveBirds(dt, 1, events)
        if (status !== 'playing') return events

        const current = difficulty()
        spawnTimer -= dt

        if (spawnTimer <= 0) {
          if (birds.length < current.maxBirds) {
            if (spawnBird(events)) {
              spawnTimer = Math.max(0, spawnTimer + current.spawnIntervalMs)
            }
          } else {
            spawnTimer = 0
          }
        }

        return events
      }

      if (status === 'dying') {
        for (const bird of [...birds]) {
          bird.x += bird.speed * dt * DYING_SPEED
          if (bird.x >= 1) {
            birds = birds.filter((candidate) => candidate.id !== bird.id)
          }
        }

        dyingLeft -= dt
        if (dyingLeft <= 0) {
          dyingLeft = 0
          status = 'gameover'
          events.push({ type: 'gameover', score })
        }
      }

      return events
    },

    typeKey(key) {
      if (status !== 'playing' || birds.length === 0) return []

      const result = typeChar(buffer, key, targets())
      if (result.kind === 'ignored') return []

      if (result.kind === 'wrong') {
        buffer = result.buffer
        wrongSeq += 1
        return [{ type: 'wrong', char: result.char, wrongSeq }]
      }

      buffer = result.buffer
      if (result.targetId === undefined) return []

      const bird = birds.find((candidate) => String(candidate.id) === result.targetId)
      if (!bird) {
        buffer = ''
        return []
      }

      return hitBird(bird)
    },

    pressBackspace() {
      if (status !== 'playing') return
      buffer = backspace(buffer)
    },

    togglePause() {
      if (status === 'playing' || status === 'countdown') {
        pausedFrom = status
        status = 'paused'
        return true
      }
      if (status === 'paused') {
        status = pausedFrom ?? 'playing'
        pausedFrom = null
        return false
      }
      return false
    },

    pause() {
      if (status === 'playing' || status === 'countdown') {
        pausedFrom = status
        status = 'paused'
      }
    },

    resume() {
      if (status === 'paused') {
        status = pausedFrom ?? 'playing'
        pausedFrom = null
      }
    },

    restart() {
      reset()
    },
  }
}
