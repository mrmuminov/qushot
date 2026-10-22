# Qushot

Qushot — bolalar uchun oflayn yozish oʻyini. Osmonda uchayotgan qushlardagi soʻzlarni klaviaturada yozing va kamondan oʻq uzing. Oʻyin Tauri 2, Svelte 5 va TypeScript asosida qurilgan.

## Oʻyin qoidalari

- Qush tagidagi soʻzni yozing. Harflar katta-kichikligi muhim emas; soʻz toʻliq yozilishi bilan oʻq avtomatik uchadi.
- Xato harf qizil silkinish beradi. Uni `Backspace` bilan oʻchirish mumkin.
- Har bir qush uchib ketishi yoki `Esc` bilan oʻyinni tashlab ketish bitta yurakni oladi. Uchta yurak tugasa, oʻyin tamom boʻladi.
- Har bir toʻgʻri urish komboni oshiradi. Ball: `belgilar soni × 10 × kombo` (apostrof ham belgi sifatida hisoblanadi), kombo koʻpi bilan 5 baravar.
- Har 10 ta hal qilingan qushdan keyin yangi toʻlqin boshlanadi. Toʻlqin oshgani sari qushlar tezlashadi va koʻproq boʻladi.
- Toʻlqinni xatosiz yakunlash uchun +50 bonus beriladi. Eng yaxshi natija saqlanadi.

## Boshqaruv

| Tugma       | Vazifasi                               |
| ----------- | -------------------------------------- |
| Harflar     | Soʻz yozish                            |
| `Backspace` | Oxirgi harfni oʻchirish                |
| `Esc`       | Pauza / davom etish                    |
| `M`         | Butun ovozni yoqish yoki oʻchirish     |
| `Enter`     | Boshlash / davom etish / qayta oʻynash |
| `F11`       | Toʻliq ekran                           |

Oyna oʻlchami eslab qolinadi. Oʻyin 16:9 nisbatda, 1280×720 dizayn maydonida masshtablanadi.

## Texnologiyalar

- Tauri 2 — oflayn desktop qobiq (Linux `.deb` va AppImage)
- Svelte 5 (runes) + TypeScript
- Vite 8
- Vitest, ESLint, Prettier, svelte-check
- Web Audio API bilan yaratilgan ovozlar; tashqi media fayllar yoʻq
- Fredoka va DejaVu Sans shriftlari loyihaga biriktirilgan; litsenziyalari `public/fonts/` ichida

## Talablar

- Node.js 20+ va npm
- Rust stable
- Linux uchun Tauri tizim paketlari (`libwebkit2gtk-4.1-dev`, `build-essential`, `libxdo-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` va boshqalar)

## Ishga tushirish

```bash
npm install
npm run tauri dev
```

Faqat brauzerda interfeysni koʻrish uchun:

```bash
npm run dev
```

Brauzer rejimida oyna oʻlchamini saqlash va Tauri oynasini boshqarish ishlamaydi, lekin oʻyinning oʻzi ishlaydi.

## Tekshirish

```bash
npm test
npm run check
npm run lint
npm run format:check
```

## Yigʻish

```bash
npm run tauri build
```

Paketlar quyidagi joylarda hosil boʻladi:

- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/appimage/*.AppImage`

## Loyiha tuzilishi

```text
src/
  App.svelte              oʻyin ekrani, HUD va interfeys
  app.css                 umumiy uslublar
  lib/components/         qush, kamonchi va fon SVG komponentlari
  lib/data/words.json     oʻzbekcha soʻzlar roʻyxati
  lib/game/               oʻyin dvigateli, ball, qiyinlik, saqlash, ovoz
src-tauri/                Tauri konfiguratsiyasi va ikonkalar
```
