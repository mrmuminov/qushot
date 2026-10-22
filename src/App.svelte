<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import Archer from './lib/components/Archer.svelte'
  import Backdrop from './lib/components/Backdrop.svelte'
  import Bird from './lib/components/Bird.svelte'
  import { createAudio } from './lib/game/audio'
  import { RESOLVED_PER_WAVE } from './lib/game/difficulty'
  import { createEngine, MAX_HEARTS, type GameEvent, type GameSnapshot } from './lib/game/engine'
  import { BIRD_LANES, BIRD_PALETTES, STAGE_HEIGHT, STAGE_WIDTH } from './lib/game/layout'
  import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './lib/game/storage'
  import {
    currentWindowSize,
    restoreWindowSize,
    toggleFullscreen as toggleFullscreenWindow,
  } from './lib/game/window'

  type Screen = 'menu' | 'game' | 'gameover'

  interface Effect {
    id: number
    kind: 'shot' | 'feathers' | 'pop'
    x?: number
    y?: number
    angle?: number
    distance?: number
    variant?: number
    text?: string
  }

  const ARROW_ORIGIN = { x: 208, y: 574 }
  const HEART_SLOTS = Array.from({ length: MAX_HEARTS }, (_, index) => index)
  const PIP_SLOTS = Array.from({ length: RESOLVED_PER_WAVE }, (_, index) => index)

  const FEATHERS = [
    { x: -42, y: -30, rotation: -70 },
    { x: 24, y: -44, rotation: 60 },
    { x: 46, y: 4, rotation: 120 },
    { x: -22, y: 24, rotation: -110 },
    { x: 8, y: -16, rotation: 20 },
    { x: -52, y: 8, rotation: 150 },
  ]

  const engine = createEngine()
  const audio = createAudio()

  let snapshot = $state<GameSnapshot>(engine.snapshot())
  let screen = $state<Screen>('menu')
  let settings = $state<Settings>({ ...DEFAULT_SETTINGS })
  let scale = $state(1)
  let effects = $state<Effect[]>([])
  let result = $state<{ score: number; best: number; record: boolean } | null>(null)
  let waveNotice = $state<{ id: number; wave: number; perfect: boolean; bonus: number } | null>(
    null,
  )
  let toast = $state<string | null>(null)
  let bufferShake = $state(false)
  let hurt = $state(false)
  let archerShooting = $state(false)

  let settingsReady = false
  let lastFrame = 0
  let frameRequest = 0
  let effectId = 0
  let noticeId = 0
  let archerTimer: ReturnType<typeof setTimeout> | null = null
  let shakeTimer: ReturnType<typeof setTimeout> | null = null
  let hurtTimer: ReturnType<typeof setTimeout> | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let noticeTimer: ReturnType<typeof setTimeout> | null = null
  let resizeSaveTimer: ReturnType<typeof setTimeout> | null = null
  const effectTimers = new SvelteSet<ReturnType<typeof setTimeout>>()

  let displayBest = $derived(Math.max(settings.bestScore, snapshot.score))
  let showHint = $derived(
    screen === 'game' &&
      snapshot.status === 'playing' &&
      snapshot.resolved === 0 &&
      snapshot.buffer.length === 0,
  )
  let wavePips = $derived(snapshot.resolved % RESOLVED_PER_WAVE)

  function handleResize(): void {
    scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)

    if (resizeSaveTimer) clearTimeout(resizeSaveTimer)
    resizeSaveTimer = setTimeout(() => {
      if (!settingsReady) return
      void currentWindowSize().then((size) => {
        if (size) void saveSettings({ windowSize: size })
      })
    }, 500)
  }

  function addEffect(effect: Omit<Effect, 'id'>, ttl = 650): void {
    const id = ++effectId
    effects = [...effects, { ...effect, id }]
    const timer = setTimeout(() => {
      effects = effects.filter((item) => item.id !== id)
      effectTimers.delete(timer)
    }, ttl)
    effectTimers.add(timer)
  }

  function clearEffects(): void {
    for (const timer of effectTimers) clearTimeout(timer)
    effectTimers.clear()
    effects = []
  }

  function shootAt(x: number, y: number, variant: number): void {
    const deltaX = x - ARROW_ORIGIN.x
    const deltaY = y - ARROW_ORIGIN.y
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
    const distance = Math.hypot(deltaX, deltaY)

    addEffect({ kind: 'shot', angle, distance }, 280)
    addEffect({ kind: 'feathers', x, y, variant }, 700)

    archerShooting = true
    if (archerTimer) clearTimeout(archerTimer)
    archerTimer = setTimeout(() => {
      archerShooting = false
    }, 250)
  }

  function showToast(message: string): void {
    toast = message
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast = null
    }, 2800)
  }

  function handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'hit': {
        const y = BIRD_LANES[event.bird.lane].top
        shootAt(event.bird.x * STAGE_WIDTH, y, event.bird.variant)
        addEffect(
          { kind: 'pop', x: event.bird.x * STAGE_WIDTH, y: y - 56, text: `+${event.points}` },
          850,
        )
        audio.play('bow')
        window.setTimeout(() => audio.play('hit'), 80)
        break
      }
      case 'escape': {
        audio.play('heart')
        hurt = true
        if (hurtTimer) clearTimeout(hurtTimer)
        hurtTimer = setTimeout(() => {
          hurt = false
        }, 450)
        break
      }
      case 'wrong': {
        audio.play('wrong')
        bufferShake = true
        if (shakeTimer) clearTimeout(shakeTimer)
        shakeTimer = setTimeout(() => {
          bufferShake = false
        }, 240)
        break
      }
      case 'wave': {
        noticeId += 1
        waveNotice = {
          id: noticeId,
          wave: event.wave,
          perfect: event.perfect,
          bonus: event.bonus,
        }
        if (noticeTimer) clearTimeout(noticeTimer)
        noticeTimer = setTimeout(() => {
          waveNotice = null
        }, 2100)
        audio.play('wave')
        break
      }
      case 'gameover': {
        const record = event.score > settings.bestScore
        if (record) {
          settings = { ...settings, bestScore: event.score }
          void saveSettings({ bestScore: event.score })
        }
        result = {
          score: event.score,
          best: Math.max(event.score, settings.bestScore),
          record,
        }
        screen = 'gameover'
        waveNotice = null
        audio.play('gameover')
        if (record) {
          window.setTimeout(() => audio.play('record'), 650)
        }
        break
      }
      case 'spawn':
        break
    }
  }

  function applyEngineEvents(events: GameEvent[]): void {
    snapshot = engine.snapshot()
    for (const event of events) handleEvent(event)
  }

  function frame(time: number): void {
    frameRequest = requestAnimationFrame(frame)
    if (!lastFrame) {
      lastFrame = time
      return
    }

    const delta = Math.min(64, time - lastFrame)
    lastFrame = time

    if (screen !== 'game') return
    const status = snapshot.status
    if (status !== 'countdown' && status !== 'playing' && status !== 'dying') return

    applyEngineEvents(engine.update(delta))
  }

  function beginRun(): void {
    clearEffects()
    engine.restart()
    snapshot = engine.snapshot()
    result = null
    screen = 'game'
    waveNotice = null
    lastFrame = 0
  }

  async function startGame(): Promise<void> {
    await audio.unlock()
    audio.play('click')
    beginRun()
  }

  function restartGame(): void {
    audio.play('click')
    beginRun()
  }

  function togglePause(): void {
    if (screen !== 'game') return
    const status = snapshot.status
    if (status !== 'countdown' && status !== 'playing' && status !== 'paused') return
    engine.togglePause()
    snapshot = engine.snapshot()
    audio.play('click')
  }

  function goToMenu(): void {
    if (screen === 'game' && snapshot.score > settings.bestScore) {
      settings = { ...settings, bestScore: snapshot.score }
      void saveSettings({ bestScore: snapshot.score })
    }
    audio.play('click')
    clearEffects()
    engine.restart()
    snapshot = engine.snapshot()
    result = null
    waveNotice = null
    screen = 'menu'
  }

  async function toggleSound(): Promise<void> {
    const next = !settings.soundOn
    if (next) {
      await audio.unlock()
    } else {
      audio.play('click')
    }
    audio.setSound(next)
    settings = { ...settings, soundOn: next }
    void saveSettings({ soundOn: next })
    if (next) audio.play('click')
  }

  async function toggleMusic(): Promise<void> {
    const next = !settings.musicOn
    if (next) await audio.unlock()
    audio.setMusic(next)
    settings = { ...settings, musicOn: next }
    void saveSettings({ musicOn: next })
    audio.play('click')
  }

  async function toggleAllSound(): Promise<void> {
    const next = !(settings.soundOn || settings.musicOn)
    if (next) await audio.unlock()
    audio.setSound(next)
    audio.setMusic(next)
    settings = { ...settings, soundOn: next, musicOn: next }
    void saveSettings({ soundOn: next, musicOn: next })
    if (next) audio.play('click')
    showToast(next ? 'Ovoz yoqildi' : 'Ovoz oʻchirildi')
  }

  function trapDialogFocus(node: HTMLElement) {
    const frame = requestAnimationFrame(() => node.focus({ preventScroll: true }))

    function handleKey(event: KeyboardEvent): void {
      if (event.key !== 'Tab') return
      const items = Array.from(node.querySelectorAll<HTMLElement>('button:not([disabled])'))
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        event.preventDefault()
        node.focus()
        return
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', handleKey)
    return {
      destroy() {
        cancelAnimationFrame(frame)
        node.removeEventListener('keydown', handleKey)
      },
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (event.key === 'F11') {
      event.preventDefault()
      void toggleFullscreenWindow()
      return
    }

    const target = event.target
    const onInteractive =
      target instanceof HTMLElement && target.closest('button, a, input, select, textarea') !== null

    if (event.key === 'Escape') {
      if (screen === 'game') {
        const status = snapshot.status
        if (status === 'countdown' || status === 'playing' || status === 'paused') {
          event.preventDefault()
          togglePause()
        }
      }
      return
    }

    const activePlay =
      screen === 'game' && (snapshot.status === 'countdown' || snapshot.status === 'playing')

    if (!activePlay && event.key.toLowerCase() === 'm') {
      event.preventDefault()
      void toggleAllSound()
      return
    }

    if (event.key === 'Enter') {
      if (onInteractive) return
      if (screen === 'menu') {
        event.preventDefault()
        void startGame()
        return
      }
      if (screen === 'gameover') {
        event.preventDefault()
        restartGame()
        return
      }
      if (screen === 'game' && snapshot.status === 'paused') {
        event.preventDefault()
        togglePause()
      }
      return
    }

    if (screen !== 'game' || snapshot.status !== 'playing') return

    if (/[а-яёўқғҳ]/i.test(event.key)) {
      showToast('Iltimos, lotin alifbosiga oʻtkazing')
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      engine.pressBackspace()
      snapshot = engine.snapshot()
      return
    }

    if (event.key.length !== 1) return

    applyEngineEvents(engine.typeKey(event.key))
  }

  onMount(() => {
    let disposed = false

    void (async () => {
      const loaded = await loadSettings()
      if (disposed) return
      settings = loaded
      settingsReady = true
      audio.setSound(loaded.soundOn)
      audio.setMusic(loaded.musicOn)
      await restoreWindowSize(loaded.windowSize)
    })()

    function handleVisibility(): void {
      if (document.hidden && screen === 'game') {
        const status = snapshot.status
        if (status === 'countdown' || status === 'playing') {
          engine.pause()
          snapshot = engine.snapshot()
        }
      }
    }

    function handleBlur(): void {
      if (screen === 'game') {
        const status = snapshot.status
        if (status === 'countdown' || status === 'playing') {
          engine.pause()
          snapshot = engine.snapshot()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    handleResize()
    frameRequest = requestAnimationFrame(frame)

    return () => {
      disposed = true
      cancelAnimationFrame(frameRequest)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      clearEffects()
      if (archerTimer) clearTimeout(archerTimer)
      if (shakeTimer) clearTimeout(shakeTimer)
      if (hurtTimer) clearTimeout(hurtTimer)
      if (toastTimer) clearTimeout(toastTimer)
      if (noticeTimer) clearTimeout(noticeTimer)
      if (resizeSaveTimer) clearTimeout(resizeSaveTimer)
      audio.dispose()
    }
  })
</script>

<svelte:window onkeydown={handleKeydown} onresize={handleResize} />

<main class="viewport">
  <div
    class="stage"
    class:hurt
    style:transform={`scale(${scale})`}
    style:width={`${STAGE_WIDTH}px`}
    style:height={`${STAGE_HEIGHT}px`}
  >
    <Backdrop />

    <div class="world" aria-hidden="true">
      {#each snapshot.birds as bird (bird.id)}
        <Bird {bird} />
      {/each}
      <Archer shooting={archerShooting} />

      <div class="effects">
        {#each effects as effect (effect.id)}
          {#if effect.kind === 'shot'}
            <div
              class="shot"
              style={`left:${ARROW_ORIGIN.x}px;top:${ARROW_ORIGIN.y}px;--angle:${effect.angle ?? 0}deg;--travel:${effect.distance ?? 0}px`}
            ></div>
          {:else if effect.kind === 'feathers'}
            <div class="feathers" style={`left:${effect.x ?? 0}px;top:${effect.y ?? 0}px`}>
              {#each FEATHERS as feather, index (feather.x)}
                <span
                  style={`--fx:${feather.x}px;--fy:${feather.y}px;--rot:${feather.rotation}deg;--color:${BIRD_PALETTES[(effect.variant ?? 0) % BIRD_PALETTES.length]?.[index % 2 === 0 ? 'body' : 'dark'] ?? '#ffd166'}`}
                ></span>
              {/each}
            </div>
          {:else}
            <div class="score-pop" style={`left:${effect.x ?? 0}px;top:${effect.y ?? 0}px`}>
              {effect.text}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    {#if screen !== 'menu'}
      <p class="sr-only" aria-live="polite" aria-atomic="true">
        {#if snapshot.birds.length > 0}
          Qushlar: {snapshot.birds.map((bird) => bird.word).join(', ')}
        {/if}
      </p>

      <header class="hud">
        <div class="hud-left">
          <div class="hearts-panel" aria-label={`${snapshot.hearts} ta yurak qoldi`}>
            {#each HEART_SLOTS as slot (slot)}
              <svg
                class="heart"
                class:lost={slot >= snapshot.hearts}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 20.5 C9.4 18.2 3.5 14.2 3.5 9.3 C3.5 6.4 5.7 4.5 8.3 4.5 C10.1 4.5 11.4 5.4 12 6.6 C12.6 5.4 13.9 4.5 15.7 4.5 C18.3 4.5 20.5 6.4 20.5 9.3 C20.5 14.2 14.6 18.2 12 20.5 Z"
                />
              </svg>
            {/each}
          </div>
          <div class="combo-badge" class:on={snapshot.multiplier >= 2}>
            <strong>×{snapshot.multiplier}</strong>
            <span>KOMBO</span>
          </div>
        </div>

        <div class="wave-panel">
          <span class="wave-label">TOʻLQIN</span>
          <strong class="wave-number">{snapshot.wave}</strong>
          <div class="wave-pips" aria-hidden="true">
            {#each PIP_SLOTS as pip (pip)}
              <span class="pip" class:on={pip < wavePips}></span>
            {/each}
          </div>
        </div>

        <div class="hud-right">
          <div class="score-card">
            <span>BALL</span>
            <strong>{snapshot.score}</strong>
          </div>
          <div class="score-card best">
            <span>REKORD</span>
            <strong>{displayBest}</strong>
          </div>
          <button
            type="button"
            class="icon-button"
            aria-label="Pauza"
            title="Pauza (Esc)"
            onclick={togglePause}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6.5" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
              <rect x="13.5" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {#if waveNotice && snapshot.status !== 'paused'}
        {#key waveNotice.id}
          <div class="wave-banner">
            <strong>{waveNotice.wave}-TOʻLQIN</strong>
            {#if waveNotice.perfect}
              <span class="perfect-badge">MUKAMMAL +{waveNotice.bonus}</span>
            {/if}
          </div>
        {/key}
      {/if}

      <div class="play-zone">
        {#if showHint}
          <div class="hint">Qush ustidagi soʻzni yozing</div>
        {/if}
        <div class="buffer-shell" class:shake={bufferShake}>
          <div class="buffer" aria-live="polite">
            {#if snapshot.buffer.length === 0}
              <span class="placeholder">Soʻzni yozing…</span>
            {:else}
              {#each [...snapshot.buffer] as char, index (index)}
                <span class="tile" class:caret={index === snapshot.buffer.length - 1}>
                  {char === "'" ? 'ʻ' : char}
                </span>
              {/each}
            {/if}
            <span class="caret-line"></span>
          </div>
        </div>
      </div>

      {#if snapshot.status === 'countdown'}
        <div class="countdown" aria-live="polite">
          <div class="countdown-inner">
            <span class="countdown-label">Tayyor boʻl!</span>
            {#key snapshot.countdown}
              <span class="countdown-number">{snapshot.countdown}</span>
            {/key}
          </div>
        </div>
      {/if}
    {/if}

    {#if toast}
      <div class="toast" role="status">{toast}</div>
    {/if}

    {#if screen === 'menu'}
      <div class="overlay menu-overlay">
        <section class="card menu-card" aria-labelledby="menu-title">
          <div class="logo" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="56" fill="#fff8e8" stroke="#18344c" stroke-width="4" />
              <path d="M35 66 C18 58 12 74 32 82 C22 88 27 98 48 92 Z" fill="#2563c9" />
              <ellipse cx="66" cy="66" rx="30" ry="22" fill="#4f9cf9" />
              <ellipse cx="64" cy="73" rx="19" ry="11" fill="#e8f4ff" opacity="0.85" />
              <path d="M55 58 C44 38 70 33 79 52 C88 66 69 78 57 67 Z" fill="#2563c9" />
              <circle cx="88" cy="51" r="16" fill="#4f9cf9" />
              <circle cx="93" cy="48" r="4.6" fill="#ffffff" />
              <circle cx="94.5" cy="48" r="2.3" fill="#1b2c3b" />
              <path d="M103 53 L117 58 L103 63 Z" fill="#f8a838" />
            </svg>
          </div>

          <p class="eyebrow">Yozish oʻyini</p>
          <h1 id="menu-title">Qushot</h1>
          <p class="tagline">Qushlardagi soʻzlarni yoz — oʻqni ot!</p>

          <button type="button" class="primary start-button" onclick={startGame}>
            Boshlash
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="menu-meta">
            <div class="best-chip">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3.5l2.5 5.2 5.7.8-4.1 4-1 5.7-5.1-2.7-5.1 2.7-1-5.7-4.1-4 5.7-.8Z"
                  fill="#ffd166"
                  stroke="#b77f1f"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
              </svg>
              <span>REKORD</span>
              <strong>{settings.bestScore}</strong>
            </div>

            <div class="toggles">
              <button
                type="button"
                class="toggle-pill"
                class:off={!settings.soundOn}
                aria-pressed={settings.soundOn}
                onclick={toggleSound}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                  {#if settings.soundOn}
                    <path
                      d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                    />
                  {:else}
                    <path
                      d="M17 9l5 6M22 9l-5 6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                    />
                  {/if}
                </svg>
                Ovoz
              </button>
              <button
                type="button"
                class="toggle-pill"
                class:off={!settings.musicOn}
                aria-pressed={settings.musicOn}
                onclick={toggleMusic}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 17V6l10-2v11"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="6.5" cy="18" r="2.8" fill="currentColor" />
                  <circle cx="16.5" cy="16" r="2.8" fill="currentColor" />
                  {#if !settings.musicOn}
                    <path
                      d="M4 4l16 16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                    />
                  {/if}
                </svg>
                Musiqa
              </button>
            </div>
          </div>

          <div class="steps">
            <div class="step"><span>1</span>Qushdagi soʻzni koʻr</div>
            <div class="step"><span>2</span>Klaviaturada yoz</div>
            <div class="step"><span>3</span>Oʻqni uchir</div>
          </div>

          <p class="menu-rules">3 ta yurak · cheksiz toʻlqinlar</p>
        </section>
      </div>
    {/if}

    {#if screen === 'game' && snapshot.status === 'paused'}
      <div class="overlay pause-overlay">
        <div
          class="card pause-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          tabindex="-1"
          use:trapDialogFocus
        >
          <div class="pause-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="6" y="4.5" width="4.4" height="15" rx="1.6" fill="currentColor" />
              <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.6" fill="currentColor" />
            </svg>
          </div>
          <p class="eyebrow">Tanaffus</p>
          <h2 id="pause-title">Pauza</h2>
          <p class="pause-text">Nafas oling — qushlar kutib turadi.</p>

          <div class="actions">
            <button type="button" class="primary" onclick={togglePause}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5l11 7-11 7Z" fill="currentColor" />
              </svg>
              Davom etish
            </button>
            <button type="button" class="secondary" onclick={restartGame}>Qaytadan boshlash</button>
            <button type="button" class="ghost" onclick={goToMenu}>Menyuga qaytish</button>
          </div>

          <div class="pause-footer">
            <button
              type="button"
              class="toggle-pill"
              class:off={!settings.soundOn}
              aria-pressed={settings.soundOn}
              onclick={toggleSound}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                {#if settings.soundOn}
                  <path
                    d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                  />
                {:else}
                  <path
                    d="M17 9l5 6M22 9l-5 6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                  />
                {/if}
              </svg>
              Ovoz
            </button>
            <button
              type="button"
              class="toggle-pill"
              class:off={!settings.musicOn}
              aria-pressed={settings.musicOn}
              onclick={toggleMusic}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9 17V6l10-2v11"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="6.5" cy="18" r="2.8" fill="currentColor" />
                <circle cx="16.5" cy="16" r="2.8" fill="currentColor" />
                {#if !settings.musicOn}
                  <path
                    d="M4 4l16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                  />
                {/if}
              </svg>
              Musiqa
            </button>
            <span class="esc-note">Esc — davom etish</span>
          </div>
        </div>
      </div>
    {/if}

    {#if screen === 'gameover'}
      <div class="overlay gameover-overlay">
        <div
          class="card result-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-title"
          tabindex="-1"
          use:trapDialogFocus
        >
          {#if result?.record}
            <div class="record-badge">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3.5l2.5 5.2 5.7.8-4.1 4-1 5.7-5.1-2.7-5.1 2.7-1-5.7-4.1-4 5.7-.8Z"
                  fill="#ffd166"
                  stroke="#b77f1f"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
              </svg>
              Yangi rekord!
            </div>
          {/if}
          <p class="eyebrow">Oʻyin tugadi</p>
          <h2 id="result-title">Yaxshi urinish!</h2>

          <div class="final-score">
            <span>BALL</span>
            <strong>{result?.score ?? snapshot.score}</strong>
          </div>

          <div class="result-meta">
            <span>Eng yaxshi: <strong>{result?.best ?? settings.bestScore}</strong></span>
            <span>{snapshot.hits} ta qush · {snapshot.wave}-toʻlqin</span>
          </div>

          <div class="actions result-actions">
            <button type="button" class="primary" onclick={restartGame}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Yana oʻynash
            </button>
            <button type="button" class="ghost" onclick={goToMenu}>Menyu</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .viewport {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #173f5f 0%, #0c2438 70%), #0c2438;
  }

  .stage {
    position: relative;
    flex: none;
    overflow: hidden;
    transform-origin: center center;
    background: #6ec8f2;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.4);
    user-select: none;
    -webkit-user-select: none;
    will-change: transform;
  }

  .stage::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 45;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(circle at 50% 45%, transparent 48%, rgba(239, 91, 91, 0.5) 100%);
    transition: opacity 0.18s ease;
  }

  .stage.hurt::after {
    opacity: 1;
    animation: hurt-pulse 0.42s ease-out;
  }

  .world,
  .effects {
    position: absolute;
    inset: 0;
  }

  .effects {
    z-index: 22;
    pointer-events: none;
  }

  .hud {
    position: absolute;
    inset: 20px 24px auto;
    z-index: 30;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    pointer-events: none;
  }

  .hud-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 9px;
  }

  .hearts-panel {
    display: flex;
    gap: 5px;
    padding: 8px 13px 9px;
    border: 2.5px solid var(--ink);
    border-radius: 17px;
    background: rgba(255, 253, 246, 0.94);
    box-shadow: 0 5px 0 rgba(24, 52, 76, 0.22);
  }

  .heart {
    width: 29px;
    height: 29px;
    fill: #ef5b5b;
    filter: drop-shadow(0 2px 0 rgba(145, 31, 31, 0.22));
    transition:
      fill 0.2s ease,
      opacity 0.2s ease,
      transform 0.2s ease;
  }

  .heart.lost {
    fill: #c9d6d5;
    filter: none;
    opacity: 0.7;
    transform: scale(0.88);
  }

  .combo-badge {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 5px 13px 6px;
    border: 2.5px solid #b95411;
    border-radius: 13px;
    background: linear-gradient(180deg, #ffb54f, #ff922b);
    box-shadow: 0 4px 0 rgba(146, 64, 9, 0.3);
    color: #532607;
    opacity: 0;
    transform: translateY(-6px) scale(0.9);
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }

  .combo-badge.on {
    opacity: 1;
    transform: none;
  }

  .combo-badge strong {
    font-size: 21px;
    line-height: 1;
  }

  .combo-badge span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.4px;
  }

  .wave-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 124px;
    padding: 7px 16px 9px;
    border: 2.5px solid var(--ink);
    border-radius: 18px;
    background: rgba(255, 253, 246, 0.94);
    box-shadow: 0 5px 0 rgba(24, 52, 76, 0.22);
  }

  .wave-label {
    color: var(--ink-soft);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
  }

  .wave-number {
    font-size: 30px;
    line-height: 1;
    letter-spacing: -0.5px;
  }

  .wave-pips {
    display: flex;
    gap: 3.5px;
    margin-top: 6px;
  }

  .pip {
    width: 8px;
    height: 8px;
    border: 1px solid rgba(24, 52, 76, 0.25);
    border-radius: 50%;
    background: rgba(24, 52, 76, 0.1);
    transition: background 0.2s ease;
  }

  .pip.on {
    border-color: #c9901e;
    background: var(--gold);
  }

  .hud-right {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .score-card {
    display: flex;
    flex-direction: column;
    min-width: 104px;
    padding: 6px 14px 7px;
    border: 2.5px solid var(--ink);
    border-radius: 16px;
    background: rgba(255, 253, 246, 0.94);
    box-shadow: 0 5px 0 rgba(24, 52, 76, 0.22);
  }

  .score-card span {
    color: var(--ink-soft);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.6px;
  }

  .score-card strong {
    font-size: 27px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    line-height: 1.05;
  }

  .score-card.best strong {
    color: #c17e13;
  }

  .icon-button {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    padding: 0;
    border: 2.5px solid var(--ink);
    border-radius: 15px;
    background: var(--paper);
    box-shadow: 0 5px 0 rgba(24, 52, 76, 0.22);
    color: var(--ink);
    pointer-events: auto;
    transition:
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }

  .icon-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 0 rgba(24, 52, 76, 0.22);
  }

  .icon-button:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 rgba(24, 52, 76, 0.22);
  }

  .icon-button svg {
    width: 24px;
    height: 24px;
  }

  .play-zone {
    position: absolute;
    bottom: 20px;
    left: 50%;
    z-index: 27;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .hint {
    padding: 6px 16px;
    border: 2px solid rgba(24, 52, 76, 0.18);
    border-radius: 999px;
    background: rgba(255, 253, 246, 0.86);
    color: var(--ink-soft);
    font-size: 17px;
    font-weight: 500;
    animation: hint-in 0.4s ease-out;
  }

  .buffer-shell {
    min-width: 300px;
    max-width: 680px;
    padding: 9px 18px 10px;
    border: 3px solid var(--ink);
    border-radius: 22px;
    background: rgba(255, 253, 246, 0.96);
    box-shadow:
      0 8px 0 rgba(24, 52, 76, 0.3),
      inset 0 2px 0 #ffffff;
  }

  .buffer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 48px;
    padding: 0 4px;
  }

  .placeholder {
    padding: 3px 8px;
    color: #7d8b93;
    font-size: 20px;
    font-weight: 500;
  }

  .tile {
    display: grid;
    min-width: 37px;
    height: 46px;
    place-items: center;
    padding: 0 9px;
    border: 2.5px solid #b98c36;
    border-bottom-width: 5px;
    border-radius: 10px;
    background: #fff1c4;
    color: var(--ink);
    font-size: 29px;
    font-weight: 600;
    line-height: 1;
    animation: tile-in 0.1s ease-out;
  }

  .tile.caret {
    border-color: var(--orange);
    background: #fff8de;
  }

  .caret-line {
    width: 3px;
    height: 29px;
    border-radius: 2px;
    background: var(--orange);
    animation: blink 1.05s steps(1) infinite;
  }

  .buffer-shell.shake {
    border-color: #cf3f3f;
    background: #fff0ee;
    animation: buffer-shake 0.22s ease-in-out;
  }

  .buffer-shell.shake .tile {
    border-color: #cf3f3f;
    background: #ffe3dd;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    clip-path: inset(50%);
  }

  .countdown {
    position: absolute;
    inset: 0;
    z-index: 28;
    display: grid;
    place-items: center;
    background: radial-gradient(circle, rgba(12, 36, 58, 0.14) 0%, transparent 52%);
    pointer-events: none;
  }

  .countdown-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .countdown-label {
    padding: 6px 18px;
    border: 2.5px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    box-shadow: 0 4px 0 rgba(24, 52, 76, 0.2);
    color: var(--ink);
    font-size: 19px;
    font-weight: 600;
  }

  .countdown-number {
    color: #ffffff;
    font-size: 150px;
    font-weight: 700;
    line-height: 1;
    text-shadow:
      0 8px 0 rgba(24, 52, 76, 0.3),
      0 0 46px rgba(255, 225, 122, 0.75);
    animation: count-pop 0.9s ease-out;
  }

  .wave-banner {
    position: absolute;
    top: 104px;
    left: 50%;
    z-index: 29;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 8px 20px 9px;
    border: 2.5px solid #0d2639;
    border-radius: 999px;
    background: var(--ink);
    box-shadow: 0 5px 0 rgba(8, 26, 41, 0.25);
    color: #fff8e8;
    transform: translateX(-50%);
    animation: banner-in 0.38s cubic-bezier(0.2, 1.3, 0.5, 1);
    pointer-events: none;
  }

  .wave-banner strong {
    font-size: 18px;
    letter-spacing: 1.6px;
  }

  .perfect-badge {
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--gold);
    color: #6b4707;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
  }

  .shot {
    position: absolute;
    width: 58px;
    height: 5px;
    border-radius: 3px;
    background: linear-gradient(90deg, #f5e6c8, #ffffff 70%);
    box-shadow: 0 2px 4px rgba(24, 52, 76, 0.25);
    transform-origin: 0 50%;
    transform: rotate(var(--angle));
    animation: shoot 0.28s ease-in forwards;
  }

  .shot::after {
    content: '';
    position: absolute;
    top: -4px;
    right: -2px;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-left: 12px solid #43507a;
  }

  .feathers {
    position: absolute;
  }

  .feathers span {
    position: absolute;
    width: 9px;
    height: 16px;
    border-radius: 70% 20% 70% 30%;
    background: var(--color);
    opacity: 0;
    animation: feather-burst 0.68s ease-out forwards;
  }

  .feathers span:nth-child(even) {
    width: 7px;
    height: 13px;
  }

  .score-pop {
    position: absolute;
    z-index: 2;
    padding: 2px 10px 3px;
    border: 2px solid #b95411;
    border-radius: 999px;
    background: #fff4c9;
    box-shadow: 0 3px 0 rgba(24, 52, 76, 0.18);
    color: #b95411;
    font-size: 24px;
    font-weight: 700;
    transform: translate(-50%, -50%);
    animation: score-rise 0.85s ease-out forwards;
    white-space: nowrap;
  }

  .overlay {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 26px;
    animation: overlay-in 0.22s ease-out;
  }

  .menu-overlay {
    background:
      radial-gradient(circle at 50% 38%, rgba(255, 248, 226, 0.15), transparent 48%),
      linear-gradient(180deg, rgba(12, 36, 58, 0.1), rgba(12, 36, 58, 0.42));
  }

  .pause-overlay,
  .gameover-overlay {
    background: rgba(12, 36, 58, 0.56);
  }

  .card {
    position: relative;
    border: 3px solid var(--ink);
    border-radius: 30px;
    background: var(--paper);
    box-shadow:
      0 12px 0 rgba(24, 52, 76, 0.18),
      0 26px 60px rgba(8, 28, 44, 0.32);
  }

  .menu-card {
    width: 660px;
    padding: 26px 44px 22px;
    text-align: center;
    animation: card-in 0.44s cubic-bezier(0.2, 1.2, 0.5, 1);
  }

  .menu-card::before,
  .menu-card::after {
    content: '';
    position: absolute;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: rgba(255, 209, 102, 0.44);
    z-index: -1;
  }

  .menu-card::before {
    top: -21px;
    left: 40px;
  }

  .menu-card::after {
    right: 48px;
    bottom: -18px;
    width: 36px;
    height: 36px;
    background: rgba(84, 196, 122, 0.35);
  }

  .logo {
    width: 96px;
    height: 96px;
    margin: -3px auto 4px;
    filter: drop-shadow(0 5px 0 rgba(24, 52, 76, 0.15));
  }

  .logo svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .eyebrow {
    margin: 0;
    color: #b95411;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2.4px;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: var(--ink);
    font-size: 88px;
    font-weight: 700;
    letter-spacing: -3.5px;
    line-height: 0.98;
  }

  .tagline {
    margin: 7px 0 18px;
    color: var(--ink-soft);
    font-size: 20px;
    font-weight: 500;
  }

  .primary,
  .secondary,
  .ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 50px;
    padding: 10px 23px 12px;
    border-radius: 15px;
    font-family: var(--font-round);
    font-size: 19px;
    font-weight: 600;
    line-height: 1;
    transition:
      transform 0.12s ease,
      box-shadow 0.12s ease,
      background 0.15s ease;
  }

  .primary {
    border: 2.5px solid #a94a0c;
    background: linear-gradient(180deg, #ffb54f, #ff922b);
    box-shadow: 0 6px 0 #b95411;
    color: #4f2708;
  }

  .primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 0 #b95411;
  }

  .primary:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 #b95411;
  }

  .primary svg {
    width: 23px;
    height: 23px;
  }

  .secondary {
    border: 2.5px solid var(--green-dark);
    background: #e7f8ea;
    box-shadow: 0 5px 0 rgba(46, 125, 79, 0.28);
    color: var(--green-dark);
  }

  .secondary:hover {
    transform: translateY(-2px);
    background: #d9f4df;
    box-shadow: 0 7px 0 rgba(46, 125, 79, 0.28);
  }

  .secondary:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 rgba(46, 125, 79, 0.28);
  }

  .ghost {
    border: 2.5px solid transparent;
    background: transparent;
    color: var(--ink-soft);
  }

  .ghost:hover {
    background: rgba(24, 52, 76, 0.07);
  }

  .start-button {
    width: 330px;
    min-height: 64px;
    margin: 0 auto;
    border-radius: 18px;
    font-size: 25px;
    letter-spacing: 0.4px;
  }

  .start-button svg {
    width: 27px;
    height: 27px;
  }

  .menu-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 22px 0 16px;
    padding-top: 16px;
    border-top: 2px dashed rgba(24, 52, 76, 0.16);
  }

  .best-chip {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--ink-soft);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.4px;
  }

  .best-chip svg {
    width: 23px;
    height: 23px;
  }

  .best-chip strong {
    color: var(--ink);
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.3px;
  }

  .toggles {
    display: flex;
    gap: 8px;
  }

  .toggle-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 6px 12px 7px;
    border: 2px solid rgba(24, 52, 76, 0.28);
    border-radius: 999px;
    background: #f2f7ef;
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
    transition:
      opacity 0.15s ease,
      background 0.15s ease;
  }

  .toggle-pill svg {
    width: 19px;
    height: 19px;
  }

  .toggle-pill:hover {
    background: #e7f1e4;
  }

  .toggle-pill.off {
    opacity: 0.55;
    background: #eef0ef;
    color: var(--ink-soft);
  }

  .steps {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .step {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 7px;
    padding: 8px 9px;
    border-radius: 12px;
    background: #f4f0df;
    color: var(--ink-soft);
    font-size: 13px;
    font-weight: 500;
    text-align: left;
  }

  .step span {
    display: grid;
    flex: none;
    width: 23px;
    height: 23px;
    place-items: center;
    border-radius: 50%;
    background: var(--ink);
    color: #fff8e8;
    font-size: 12px;
    font-weight: 700;
  }

  .menu-rules {
    margin: 13px 0 0;
    color: #84929a;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .pause-card,
  .result-card {
    width: 460px;
    padding: 28px 34px 24px;
    text-align: center;
    animation: card-in 0.34s cubic-bezier(0.2, 1.2, 0.5, 1);
  }

  .pause-mark {
    display: grid;
    width: 58px;
    height: 58px;
    margin: 0 auto 8px;
    place-items: center;
    border: 2.5px solid var(--ink);
    border-radius: 17px;
    background: #fff1c4;
    color: var(--ink);
    transform: rotate(-4deg);
  }

  .pause-mark svg {
    width: 27px;
    height: 27px;
  }

  .pause-card h2,
  .result-card h2 {
    margin: 2px 0 4px;
    color: var(--ink);
    font-size: 44px;
    font-weight: 700;
    letter-spacing: -1.4px;
    line-height: 1.05;
  }

  .pause-text {
    margin: 0 0 20px;
    color: var(--ink-soft);
    font-size: 16px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .actions .primary,
  .actions .secondary,
  .actions .ghost {
    width: 100%;
  }

  .pause-footer {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 18px;
    padding-top: 15px;
    border-top: 2px dashed rgba(24, 52, 76, 0.16);
  }

  .esc-note {
    margin-left: auto;
    color: #84929a;
    font-size: 11px;
    font-weight: 500;
  }

  .result-card {
    width: 500px;
  }

  .record-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 9px;
    padding: 5px 13px 6px;
    border: 2px solid #c9901e;
    border-radius: 999px;
    background: #fff3c9;
    color: #8a5b06;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.6px;
    animation: badge-pop 0.5s cubic-bezier(0.2, 1.4, 0.5, 1);
  }

  .record-badge svg {
    width: 20px;
    height: 20px;
  }

  .final-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 12px 0 7px;
  }

  .final-score span {
    color: var(--ink-soft);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
  }

  .final-score strong {
    color: var(--ink);
    font-size: 76px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    letter-spacing: -2px;
    line-height: 1;
  }

  .result-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 20px;
    color: var(--ink-soft);
    font-size: 14px;
  }

  .result-meta strong {
    color: #b95411;
  }

  .result-actions {
    flex-direction: row;
    justify-content: center;
  }

  .result-actions .primary {
    flex: 1;
  }

  .result-actions .ghost {
    width: auto;
    min-width: 105px;
  }

  .toast {
    position: absolute;
    bottom: 124px;
    left: 50%;
    z-index: 60;
    padding: 9px 18px 10px;
    border: 2.5px solid var(--ink);
    border-radius: 999px;
    background: rgba(255, 253, 246, 0.97);
    box-shadow: 0 5px 0 rgba(24, 52, 76, 0.2);
    color: var(--ink);
    font-size: 16px;
    font-weight: 600;
    transform: translateX(-50%);
    animation: toast-in 0.24s ease-out;
    pointer-events: none;
    white-space: nowrap;
  }

  @keyframes flap {
    from {
      transform: rotate(-16deg);
    }
    to {
      transform: rotate(22deg);
    }
  }

  @keyframes hurt-pulse {
    0% {
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes hint-in {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes tile-in {
    from {
      opacity: 0.5;
      transform: translateY(-4px) scale(0.92);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes blink {
    0%,
    55% {
      opacity: 1;
    }
    56%,
    100% {
      opacity: 0;
    }
  }

  @keyframes buffer-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-7px);
    }
    40% {
      transform: translateX(6px);
    }
    60% {
      transform: translateX(-4px);
    }
    80% {
      transform: translateX(3px);
    }
  }

  @keyframes count-pop {
    0% {
      opacity: 0;
      transform: scale(1.7);
    }
    35% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0.92;
      transform: scale(0.94);
    }
  }

  @keyframes banner-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px) scale(0.92);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  @keyframes shoot {
    from {
      opacity: 1;
      transform: rotate(var(--angle)) translateX(0);
    }
    to {
      opacity: 0.2;
      transform: rotate(var(--angle)) translateX(calc(var(--travel) - 58px));
    }
  }

  @keyframes feather-burst {
    0% {
      opacity: 1;
      transform: translate(0, 0) rotate(0deg) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(var(--fx), var(--fy)) rotate(var(--rot)) scale(0.6);
    }
  }

  @keyframes score-rise {
    0% {
      opacity: 0;
      transform: translate(-50%, -20%) scale(0.8);
    }
    20% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.05);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -135%) scale(1);
    }
  }

  @keyframes overlay-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes badge-pop {
    from {
      opacity: 0;
      transform: scale(0.75) rotate(-4deg);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
