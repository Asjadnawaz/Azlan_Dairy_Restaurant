# Operations, Setup & Deployment Guide

**Project:** Azlan Fast Food & BBQ Point (Azlan Dairy)  
**Production URL:** `https://azlanfastfood.com`  

---

## 1. Prerequisites & Environment Setup

- **Node.js:** `v20.x` or later (LTS recommended)
- **Package Manager:** `npm` (bundled with Node)
- **Database:** Supabase project (PostgreSQL 15+)
- **Transactional Mail:** Resend account

### 1.1 Local Installation
```bash
# Clone the repository
git clone https://github.com/Mahad-Nawaz-Khan/Azlan_Dairy_Restaurant.git
cd Azlan_Dairy_Restaurant

# Install dependencies
npm install
```

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.local` and populate the keys:
```bash
cp .env.example .env.local
```

### Key Reference:
| Variable | Description | Required For |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) | Database & Realtime queries |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous public API key | Client-side public reads & auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase secret key (Server-only) | Admin order management & review validation |
| `NEXT_PUBLIC_SITE_URL` | Canonical domain (`https://azlanfastfood.com`) | SEO metadata, Sitemap, OpenGraph |
| `RESEND_API_KEY` | Resend API key (`re_...`) | Automated order receipts via email |
| `RESEND_FROM_EMAIL` | Sender address (e.g., `orders@azlanfastfood.com`) | Delivery receipt emails |
| `ADMIN_PASSWORD` | Cryptographic password for kitchen dashboard | Accessing `/admin` portal |
| `RIDER_PASSWORD` | Password for rider shifts portal | Accessing `/rider` portal |

> [!CAUTION]
> Never commit `.env` or `.env.local` to GitHub. The repository `.gitignore` ensures that only `.env.example` is tracked.

---

## 3. Database Migrations & Initial Seeding

Apply the SQL migrations located in `supabase/migrations/` sequentially in the Supabase SQL Editor:
1. `20250729_add_delivery_fee.sql`: Adds distance-based delivery fee calculations.
2. `20260819_profiles_riders.sql`: Creates user profiles, roles (`admin`, `rider`, `customer`).
3. `20260824_admin_dashboard_stats.sql`: Creates aggregate RPC functions for revenue and sales stats.
4. `20260825_customer_flow.sql`: Adds unique indexes, verified review triggers, and order status constraints.

### 3.1 Seeding the Menu Database
Once migrations are executed, populate the database with the bundled menu items:
```bash
# Sync all menu items (pizzas, burgers, deals, rolls, BBQ) into Supabase
node scripts/sync-items.mjs
```

---

## 4. Asset Generation Pipelines

### 4.1 Subsetting the Material Symbols Icon Font
The project uses a self-hosted, lightweight icon font subset (**85.6 KB**) instead of the 1 MB Google Fonts stylesheet:
```bash
npm run build:icons
```
- Scans `src/` for all icon names used in TSX files.
- Downloads the subsetted `.woff2` font directly to `src/assets/fonts/material-symbols-subset.woff2`.
- Run this command whenever you add a new icon ligature anywhere in the frontend.

### 4.2 Multi-Resolution Menu Images Pipeline
```bash
npm run build:images
```
- Uses `sharp` to process master images into 3 right-sized WebP variants (400w, 640w, 960w) in `public/images/menu/`.
- Computes inline 10px base64 blur previews in `src/data/menu-image-blur.generated.ts`.
- Run this command after adding any new dish photos.

---

## 5. Thermal Receipt Printing Setup

The kitchen and dispatch modules include support for thermal POS receipt printers (ESC/POS 80mm and 58mm):

1. In the Admin Dashboard (`/admin`), click **Print Receipt** on any confirmed order.
2. In the browser print dialog:
   - **Destination:** Select your 80mm or 58mm Thermal Printer.
   - **Paper Size:** 80mm × Receipt (or Continuous).
   - **Margins:** Set to **None**.
   - **Options:** Enable **Background Graphics**.
3. Output format includes:
   - Official Azlan Fast Food & BBQ Point header with Malir address.
   - Large bold Order Number (`#AZ-XXXX`) for kitchen callouts.
   - Item lines with sizes (e.g. `Vegetable Pizza (Regular)`).
   - Customer phone, address, and pinpoint delivery instructions.
   - Subtotal, delivery fee, and COD payment balance.

---

## 6. Daily Operations & Store Hours

### 6.1 Operating Hours
- **Standard Schedule:** 7:00 PM – 3:00 AM (Pakistan Standard Time, UTC+5).
- Outside operating hours, product cards display `"Store Closed"` and cart checkout is disabled.

### 6.2 Emergency Override
If heavy rains, power cuts, or kitchen capacity require temporarily opening or closing:
1. Log into `/admin`.
2. Toggle the **Store Status** switch in the top bar.
3. The change instantly propagates to all visiting customers via Supabase Realtime without requiring a redeploy.

---

## 7. Production Deployment (Vercel)

1. **Connect Repository:** Import `Mahad-Nawaz-Khan/Azlan_Dairy_Restaurant` into Vercel.
2. **Framework Preset:** Next.js.
3. **Build Command:** `next build` (or `npm run build`).
4. **Environment Variables:** Add all production keys from `.env.example`.
5. **Custom Domain:**
   - Add `azlanfastfood.com` and `www.azlanfastfood.com`.
   - Point DNS A Record to `76.76.21.21` and CNAME to `cname.vercel-dns.com`.
