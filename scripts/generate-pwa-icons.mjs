import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const LOGO_SRC = path.join(ROOT, "public", "images", "logo.png");

await mkdir(ICONS_DIR, { recursive: true });

console.log("Generating PWA icons from:", LOGO_SRC);

// 1. Customer Main App Icons (192, 512, apple-touch-icon 180)
await sharp(LOGO_SRC)
  .resize(192, 192, { fit: "cover" })
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "icon-192.png"));

await sharp(LOGO_SRC)
  .resize(512, 512, { fit: "cover" })
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "icon-512.png"));

await sharp(LOGO_SRC)
  .resize(180, 180, { fit: "cover" })
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "apple-touch-icon.png"));

// Maskable Customer Icon (padding around logo on dark emerald background)
const customerBg = {
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 0, g: 35, b: 12, alpha: 1 }, // #00230c
  },
};
const paddedLogo = await sharp(LOGO_SRC)
  .resize(380, 380, { fit: "contain", background: { r: 0, g: 35, b: 12, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(customerBg)
  .composite([{ input: paddedLogo, gravity: "center" }])
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "icon-maskable.png"));

// 2. Rider App Icons
// Rider icon features a sleek midnight stealth background (#07110B), an amber circular emblem with Azlan Dairy logo, a top-right lightning bolt dispatch badge, and an amber "RIDER" delivery scooter pill.
const circleMask = Buffer.from(
  `<svg width="260" height="260"><circle cx="130" cy="130" r="130" fill="#fff" /></svg>`
);

const circularLogo = await sharp(LOGO_SRC)
  .resize(260, 260, { fit: "cover" })
  .composite([{ input: circleMask, blend: "dest-in" }])
  .png()
  .toBuffer();

const baseRiderSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f1913" />
      <stop offset="50%" stop-color="#07110b" />
      <stop offset="100%" stop-color="#030704" />
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="512" height="512" rx="116" fill="url(#bgGrad)" />
  <rect x="14" y="14" width="484" height="484" rx="104" fill="none" stroke="url(#amberGrad)" stroke-width="10" opacity="0.9" />
  <rect x="25" y="25" width="462" height="462" rx="94" fill="none" stroke="#fbbf24" stroke-width="1.5" opacity="0.25" />

  <!-- Amber Circular Rim -->
  <circle cx="256" cy="180" r="144" fill="none" stroke="url(#amberGrad)" stroke-width="9" filter="url(#glow)" opacity="0.8" />
  <circle cx="256" cy="180" r="136" fill="#00230c" stroke="#fbbf24" stroke-width="5" />
</svg>
`;

const overlayRiderSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="amberPill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7" />
      <stop offset="20%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="pillGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Top Badge: Flash Delivery / 24/7 Dispatch -->
  <g transform="translate(345, 68)" filter="url(#shadow)">
    <circle cx="26" cy="26" r="26" fill="url(#amberPill)" stroke="#07110b" stroke-width="3" />
    <path d="M28 12 L16 27 L24 27 L22 40 L34 25 L26 25 Z" fill="#07110b" />
  </g>

  <!-- Bottom RIDER PORTAL Pill -->
  <g filter="url(#shadow)">
    <rect x="76" y="356" width="360" height="84" rx="42" fill="url(#amberPill)" filter="url(#pillGlow)" opacity="0.6" />
    <rect x="76" y="356" width="360" height="84" rx="42" fill="url(#amberPill)" />

    <!-- Sleek Delivery Scooter Vector inside pill -->
    <g transform="translate(112, 375)">
      <circle cx="10" cy="30" r="7" fill="none" stroke="#07110b" stroke-width="3.5"/>
      <circle cx="10" cy="30" r="2.5" fill="#07110b"/>
      <circle cx="42" cy="30" r="7" fill="none" stroke="#07110b" stroke-width="3.5"/>
      <circle cx="42" cy="30" r="2.5" fill="#07110b"/>
      <rect x="3" y="10" width="14" height="13" rx="2.5" fill="#07110b"/>
      <path d="M15 23 h11 l6 -11 h7" fill="none" stroke="#07110b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M38 12 l-2 -5 h-4" fill="none" stroke="#07110b" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 28 h12" fill="none" stroke="#07110b" stroke-width="3.5" stroke-linecap="round"/>
    </g>

    <text x="282" y="413" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#07110b" text-anchor="middle" letter-spacing="3.5">RIDER</text>
  </g>

  <!-- Subtitle -->
  <text x="256" y="475" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#fbbf24" text-anchor="middle" letter-spacing="4" opacity="0.95">AZLAN DISPATCH</text>
</svg>
`;

const rider512Buffer = await sharp(Buffer.from(baseRiderSvg))
  .composite([
    { input: circularLogo, top: 50, left: 126 },
    { input: Buffer.from(overlayRiderSvg), top: 0, left: 0 },
  ])
  .png({ quality: 95 })
  .toBuffer();

await sharp(rider512Buffer).toFile(path.join(ICONS_DIR, "rider-icon-512.png"));

await sharp(rider512Buffer)
  .resize(192, 192)
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "rider-icon-192.png"));

await sharp(rider512Buffer)
  .resize(180, 180)
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "rider-apple-touch-icon.png"));

// Maskable Rider icon: 80% safe zone padded on dark slate background (#07110B)
const paddedRiderIcon = await sharp(rider512Buffer)
  .resize(410, 410, { fit: "contain" })
  .toBuffer();

const riderMaskableBg = {
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 7, g: 17, b: 11, alpha: 1 }, // #07110b
  },
};

await sharp(riderMaskableBg)
  .composite([{ input: paddedRiderIcon, gravity: "center" }])
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "rider-maskable.png"));

console.log("Successfully generated all Customer and Rider PWA icons in public/icons/");
