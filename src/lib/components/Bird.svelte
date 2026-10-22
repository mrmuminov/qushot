<script lang="ts">
  import type { BirdView } from '../game/engine'
  import { BIRD_LANES, BIRD_PALETTES, STAGE_WIDTH } from '../game/layout'

  interface Props {
    bird: BirdView
  }

  let { bird }: Props = $props()

  const palette = $derived(BIRD_PALETTES[bird.variant % BIRD_PALETTES.length] ?? BIRD_PALETTES[0])
  const lane = $derived(BIRD_LANES[bird.lane] ?? BIRD_LANES[1])
</script>

<div
  class="bird"
  style:left={`${bird.x * STAGE_WIDTH}px`}
  style:top={`${lane.top}px`}
  style:transform={`translate(-50%, -50%) scale(${lane.scale})`}
  style:z-index={lane.depth}
  style:opacity={lane.opacity}
>
  <div class="sprite">
    <svg viewBox="0 0 160 120" role="presentation" aria-hidden="true">
      <path class="tail" d="M42 64 C18 54 8 72 30 82 C18 88 22 100 46 92 Z" fill={palette.dark} />
      <ellipse cx="82" cy="64" rx="44" ry="31" fill={palette.body} />
      <ellipse cx="78" cy="74" rx="29" ry="16" fill={palette.belly} opacity="0.85" />
      <path class="wing" d="M66 54 C48 24 82 18 98 45 C110 64 86 84 69 68 Z" fill={palette.dark} />
      <path
        d="M72 58 C61 38 83 34 91 50"
        fill="none"
        stroke={palette.light}
        stroke-width="5"
        stroke-linecap="round"
        opacity="0.7"
      />
      <circle cx="116" cy="46" r="23" fill={palette.body} />
      <circle cx="116" cy="46" r="16" fill={palette.light} opacity="0.35" />
      <circle cx="123" cy="42" r="6.5" fill="#ffffff" />
      <circle cx="125" cy="42" r="3.2" fill="#1b2c3b" />
      <circle cx="126.5" cy="40.5" r="1.1" fill="#ffffff" />
      <path d="M137 48 L158 55 L137 62 Z" fill="#f8a838" />
      <path d="M137 55 L155 55" stroke="#d97b1f" stroke-width="2" stroke-linecap="round" />
      <path
        d="M100 73 Q108 79 118 75"
        fill="none"
        stroke="#db6f2f"
        stroke-width="2.5"
        stroke-linecap="round"
        opacity="0.5"
      />
    </svg>
  </div>
  <div class="word">{bird.word}</div>
</div>

<style>
  .bird {
    position: absolute;
    width: 150px;
    height: 120px;
    will-change: left, transform;
  }

  .sprite {
    width: 150px;
    height: 120px;
    animation: bob 2.4s ease-in-out infinite;
    filter: drop-shadow(0 10px 10px rgba(24, 52, 76, 0.15));
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .wing {
    transform-origin: 74px 54px;
    animation: flap 0.44s ease-in-out infinite alternate;
  }

  .tail {
    transform-origin: 40px 70px;
    animation: tail 0.7s ease-in-out infinite alternate;
  }

  .word {
    position: absolute;
    top: 88px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 17px 5px;
    border: 2.5px solid var(--ink);
    border-radius: 14px;
    background: var(--paper);
    box-shadow: 0 4px 0 rgba(24, 52, 76, 0.18);
    color: var(--ink);
    font-family: var(--font-round);
    font-size: 31px;
    font-weight: 600;
    letter-spacing: 0.4px;
    line-height: 1.05;
    white-space: nowrap;
  }

  .word::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    width: 12px;
    height: 12px;
    transform: translateX(-50%) rotate(45deg);
    border-left: 2.5px solid var(--ink);
    border-top: 2.5px solid var(--ink);
    background: var(--paper);
    border-radius: 2px 0 0;
  }

  @keyframes flap {
    from {
      transform: rotate(-16deg) scaleY(0.92);
    }
    to {
      transform: rotate(22deg) scaleY(1.04);
    }
  }

  @keyframes tail {
    from {
      transform: rotate(-4deg);
    }
    to {
      transform: rotate(5deg);
    }
  }

  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }
</style>
