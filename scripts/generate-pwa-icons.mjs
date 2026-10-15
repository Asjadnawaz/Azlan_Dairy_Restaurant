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
// Rider icon has a dark slate background (#07110B) with amber delivery bike accent
const riderSvgBadge = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="riderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1710" />
      <stop offset="100%" stop-color="#050a07" />
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <!-- Background with amber ring -->
  <rect width="512" height="512" rx="100" fill="url(#riderGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="90" fill="none" stroke="url(#amberGrad)" stroke-width="12" />
  
  <!-- Rider Label Pill at bottom -->
  <rect x="106" y="400" width="300" height="72" rx="36" fill="#f59e0b" />
  <text x="256" y="448" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#050a07" text-anchor="middle" letter-spacing="4">RIDER APP</text>
</svg>
`;

const riderBgBuffer = Buffer.from(riderSvgBadge);

// Composite logo inside the rider badge
const logoForRider = await sharp(LOGO_SRC)
  .resize(280, 280, { fit: "cover" })
  .toBuffer();

const rider512Buffer = await sharp(riderBgBuffer)
  .composite([{ input: logoForRider, top: 90, left: 116 }])
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

await sharp(rider512Buffer)
  .resize(512, 512)
  .png({ quality: 95 })
  .toFile(path.join(ICONS_DIR, "rider-maskable.png"));

console.log("Successfully generated all Customer and Rider PWA icons in public/icons/");
