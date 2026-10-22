<div class="backdrop">
  <div class="sun"></div>

  <svg class="cloud cloud-a" viewBox="0 0 180 70" aria-hidden="true">
    <path
      d="M24 58 Q4 58 4 42 Q4 26 22 25 Q27 8 47 10 Q62 0 79 13 Q97 7 106 22 Q125 17 133 33 Q154 33 156 48 Q158 61 138 61 Z"
      fill="#ffffff"
    />
  </svg>
  <svg class="cloud cloud-b" viewBox="0 0 180 70" aria-hidden="true">
    <path
      d="M24 58 Q4 58 4 42 Q4 26 22 25 Q27 8 47 10 Q62 0 79 13 Q97 7 106 22 Q125 17 133 33 Q154 33 156 48 Q158 61 138 61 Z"
      fill="#ffffff"
    />
  </svg>
  <svg class="cloud cloud-c" viewBox="0 0 180 70" aria-hidden="true">
    <path
      d="M24 58 Q4 58 4 42 Q4 26 22 25 Q27 8 47 10 Q62 0 79 13 Q97 7 106 22 Q125 17 133 33 Q154 33 156 48 Q158 61 138 61 Z"
      fill="#ffffff"
    />
  </svg>

  <svg class="flock" viewBox="0 0 90 34" aria-hidden="true">
    <path
      d="M4 16 Q10 10 16 16 M18 10 Q24 4 30 10 M34 20 Q40 14 46 20"
      fill="none"
      stroke="#4a7b9d"
      stroke-width="2.2"
      stroke-linecap="round"
      opacity="0.55"
    />
  </svg>

  <div class="pollen" aria-hidden="true">
    <span style:left="14%" style:top="58%" style:animation-delay="-2s"></span>
    <span style:left="28%" style:top="44%" style:animation-delay="-5s"></span>
    <span style:left="46%" style:top="62%" style:animation-delay="-1s"></span>
    <span style:left="61%" style:top="37%" style:animation-delay="-7s"></span>
    <span style:left="76%" style:top="52%" style:animation-delay="-3s"></span>
    <span style:left="88%" style:top="31%" style:animation-delay="-6s"></span>
  </div>

  <svg class="scenery" viewBox="0 0 1280 430" preserveAspectRatio="none" aria-hidden="true">
    <path
      d="M0 238 Q120 170 250 211 Q366 250 481 202 Q611 148 731 197 Q861 250 981 201 Q1109 151 1280 209 L1280 430 L0 430 Z"
      fill="#b8e6ad"
    />
    <path
      d="M0 300 Q142 241 282 280 Q413 317 544 273 Q690 225 827 277 Q970 331 1103 279 Q1196 243 1280 268 L1280 430 L0 430 Z"
      fill="#7ccf83"
    />
    <path
      d="M0 348 Q168 305 342 337 Q516 369 673 338 Q849 302 1009 345 Q1149 382 1280 347 L1280 430 L0 430 Z"
      fill="#54b86f"
    />
    <path
      d="M0 389 Q180 363 369 383 Q561 403 742 382 Q936 360 1114 387 Q1202 401 1280 388 L1280 430 L0 430 Z"
      fill="#3b9d5c"
    />
  </svg>

  <svg class="tree tree-left" viewBox="0 0 160 210" aria-hidden="true">
    <path d="M76 208 L80 116" stroke="#8a5a38" stroke-width="15" stroke-linecap="round" />
    <path
      d="M79 145 L56 124 M80 158 L104 134"
      stroke="#8a5a38"
      stroke-width="9"
      stroke-linecap="round"
    />
    <circle cx="52" cy="93" r="38" fill="#4ba765" />
    <circle cx="99" cy="76" r="45" fill="#56b872" />
    <circle cx="78" cy="115" r="33" fill="#3f995b" />
    <circle cx="118" cy="112" r="27" fill="#4ba765" />
  </svg>

  <svg class="tree tree-right" viewBox="0 0 160 210" aria-hidden="true">
    <path d="M84 208 L80 124" stroke="#7d5134" stroke-width="14" stroke-linecap="round" />
    <path
      d="M81 153 L105 134 M80 167 L57 147"
      stroke="#7d5134"
      stroke-width="8"
      stroke-linecap="round"
    />
    <circle cx="55" cy="105" r="35" fill="#459c60" />
    <circle cx="100" cy="88" r="42" fill="#55b771" />
    <circle cx="82" cy="126" r="31" fill="#3b8f55" />
    <circle cx="123" cy="123" r="24" fill="#4ba765" />
  </svg>

  <svg class="flowers" viewBox="0 0 1280 80" preserveAspectRatio="none" aria-hidden="true">
    <g fill="#fff4d2">
      <circle cx="374" cy="64" r="4" />
      <circle cx="395" cy="72" r="3" />
      <circle cx="927" cy="67" r="4" />
      <circle cx="953" cy="73" r="3" />
    </g>
    <g fill="#ffd166">
      <circle cx="381" cy="66" r="2.4" />
      <circle cx="941" cy="69" r="2.4" />
    </g>
    <g stroke="#2f8c51" stroke-width="3" stroke-linecap="round">
      <path d="M374 69 L374 78" />
      <path d="M927 72 L927 80" />
    </g>
  </svg>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at 78% 8%, rgba(255, 246, 195, 0.8), transparent 24%),
      linear-gradient(180deg, #6ec8f2 0%, #a7e3fa 42%, #e6f7df 70%, #fdf3cf 100%);
  }

  .sun {
    position: absolute;
    top: 54px;
    right: 118px;
    width: 118px;
    height: 118px;
    border-radius: 50%;
    background: #ffe17a;
    box-shadow:
      0 0 0 18px rgba(255, 233, 143, 0.4),
      0 0 0 44px rgba(255, 240, 170, 0.22),
      0 0 70px 30px rgba(255, 238, 150, 0.5);
  }

  .cloud {
    position: absolute;
    filter: drop-shadow(0 8px 8px rgba(76, 147, 184, 0.12));
    opacity: 0.92;
  }

  .cloud-a {
    top: 92px;
    left: 120px;
    width: 178px;
    animation: drift-a 22s ease-in-out infinite alternate;
  }

  .cloud-b {
    top: 176px;
    left: 830px;
    width: 132px;
    opacity: 0.8;
    animation: drift-b 27s ease-in-out infinite alternate;
  }

  .cloud-c {
    top: 55px;
    left: 610px;
    width: 104px;
    opacity: 0.65;
    animation: drift-c 19s ease-in-out infinite alternate;
  }

  .flock {
    position: absolute;
    top: 148px;
    right: 300px;
    width: 92px;
    animation: drift-c 14s ease-in-out infinite alternate;
  }

  .pollen span {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff7cf;
    box-shadow: 0 0 8px 2px rgba(255, 248, 204, 0.5);
    animation: float 9s ease-in-out infinite alternate;
  }

  .scenery {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 430px;
  }

  .tree {
    position: absolute;
    bottom: 18px;
    opacity: 0.95;
  }

  .tree-left {
    left: 6px;
    width: 130px;
  }

  .tree-right {
    right: 10px;
    width: 112px;
  }

  .flowers {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 80px;
    opacity: 0.9;
  }

  @keyframes drift-a {
    from {
      transform: translateX(-18px);
    }
    to {
      transform: translateX(26px);
    }
  }

  @keyframes drift-b {
    from {
      transform: translateX(20px);
    }
    to {
      transform: translateX(-24px);
    }
  }

  @keyframes drift-c {
    from {
      transform: translateX(-10px) translateY(-3px);
    }
    to {
      transform: translateX(16px) translateY(4px);
    }
  }

  @keyframes float {
    from {
      transform: translateY(0) translateX(0);
      opacity: 0.35;
    }
    to {
      transform: translateY(-26px) translateX(10px);
      opacity: 0.85;
    }
  }
</style>
