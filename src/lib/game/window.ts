import { isTauri } from '@tauri-apps/api/core'
import type { WindowSize } from './storage'

export async function restoreWindowSize(size: WindowSize | null): Promise<void> {
  if (!size || !isTauri()) return

  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
    const width = Math.max(960, Math.min(size.width, window.screen.availWidth))
    const height = Math.max(540, Math.min(size.height, window.screen.availHeight))
    await getCurrentWindow().setSize(new LogicalSize(width, height))
  } catch {
    return
  }
}

export async function currentWindowSize(): Promise<WindowSize | null> {
  if (!isTauri()) return null

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    if (await win.isFullscreen()) return null
    const scale = await win.scaleFactor()
    const size = (await win.innerSize()).toLogical(scale)
    return { width: Math.round(size.width), height: Math.round(size.height) }
  } catch {
    return null
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      await win.setFullscreen(!(await win.isFullscreen()))
    } catch {
      return
    }
    return
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await document.documentElement.requestFullscreen()
  }
}
