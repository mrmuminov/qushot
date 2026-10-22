<script lang="ts">
  interface Props {
    shooting?: boolean
  }

  let { shooting = false }: Props = $props()
</script>

<div class="archer" class:shooting>
  <svg viewBox="0 0 240 260" role="presentation" aria-hidden="true">
    <ellipse cx="120" cy="246" rx="63" ry="11" fill="#1f5c3f" opacity="0.18" />

    <path d="M90 176 L86 218" stroke="#43507a" stroke-width="20" stroke-linecap="round" />
    <path d="M120 176 L128 218" stroke="#43507a" stroke-width="20" stroke-linecap="round" />
    <path d="M70 224 Q86 216 102 224 L100 234 Q84 240 68 234 Z" fill="#6b4a35" />
    <path d="M116 224 Q132 216 148 224 L146 234 Q130 240 114 234 Z" fill="#6b4a35" />

    <path
      d="M78 108 Q94 91 120 93 Q148 96 155 128 L150 181 Q121 192 89 181 L70 132 Z"
      fill="#ff9f43"
    />
    <path d="M88 94 Q111 104 134 92 L139 111 Q112 121 84 110 Z" fill="#ffd166" />
    <path d="M72 136 Q111 148 153 132 L151 151 Q112 165 71 152 Z" fill="#54b86f" />
    <path d="M79 160 Q115 170 149 160 L147 176 Q115 186 82 175 Z" fill="#b9713d" />
    <rect x="113" y="165" width="18" height="14" rx="4" fill="#ffd166" />

    <path d="M121 82 L119 98" stroke="#e8b183" stroke-width="18" stroke-linecap="round" />
    <circle cx="107" cy="63" r="31" fill="#f4c79f" />
    <circle cx="86" cy="69" r="7" fill="#f4c79f" />
    <path d="M76 60 Q77 29 108 27 Q138 27 140 58 Q126 48 112 49 Q94 50 76 60 Z" fill="#4f9cf9" />
    <path d="M76 59 Q87 53 100 55 L100 40 Q85 42 76 59 Z" fill="#2563c9" />
    <circle cx="133" cy="34" r="9" fill="#ffd166" />
    <path
      d="M121 61 Q124 57 128 61"
      fill="none"
      stroke="#4a3428"
      stroke-width="3"
      stroke-linecap="round"
    />
    <circle cx="125" cy="68" r="3.4" fill="#3b2a20" />
    <circle cx="126" cy="67" r="1.1" fill="#ffffff" />
    <path
      d="M117 78 Q123 83 129 77"
      fill="none"
      stroke="#b95c3d"
      stroke-width="3"
      stroke-linecap="round"
    />
    <circle cx="92" cy="76" r="7" fill="#f0a37d" opacity="0.55" />

    <path
      d="M145 118 Q163 115 169 100"
      fill="none"
      stroke="#e8b183"
      stroke-width="13"
      stroke-linecap="round"
    />
    <path
      d="M119 119 Q134 125 140 116"
      fill="none"
      stroke="#f4c79f"
      stroke-width="13"
      stroke-linecap="round"
    />
    <circle cx="141" cy="116" r="8" fill="#f4c79f" />

    <g class="bow">
      <path
        d="M169 47 Q203 96 169 145"
        fill="none"
        stroke="#9c5f35"
        stroke-width="8"
        stroke-linecap="round"
      />
      <path d="M169 48 L141 96 L169 144" fill="none" stroke="#fff3d1" stroke-width="2.5" />
    </g>

    <g class="arrow">
      <path d="M102 97 L190 97" stroke="#f5e6c8" stroke-width="4" stroke-linecap="round" />
      <path d="M190 97 L179 91 L179 103 Z" fill="#e9e2d2" />
      <path d="M190 97 L181 92 L181 102 Z" fill="#43507a" />
      <path
        d="M104 97 L94 90 M104 97 L94 104"
        stroke="#ef5b5b"
        stroke-width="4"
        stroke-linecap="round"
      />
    </g>

    <g class="quiver">
      <path d="M70 108 L59 158" stroke="#8c5a3b" stroke-width="15" stroke-linecap="round" />
      <path
        d="M60 113 L55 96 M67 110 L64 91 M74 108 L75 90"
        stroke="#ef5b5b"
        stroke-width="4"
        stroke-linecap="round"
      />
      <path d="M64 96 L51 90 L59 103 Z" fill="#f5e6c8" />
      <path d="M70 92 L61 84 L66 99 Z" fill="#f5e6c8" />
      <path d="M77 92 L73 80 L79 90 Z" fill="#f5e6c8" />
    </g>
  </svg>
</div>

<style>
  .archer {
    position: absolute;
    left: 44px;
    bottom: 4px;
    z-index: 3;
    width: 210px;
    height: 228px;
    filter: drop-shadow(0 12px 10px rgba(24, 52, 76, 0.18));
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .bow {
    transform-origin: 169px 96px;
  }

  .archer.shooting .bow {
    animation: release 0.24s ease-out;
  }

  .archer.shooting .arrow {
    animation: arrow-away 0.18s ease-in forwards;
  }

  .arrow {
    transform-origin: 140px 97px;
  }

  @keyframes release {
    0% {
      transform: rotate(0deg) scale(1);
    }
    40% {
      transform: rotate(-5deg) scale(1.05);
    }
    100% {
      transform: rotate(0deg) scale(1);
    }
  }

  @keyframes arrow-away {
    to {
      transform: translateX(26px);
      opacity: 0;
    }
  }
</style>
