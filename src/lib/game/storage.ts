import { isTauri } from '@tauri-apps/api/core'
import type { Store } from '@tauri-apps/plugin-store'

export interface WindowSize {
  width: number
  height: number
}

export interface Settings {
  bestScore: number
  soundOn: boolean
  musicOn: boolean
  windowSize: WindowSize | null
}

const STORAGE_KEY = 'qushot.settings.v1'
const STORE_FILE = 'settings.json'

export const DEFAULT_SETTINGS: Settings = {
  bestScore: 0,
  soundOn: true,
  musicOn: true,
  windowSize: null,
}

let cached: Settings | null = null
let storePromise: Promise<Store> | null = null
let writeQueue: Promise<void> = Promise.resolve()

function validSize(value: unknown): WindowSize | null {
  if (!value || typeof value !== 'object') return null
  const width = Number((value as WindowSize).width)
  const height = Number((value as WindowSize).height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (width < 960 || height < 540) return null
  return { width: Math.round(width), height: Math.round(height) }
}

function sanitize(value: Partial<Settings> | null | undefined): Settings {
  return {
    bestScore: Math.max(0, Math.floor(Number(value?.bestScore) || 0)),
    soundOn: value?.soundOn !== false,
    musicOn: value?.musicOn !== false,
    windowSize: validSize(value?.windowSize),
  }
}

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = import('@tauri-apps/plugin-store').then(({ load }) =>
      load(STORE_FILE, { autoSave: 250 }),
    )
  }
  return storePromise
}

function readLocal(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? sanitize(JSON.parse(raw) as Partial<Settings>) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function writeLocal(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    return
  }
}

export async function loadSettings(): Promise<Settings> {
  if (cached) return cached

  if (isTauri()) {
    try {
      const store = await getStore()
      const [bestScore, soundOn, musicOn, windowSize] = await Promise.all([
        store.get<number>('bestScore'),
        store.get<boolean>('soundOn'),
        store.get<boolean>('musicOn'),
        store.get<WindowSize>('windowSize'),
      ])
      cached = sanitize({ bestScore, soundOn, musicOn, windowSize })
      return cached
    } catch {
      cached = readLocal()
      return cached
    }
  }

  cached = readLocal()
  return cached
}

async function persist(value: Settings): Promise<void> {
  if (isTauri()) {
    try {
      const store = await getStore()
      await store.set('bestScore', value.bestScore)
      await store.set('soundOn', value.soundOn)
      await store.set('musicOn', value.musicOn)
      await store.set('windowSize', value.windowSize)
      await store.save()
      return
    } catch {
      writeLocal(value)
      return
    }
  }

  writeLocal(value)
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await loadSettings()
  cached = sanitize({ ...current, ...patch })
  const value = cached
  writeQueue = writeQueue.then(() => persist(value))
  await writeQueue
}
