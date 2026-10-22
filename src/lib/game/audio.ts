export type SoundName = 'click' | 'bow' | 'hit' | 'wrong' | 'heart' | 'wave' | 'gameover' | 'record'

export interface AudioController {
  unlock(): Promise<void>
  setSound(on: boolean): void
  setMusic(on: boolean): void
  play(name: SoundName): void
  dispose(): void
}

type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'

interface Note {
  frequency: number
  duration: number
  type?: Wave
  gain?: number
  delay?: number
  endFrequency?: number
}

const MUSIC_NOTES = [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33]
const MUSIC_STEP_MS = 320

export function createAudio(): AudioController {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let effects: GainNode | null = null
  let music: GainNode | null = null
  let soundOn = true
  let musicOn = true
  let musicTimer: ReturnType<typeof setInterval> | null = null
  let musicStep = 0

  function ensureContext(): AudioContext {
    if (context) return context

    context = new AudioContext()
    master = context.createGain()
    master.gain.value = 0.85
    master.connect(context.destination)

    effects = context.createGain()
    effects.gain.value = 0.5
    effects.connect(master)

    music = context.createGain()
    music.gain.value = 0.16
    music.connect(master)

    return context
  }

  function tone(note: Note, destination: GainNode | null = effects): void {
    if (!context || !destination) return

    const start = context.currentTime + (note.delay ?? 0)
    const duration = note.duration
    const oscillator = context.createOscillator()
    const envelope = context.createGain()

    oscillator.type = note.type ?? 'sine'
    oscillator.frequency.setValueAtTime(note.frequency, start)
    if (note.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, note.endFrequency),
        start + duration,
      )
    }

    const gain = note.gain ?? 0.12
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(envelope)
    envelope.connect(destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  function startMusic(): void {
    if (!musicOn || musicTimer || !context) return
    if (context.state !== 'running') return

    musicTimer = setInterval(() => {
      if (!musicOn || !context || context.state !== 'running') return
      const note = MUSIC_NOTES[musicStep % MUSIC_NOTES.length] ?? 523.25
      tone({ frequency: note, duration: 0.55, type: 'triangle', gain: 0.05 }, music)
      if (musicStep % 8 === 0) {
        tone({ frequency: 130.81, duration: 1.2, type: 'sine', gain: 0.04 }, music)
      }
      musicStep += 1
    }, MUSIC_STEP_MS)
  }

  function stopMusic(): void {
    if (musicTimer) {
      clearInterval(musicTimer)
      musicTimer = null
    }
  }

  async function unlock(): Promise<void> {
    const audioContext = ensureContext()
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    startMusic()
  }

  function play(name: SoundName): void {
    if (!soundOn || !context || context.state !== 'running') return

    switch (name) {
      case 'click':
        tone({ frequency: 720, duration: 0.07, type: 'triangle', gain: 0.08 })
        break
      case 'bow':
        tone({ frequency: 420, endFrequency: 120, duration: 0.16, type: 'sawtooth', gain: 0.07 })
        tone({ frequency: 180, duration: 0.1, type: 'triangle', gain: 0.05 })
        break
      case 'hit':
        tone({ frequency: 880, duration: 0.1, type: 'sine', gain: 0.1 })
        tone({ frequency: 1318.5, duration: 0.16, type: 'sine', gain: 0.07, delay: 0.05 })
        break
      case 'wrong':
        tone({ frequency: 150, endFrequency: 110, duration: 0.18, type: 'square', gain: 0.055 })
        break
      case 'heart':
        tone({ frequency: 392, endFrequency: 196, duration: 0.32, type: 'triangle', gain: 0.1 })
        tone({ frequency: 262, endFrequency: 131, duration: 0.32, type: 'sine', gain: 0.06 })
        break
      case 'wave':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          tone({ frequency, duration: 0.18, type: 'triangle', gain: 0.07, delay: index * 0.075 })
        })
        break
      case 'gameover':
        ;[392, 329.63, 261.63, 196].forEach((frequency, index) => {
          tone({
            frequency,
            duration: 0.28,
            type: 'triangle',
            gain: 0.09,
            delay: index * 0.16,
          })
        })
        break
      case 'record':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          tone({ frequency, duration: 0.24, type: 'sine', gain: 0.08, delay: index * 0.09 })
        })
        break
    }
  }

  return {
    unlock,
    setSound(on) {
      soundOn = on
    },
    setMusic(on) {
      musicOn = on
      if (on) {
        startMusic()
      } else {
        stopMusic()
      }
    },
    play,
    dispose() {
      stopMusic()
      if (context) {
        void context.close()
        context = null
      }
    },
  }
}
