/**
 * Builds a self-hosted subset of the Material Symbols Outlined icon font that
 * contains only the icons referenced in `src/`.
 *
 * Why: the full font is ~1 MB and loading it from Google Fonts made icon names
 * ("schedule", "shopping_cart") flash as plain text before the font arrived.
 *
 * Usage:  npm run build:icons
 * Re-run whenever a new icon name is added to the codebase (or to the DB).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_FILE = path.join(SRC_DIR, "assets", "fonts", "material-symbols-subset.woff2");
const EXTRA_ICONS = ["close", "sync", "progress_activity"];
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|css)$/.test(entry.name)) yield full;
  }
}

async function fetchOfficialIconNames() {
  const res = await fetch("https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true");
  if (!res.ok) throw new Error(`Could not load icon list (${res.status})`);
  const json = JSON.parse((await res.text()).replace(/^\)\]\}'/, ""));
  return new Set(json.icons.map((icon) => icon.name));
}

async function collectCandidates() {
  const found = new Set();
  for await (const file of walk(SRC_DIR)) {
    const text = await readFile(file, "utf8");
    // Every quoted string and every JSX text node is a possible ligature name;
    // the official icon list filters out the false positives.
    for (const match of text.matchAll(/["'`>]\s*([a-z][a-z0-9_]{1,40})\s*(?=["'`<])/g)) {
      found.add(match[1]);
    }
  }
  return found;
}

const official = await fetchOfficialIconNames();
const candidates = await collectCandidates();
const icons = [...new Set([...candidates].filter((name) => official.has(name)).concat(EXTRA_ICONS))].sort();

const cssUrl =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1" +
  `&icon_names=${icons.join(",")}&display=block`;
const css = await (await fetch(cssUrl, { headers: { "User-Agent": USER_AGENT } })).text();
const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
if (!fontUrl) throw new Error(`Unexpected Google Fonts response:\n${css}`);

const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, font);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} — ${icons.length} icons, ${(font.length / 1024).toFixed(1)} KB`);
