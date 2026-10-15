# Azlan Dairy Restaurant

A full-featured restaurant ordering web application for **Azlan Fast Food & BBQ Point** in Malir, Karachi. Browse the menu, place orders, track deliveries, and manage the restaurant — all from a modern, responsive web interface.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

### Customer

- **Dynamic menu** — items by category (Deals, Burgers, Sandwiches, Broast, Rolls, Fries, Parathas, Pizza), live price/availability updates over Supabase Realtime
- **Smart cart** — add/remove with quantity controls; persists across sessions in `localStorage`
- **Checkout with map** — pick a delivery pin on an interactive Leaflet map; the fee is computed from road distance (PKR 60 base for 2 km, PKR 25 per additional km)
- **Order tracking** — live status from pending to delivered, plus a printable invoice
- **Accounts** — sign up, log in, order history, profile editing
- **Reviews** — post-delivery review prompt feeding the homepage testimonials

### Admin

- **Dashboard** — every order with a kitchen stepper, rider assignment and cancellation flows
- **Store toggle** — open/close the shop, force-open window, delivery fee and schedule
- **Price manager** — edit prices and availability with instant realtime propagation
- **Stats** — sales, customers and product aggregates from a Postgres RPC
- **Protected routes** — role-based access enforced in the proxy and re-checked per API call

### Rider

- Shift dashboard with order focus view, confirmations and shift summary

## Tech stack

| Category        | Technology                                          |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 16 (App Router, ISR, Proxy)                 |
| Language        | TypeScript 5 (strict)                               |
| Styling         | Tailwind CSS 4                                      |
| State           | Zustand 5 (cart) + React context (store status)     |
| Database & auth | Supabase (PostgreSQL + RLS + Realtime)              |
| Maps            | Leaflet + react-leaflet                             |
| Icons           | Material Symbols Outlined (self-hosted subset font) |
| Notifications   | Sonner                                              |
| Email           | Resend                                              |

## Project structure

```
src/
  app/            routes (thin pages) + API route handlers
  assets/fonts/   self-hosted icon font subset (generated)
  components/
    admin/        dashboard, orders, stats, receipts
    auth/         sign-in / sign-up modal
    cart/         cart line items, checkout form, order summary
    home/         hero, menu grid, trust, testimonials, about
    layout/       header, footer, chrome, banners
    maps/         delivery map picker
    menu/         product card, detail modal, optimized image
    orders/       tracker, invoice, review prompt
    rider/        rider dashboard and forms
    ui/           icon primitive, hash-scroll handler
  data/menu/      bundled fallback menu, one file per category
  hooks/          store status, mounted-state
  lib/            pricing, delivery, orders, supabase clients, email
public/
  images/menu/    pre-generated right-sized menu images (generated)
scripts/          icon-font + image build scripts, one-off migrations
supabase/         SQL migrations
docs/             design tokens, menu source, privacy policy copy
```

## Getting started

1. **Install** — `npm install` (Node ≥ 20)
2. **Configure** — copy `.env.example` to `.env` and fill in the Supabase and Resend values. Without a `.env` the app still builds and renders from the bundled fallback menu.
3. **Database** — apply `supabase/migrations/*.sql` in order, then seed items with `node scripts/sync-items.mjs`
4. **Run** — `npm run dev` → http://localhost:3000

### Scripts

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | dev server                                         |
| `npm run build`        | production build                                   |
| `npm start`            | serve the production build                         |
| `npm run lint`         | ESLint                                             |
| `npm run typecheck`    | `tsc --noEmit`                                     |
| `npm run format`       | Prettier write                                     |
| `npm run build:icons`  | regenerate the Material Symbols subset font        |
| `npm run build:images` | regenerate right-sized menu images + blur previews |

## Generated assets

Two build scripts keep binary assets out of hand and the payload small:

- `npm run build:icons` scans `src/` for icon ligature names and downloads only those glyphs from Google Fonts into `src/assets/fonts/material-symbols-subset.woff2` (~86 KB instead of the ~1 MB full font). Re-run it after adding a new icon name anywhere in the code or the database.
- `npm run build:images` renders 400/640/960 px WebP variants plus 10 px blur placeholders from the masters in `assets-source/menu` into `public/images/menu/`. Cards and modals serve the pre-built variant closest to their display size, so a card never downloads a 1200 px photo.

The full-resolution masters live in `assets-source/` (outside `public/`) so they are never shipped to visitors; the folder is git-ignored, so keep a local copy if you need to regenerate.

## Performance notes

- The homepage, cart, orders and privacy pages are prerendered (ISR, 60 s) with tag-based revalidation on every menu/settings/review write.
- All server reads are cookie-free and cached; realtime channels keep open tabs live.
- Menu images are pre-sized and immutable-cached; the first card row loads eagerly, the rest lazily with a blur-up placeholder.
- Heavy client-only surfaces (Leaflet maps, admin charts, modals) load via `next/dynamic`.

## Licensing note

The brand display font bundled in `public/fonts/Demo_Fonts/` is a **demo** build of Integral CF (Fontspring). It is fine for development and previews; purchase a commercial licence before using it on a live storefront.
