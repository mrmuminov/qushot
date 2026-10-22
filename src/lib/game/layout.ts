export const STAGE_WIDTH = 1280
export const STAGE_HEIGHT = 720

export const BIRD_LANES = [
  { top: 224, scale: 0.76, depth: 2, opacity: 0.9 },
  { top: 312, scale: 0.94, depth: 4, opacity: 1 },
  { top: 402, scale: 1.12, depth: 6, opacity: 1 },
] as const

export const BIRD_PALETTES = [
  { body: '#4f9cf9', dark: '#2563c9', light: '#b9dcff', belly: '#e8f4ff' },
  { body: '#f48a4b', dark: '#d9652c', light: '#ffd2ae', belly: '#fff0df' },
  { body: '#54c47a', dark: '#2f9960', light: '#bdf0cd', belly: '#ecfff2' },
  { body: '#a77bf3', dark: '#7c4fd4', light: '#ddccff', belly: '#f4ecff' },
  { body: '#ef79a9', dark: '#c94d80', light: '#ffd0e1', belly: '#fff0f6' },
] as const
