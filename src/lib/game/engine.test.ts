import { describe, expect, it } from 'vitest'
import { createEngine, type BirdView, type GameEngine, type GameEvent } from './engine'

const WORDS = ['qush', 'olma', 'kit', 'baliq', 'uzum', 'sher']

function makeEngine(overrides: Partial<Parameters<typeof createEngine>[0]> = {}): GameEngine {
  return createEngine({
    words: WORDS,
    random: () => 0.5,
    countdownMs: 3000,
    dyingMs: 600,
    ...overrides,
  })
}

function start(engine: GameEngine): BirdView {
  engine.update(3000)
  const bird = engine.snapshot().birds[0]
  if (!bird) throw new Error('Expected a bird after the countdown')
  return bird
}

function typeWord(engine: GameEngine, bird: BirdView): GameEvent[] {
  let events: GameEvent[] = []
  for (const char of [...bird.word]) {
    events = engine.typeKey(char)
  }
  return events
}

describe('game engine', () => {
  it('waits through a three second countdown before the first bird', () => {
    const engine = makeEngine()

    expect(engine.snapshot().status).toBe('countdown')
    expect(engine.snapshot().countdown).toBe(3)
    expect(engine.snapshot().birds).toHaveLength(0)

    engine.update(1000)
    expect(engine.snapshot().countdown).toBe(2)
    expect(engine.snapshot().birds).toHaveLength(0)

    engine.update(2000)
    expect(engine.snapshot().status).toBe('playing')
    expect(engine.snapshot().countdown).toBe(0)
    expect(engine.snapshot().birds).toHaveLength(1)
  })

  it('keeps only one bird in the air in the first wave', () => {
    const engine = makeEngine()
    start(engine)
    engine.update(10000)
    expect(engine.snapshot().birds).toHaveLength(1)
  })

  it('accepts a whole word and scores it', () => {
    const engine = makeEngine()
    const bird = start(engine)
    const events = typeWord(engine, bird)

    expect(events.at(-1)).toMatchObject({ type: 'hit', bird: { id: bird.id } })

    const snapshot = engine.snapshot()
    expect(snapshot.birds).toHaveLength(0)
    expect(snapshot.score).toBe([...bird.normalized].length * 10)
    expect(snapshot.combo).toBe(1)
    expect(snapshot.resolved).toBe(1)
    expect(snapshot.hearts).toBe(3)
  })

  it('applies the combo multiplier to later hits', () => {
    const engine = makeEngine()
    const first = start(engine)
    const firstEvents = typeWord(engine, first)
    const firstHit = firstEvents.find((event) => event.type === 'hit')

    engine.update(3500)
    const second = engine.snapshot().birds[0]
    if (!second) throw new Error('Expected a second bird')
    const secondEvents = typeWord(engine, second)
    const secondHit = secondEvents.find((event) => event.type === 'hit')

    expect(firstHit).toMatchObject({
      type: 'hit',
      points: [...first.normalized].length * 10,
    })
    expect(secondHit).toMatchObject({
      type: 'hit',
      points: [...second.normalized].length * 20,
    })
    expect(engine.snapshot().combo).toBe(2)
  })

  it('keeps a wrong key in the buffer without changing the score or combo', () => {
    const engine = makeEngine()
    const bird = start(engine)

    const events = engine.typeKey('z')
    expect(events[0]).toMatchObject({ type: 'wrong', char: 'z' })
    expect(engine.snapshot().buffer).toBe('z')
    expect(engine.snapshot().score).toBe(0)
    expect(engine.snapshot().combo).toBe(0)

    engine.pressBackspace()
    expect(engine.snapshot().buffer).toBe('')

    engine.typeKey(bird.word[0]!)
    expect(engine.snapshot().buffer).toBe(bird.normalized[0])
  })

  it('loses a heart and resets the combo when a bird escapes', () => {
    const engine = makeEngine()
    const first = start(engine)
    typeWord(engine, first)

    engine.update(3500)
    const second = engine.snapshot().birds[0]
    if (!second) throw new Error('Expected a second bird')
    typeWord(engine, second)
    expect(engine.snapshot().combo).toBe(2)

    engine.update(3500)
    const third = engine.snapshot().birds[0]
    if (!third) throw new Error('Expected a third bird')
    engine.typeKey(third.word[0]!)

    const events = engine.update(15000)
    expect(events.some((event) => event.type === 'escape')).toBe(true)

    const snapshot = engine.snapshot()
    expect(snapshot.hearts).toBe(2)
    expect(snapshot.combo).toBe(0)
    expect(snapshot.buffer).toBe('')
    expect(snapshot.resolved).toBe(3)
  })

  it('slows down before game over and then reports it once', () => {
    const engine = makeEngine()
    start(engine)

    engine.update(15000)
    engine.update(15000)
    engine.update(15000)

    expect(engine.snapshot().status).toBe('dying')
    expect(engine.snapshot().hearts).toBe(0)

    const early = engine.update(300)
    expect(early.some((event) => event.type === 'gameover')).toBe(false)
    expect(engine.snapshot().status).toBe('dying')

    const final = engine.update(300)
    expect(final.some((event) => event.type === 'gameover')).toBe(true)
    expect(engine.snapshot().status).toBe('gameover')
  })

  it('pauses the countdown too', () => {
    const engine = makeEngine()
    engine.update(1000)

    expect(engine.togglePause()).toBe(true)
    engine.update(5000)
    expect(engine.snapshot().countdown).toBe(2)

    expect(engine.togglePause()).toBe(false)
    engine.update(2000)
    expect(engine.snapshot().status).toBe('playing')
  })

  it('pauses movement and typing', () => {
    const engine = makeEngine()
    start(engine)

    expect(engine.togglePause()).toBe(true)
    expect(engine.snapshot().status).toBe('paused')

    engine.update(10000)
    expect(engine.snapshot().birds[0]?.x).toBe(0)
    expect(engine.typeKey('q')).toEqual([])

    expect(engine.togglePause()).toBe(false)
    engine.update(1000)
    expect(engine.snapshot().birds[0]?.x).toBeGreaterThan(0)
  })

  it('starts a new wave with a bonus after ten perfect hits', () => {
    const engine = makeEngine()
    start(engine)

    const events: GameEvent[] = []
    for (let index = 0; index < 10; index += 1) {
      const bird = engine.snapshot().birds[0]
      if (!bird) throw new Error(`Expected bird ${index}`)
      events.push(...typeWord(engine, bird))
      if (index < 9) engine.update(3500)
    }

    const waveEvent = events.find((event) => event.type === 'wave')
    expect(waveEvent).toMatchObject({ type: 'wave', wave: 2, perfect: true, bonus: 50 })
    expect(engine.snapshot().wave).toBe(2)
    expect(engine.snapshot().score).toBeGreaterThan(50)
  })

  it('restarts cleanly', () => {
    const engine = makeEngine()
    const bird = start(engine)
    typeWord(engine, bird)
    engine.update(3500)

    engine.restart()

    const snapshot = engine.snapshot()
    expect(snapshot.status).toBe('countdown')
    expect(snapshot.countdown).toBe(3)
    expect(snapshot.birds).toHaveLength(0)
    expect(snapshot.hearts).toBe(3)
    expect(snapshot.score).toBe(0)
    expect(snapshot.combo).toBe(0)
    expect(snapshot.resolved).toBe(0)
    expect(snapshot.buffer).toBe('')
  })
})
