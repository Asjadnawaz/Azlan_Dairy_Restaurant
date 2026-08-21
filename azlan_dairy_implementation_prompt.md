# Azlan Dairy Next App — Upgradtion Implementation Prompt

## Project Context

You are working on **Azlan Dairy Next App** — a Next.js 16 (App Router) + React 19 + TypeScript food delivery website for **Azlan Fast Food & BBQ Point** in Malir, Karachi. The project uses:

- **Next.js 16** with App Router, Server Components, and `src/proxy.ts` (Next.js 16 Proxy, formerly Middleware)
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) for database, auth, and realtime
- **Tailwind CSS v4** (CSS-based config in `src/app/globals.css` using `@theme inline`)
- **Zustand** for cart state management (persisted to `localStorage`)
- **Resend** for transactional emails
- **Leaflet / react-leaflet** for map picking
- **Sonner** for toast notifications
- **Radix UI** (`@radix-ui/react-dialog`, etc.) for accessible primitives
- **Lucide React / Material Symbols** for icons

**Key conventions:**
- Path alias: `@/*` → `./src/*`
- Client components use `"use client"` at top
- Server components fetch data directly with `createServerClient()`
- Admin routes protected by `src/proxy.ts` + `src/lib/admin.ts` (`isAdminUser()` checks `app_metadata.role === "admin"` OR email whitelist in `ADMIN_EMAILS` / `NEXT_PUBLIC_ADMIN_EMAILS`)
- No ORM (Prisma/Drizzle) — raw Supabase client queries everywhere
- No test suite exists yet
- All text inputs should be sanitized before saving to prevent layout breaks

---

## Existing Architecture (DO NOT BREAK)

### Database Schema (Current)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `items` | id, slug, name, price, image_path, category, is_available, rating, review_count, timestamps | 50+ menu items auto-seeded from `src/data/menu-data.ts` |
| `orders` | id, order_number (AD-XXXX), customer_name, customer_phone, customer_address, customer_note, subtotal, discount, total, status (pending\|preparing\|ready\|delivering\|completed\|cancelled), placed_at, preparing_at, ready_at, delivering_at, completed_at, cancelled_at, user_id, delivery_distance_km, delivery_coordinates {lat,lng}, delivery_fee | Sequential order numbers generated in `src/app/api/orders/route.ts` |
| `order_items` | id, order_id, item_id, name_snapshot, price_snapshot, quantity, line_total, spice_level, extras, sort_order | |
| `reviews` | id, order_id, item_id, customer_name, customer_phone, rating, comment, is_verified, timestamps | |
| `settings` | id, is_active, store_name, whatsapp_number, phone, address, hours, email, min_order_value, delivery_fee, updated_at | Single row (id=1) |

### Auth Flow (Current)
- **Sign up / Sign in modal:** `src/components/azlan/auth-modal.tsx` (email/password + Google OAuth)
- **Auth helpers:** `src/lib/supabase/auth.ts` (`signIn`, `signUp`, `signOut`, `getCurrentUser`, `onAuthStateChange`, `signInWithGoogle`)
- **Browser client:** `src/lib/supabase/client.ts` — singleton via `@supabase/ssr`
- **Server client:** `src/lib/supabase/server.ts` — SSR via `@supabase/ssr` cookies
- **Admin client:** `src/lib/supabase/admin.ts` — service role key, bypasses RLS
- **Admin check:** `src/lib/admin.ts` — checks `user.app_metadata.role === "admin"` OR email whitelist
- **Proxy:** `src/proxy.ts` — refreshes auth session on every request, protects `/admin/*`

### Order Lifecycle (Current)
```
pending → preparing → ready → delivering → completed
                                    ↘ cancelled
```
- Admin advances via `src/components/admin/order-card.tsx` stepper buttons
- Status updates via `PATCH /api/orders/[id]` (admin-only)
- Realtime subscriptions already active in AdminDashboard and OrderTracker

### Customer Flow (Current)
- Browse menu → Add to Cart (Zustand) → Cart Drawer / Cart Page → Checkout → `POST /api/orders`
- Order confirmation email already sent via Resend on placement
- Customer tracking: `src/app/orders/[id]/page.tsx` + `src/components/azlan/order-tracker.tsx`
- Customer reviews: `src/components/azlan/order-review-section.tsx` (submitted per item on completed orders) + `src/components/azlan/item-reviews-modal.tsx`

### Admin Flow (Current)
- `/admin/orders` — AdminDashboard with Orders tab and Price Manager tab
- Store toggle: `POST /api/admin/toggle-store`
- Thermal receipt printing with 80mm/58mm support
- Realtime subscriptions on orders, order_items, settings

---

## Implementation Tasks (Phase by Phase)

### PHASE 1: Database Schema & Realtime Setup

#### 1.1 Create Database Migrations

Create these SQL migrations in `supabase/migrations/`:

**Migration A: Add role to auth.users metadata (or create profiles table)**
Option A (simpler, aligned with existing code): Use `auth.users.user_metadata.role`. No schema change needed, but you must ensure new signups get a default role of `customer` and existing users get backfilled.

Option B (recommended for extensibility): Create a `profiles` table:
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin','rider','customer')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Policies: users can read/update their own profile; admins can read all; service role bypasses RLS
```

**Migration B: Create riders table**
```sql
CREATE TABLE IF NOT EXISTS public.riders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('available','busy','offline')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
```

**Migration C: Add rider_id to orders**
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rider_note TEXT;
```

**Migration D: Enable Realtime on orders**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- Ensure orders table is already in the supabase_realtime publication
```
Also verify `order_items` and `settings` are in the publication (they should already be).

#### 1.2 Update TypeScript Types

Edit `src/lib/supabase/database.types.ts` to add:
```typescript
export type UserRole = "admin" | "rider" | "customer";

export type Profile = {
  id: string;
  role: UserRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Rider = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  status: "available" | "busy" | "offline";
  created_at: string;
  updated_at: string;
};

// Update Order type:
export type Order = {
  // ... existing fields ...
  rider_id: string | null;
  rider_note: string | null;
  payment_status?: string; // Add if not present, or reuse existing logic
};
```

#### 1.3 Backfill Default Roles

Write a one-time script `scripts/backfill-roles.mjs` (similar to `scripts/setup_admin.mjs`) that:
- Sets `user_metadata.role = 'customer'` for all existing users without a role
- Creates `profiles` entries if using Option B

---

### PHASE 2: Authentication & State Persistence

#### 2.1 Role-Based Redirect After Login

Edit `src/components/azlan/auth-modal.tsx`:
- In `handleSubmit`, after successful sign-in, check the user's role from `user_metadata.role` (or profiles table):
  - `admin` → `router.push("/admin/orders"); router.refresh();`
  - `rider` → `router.push("/rider"); router.refresh();`
  - `customer` (default) → close modal, call `onAuthSuccess(user.id)` (existing behavior)

Also handle Google OAuth callback. After `signInWithGoogle()` redirects back, the app should check role and redirect. You can do this in `src/app/page.tsx` or a dedicated `src/app/callback/page.tsx` (Server Component) that reads the session and redirects.

#### 2.2 Persistent Session (Already Exists, Verify)

The project already uses `@supabase/ssr` in both `client.ts` and `server.ts`, which handles `persistSession: true` and `autoRefreshToken: true` via cookies. Verify this works by checking that `createBrowserClient()` and `createServerClient()` do NOT override these defaults. **Do not change** the existing Supabase client setup.

#### 2.3 Rider Profile Management

Create a new client component `src/components/rider/rider-profile-form.tsx`:
- Simple form: Name (max 50 chars), Contact Number (max 15 chars, Pakistan format 03XXXXXXXXX)
- On save, update `auth.users.user_metadata` (or `profiles` table) AND the `riders` table
- Prefill from existing data
- Add validation: name required, phone pattern `03\d{9}`

Create `src/app/rider/profile/page.tsx` (or inline in rider dashboard).

---

### PHASE 3: Order Lifecycle & Workflow Stepper

#### 3.1 Extend Order Status Flow

Current statuses: `pending`, `preparing`, `ready`, `delivering`, `completed`, `cancelled`

Add / align with requirements:
- Keep existing statuses but rename `delivering` to `out_for_delivery` internally if needed, or keep `delivering` and map to `out_for_delivery` in UI.
- The requirement says: `pending → preparing → ready → picked_up → out_for_delivery → delivered`

**Recommended approach:** Add `picked_up` as a new status between `ready` and `out_for_delivery`. Update `OrderStatus` type in `database.types.ts` and all switch statements.

```typescript
export type OrderStatus = 
  | "pending" 
  | "preparing" 
  | "ready" 
  | "picked_up" 
  | "out_for_delivery" 
  | "delivered" 
  | "cancelled";
```

Update `LIFECYCLE_STEPS` in `src/components/admin/order-card.tsx` accordingly.

#### 3.2 Rider Assignment (Admin UI)

Edit `src/components/admin/order-card.tsx`:
- When order status is `ready`, show a **dropdown selector** with active riders (status = `available`) fetched from Supabase
- Show a **"Send to Rider"** button that:
  1. Updates `orders.rider_id = selected_rider_id`
  2. Updates `orders.status = "picked_up"`
  3. Sets `riders.status = "busy"` for the selected rider
- Fetch riders via `supabase.from("riders").select("*").eq("status", "available")`

#### 3.3 Rider Dashboard

Create `src/app/rider/page.tsx` (or `/rider/dashboard/page.tsx`):
- Protected route (check `user_metadata.role === 'rider'` in a Server Component or client-side)
- Show orders assigned to the logged-in rider where status is `picked_up`, `out_for_delivery`, or `delivered`
- Each rider card displays:
  - Order ID, Customer Name, Address, Items List, Cash to Collect, Note to Rider
  - **Navigation Button:** `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` (use `order.delivery_coordinates`)
  - Action buttons: **"Out for Delivery"** (sets status to `out_for_delivery`) and **"Delivered"** (sets status to `delivered`)

#### 3.4 Admin Order Card Enhancements

Edit `src/components/admin/order-card.tsx`:
- Add `rider_id` and `rider_note` display
- When `status === "ready"`, show rider assignment dropdown + "Send to Rider" button
- Update the lifecycle stepper to include `picked_up` and `out_for_delivery` steps

#### 3.5 Update PATCH Route

Edit `src/app/api/orders/[id]/route.ts`:
- Add `picked_up` and `out_for_delivery` to `validStatuses`
- Add timestamp columns:
  - `picked_up_at` for `picked_up`
  - Keep `delivering_at` / `completed_at` logic for `out_for_delivery` / `delivered`

---

### PHASE 4: Customer Portal, UI Improvements & Reviews

#### 4.1 Header & Hero Section

Edit `src/components/azlan/hero.tsx`:
- Change CTA text from **"Explore Full Menu"** to **"Order Now"**
- Keep href as `/#menu`

Edit `src/components/azlan/header.tsx`:
- Add `transition-transform duration-200 hover:scale-105 active:scale-95` to the Sign In button (it's partially there but ensure it matches exactly)
- Add **post-login toast**: When user signs in, show a bottom-right floating welcome toast using Sonner: `"Welcome back, [First Name]!"`

#### 4.2 Product Detail View

Create `src/app/product/[slug]/page.tsx` (Server Component):
- Fetch item by `slug` from `items` table
- Render a modal/page with:
  - High-res image
  - Description, price
  - Quantity counter (+/-)
  - Verified customer reviews with dynamic star average (query `reviews` table joined with `items.rating` / `review_count`)
  - "Add to Cart" button

Create `src/components/azlan/product-detail-modal.tsx` (Client Component) if you prefer a modal over a separate page. The existing `ProductCard` currently only has "Add to Cart". Add a **"View Product"** button that opens this modal/page.

#### 4.3 Review Gatekeeper

Edit `src/components/azlan/order-review-section.tsx` and `src/components/azlan/item-reviews-modal.tsx`:
- **Only allow review submission** if the logged-in user has a `delivered` order in their history that contains the specific `item_id`
- Query: `supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).eq("status", "delivered")` then check if any `order_items.item_id === targetItemId`
- If not eligible, show a message: *"You can only review items you've ordered and received."*

#### 4.4 Cart Floating Notification

Edit `src/components/azlan/cart-drawer.tsx` and `src/components/azlan/floating-buttons.tsx`:
- When an item is added to cart, show a bottom-right floating mini-notification (Sonner toast is already used, but enhance it)
- The floating button in `floating-buttons.tsx` should appear after scroll > 500px (already exists). Ensure it has a quick checkout link to `/cart`.

#### 4.5 Google Reviews Redesign

Edit `src/components/azlan/testimonials-section.tsx`:
- Replace the current screenshot carousel with a clean modern card grid
- Use subtle shadows and clean typography
- Remove dependency on `Review1.PNG` through `Review4.PNG` static images
- Fetch real reviews from the `reviews` table and display them in cards with:
  - Reviewer name, rating stars, comment, date
  - Verified buyer badge if `is_verified === true`

---

### PHASE 5: Checkout Validations & Security

Edit input fields in `src/components/azlan/cart-drawer.tsx` and `src/app/cart/page.tsx`:

| Field | Max Length | Validation |
|-------|-----------|------------|
| Full Name | 50 | Required, trim whitespace |
| Phone Number | 15 | Required, Pakistan format (`03\d{9}`), digits only |
| Delivery Address | 250 | Required, trim + sanitize HTML entities |
| Order Note / Rider Note | 200 | Optional, trim + sanitize |

**Sanitization:** Before saving to DB, strip HTML tags and encode special characters. Use a simple helper:
```typescript
function sanitizeText(input: string, maxLen: number): string {
  return input.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}
```

Apply this in `src/app/api/orders/route.ts` before inserting orders, and in the rider dashboard before saving rider notes.

---

### PHASE 6: Email Integration (Resend)

#### Trigger 1: Order Placement (Already Exists)
- `src/app/api/orders/route.ts` already sends confirmation email via Resend
- Ensure the email includes a **tracking link**: `https://yourdomain.com/orders/{orderId}`

#### Trigger 2: Order Delivered
When rider marks order as `delivered`:
1. In `src/app/api/orders/[id]/route.ts`, after updating status to `delivered`, fire an async email
2. Create a new email template in `src/lib/email/delivery-receipt.ts`:
   - Delivery receipt with order summary
   - Feedback request link
   - Send to customer's checkout email (from `orders` joined with `auth.users.email` via `user_id`)
3. Use Resend SDK with the existing `RESEND_API_KEY`

**Important:** The `PATCH /api/orders/[id]` route currently uses `createServerClient()` for auth but `createAdminClient()` for DB writes. To fetch customer email for the delivery receipt, query the `profiles` table or `auth.users` via the admin client.

---

## Critical Constraints & How to Work With This Codebase

1. **No ORM** — All DB access is via `supabase.from(...).select()/insert()/update()/delete()`
2. **No test suite** — Do not add tests unless explicitly asked
3. **Tailwind v4** — Use CSS custom properties (`var(--color-primary)`, etc.) defined in `globals.css`. Do NOT use arbitrary hex values for brand colors.
4. **Icons** — Use Material Symbols (`<span className="material-symbols-outlined">name</span>`) or Lucide icons. The project uses both, but Material Symbols dominate in customer-facing components.
5. **Zustand store** — `src/lib/cart-store.ts` uses `persist` middleware with `localStorage` key `azlan-dairy-cart`. Do not change the key or storage mechanism.
6. **Rider status flow** — When a rider is assigned an order, set `riders.status = 'busy'`. When order is delivered, set back to `available'`. When rider goes offline manually (future), set `'offline'`.
7. **Admin auth** — Always verify admin via `isAdminUser(user)` from `src/lib/admin.ts`. Never trust client-side checks alone for admin routes.
8. **Supabase SSR** — Use `createServerClient()` in Server Components and Route Handlers. Use `createBrowserClient()` in Client Components. Do NOT use `createAdminClient()` in client components.
9. **File structure** — Keep components in `src/components/azlan/` (customer) and `src/components/admin/` (admin). New rider components go in `src/components/rider/`. New API routes go in `src/app/api/...`.
10. **Next.js 16 Proxy** — `src/proxy.ts` currently only protects `/admin/*`. You may extend it to protect `/rider/*` as well.

---

## Step-by-Step Execution Order

1. **Database migrations** first (Phase 1.1) — create riders table, add rider_id to orders, enable realtime
2. **Update types** (Phase 1.2, 1.3) — modify `database.types.ts`, write backfill script
3. **Auth redirects** (Phase 2.1) — modify auth-modal and add callback route
4. **Rider assignment UI** (Phase 3.2) — modify admin order-card
5. **Rider dashboard** (Phase 3.3) — new pages/components
6. **Extend order statuses** (Phase 3.1, 3.5) — update types, order-card, API route
7. **UI improvements** (Phase 4) — hero CTA, header toast, product detail, reviews redesign
8. **Validations** (Phase 5) — update cart-drawer, cart page, and API route
9. **Delivery email** (Phase 6.2) — new email template and trigger in PATCH route

Start with Phase 1 and proceed sequentially. After each phase, verify the app compiles with `npm run build` (or `next build`). Do not run `npm run dev` unless necessary for verification.

---

## Security Note

The project has hardcoded Supabase service role keys in `.env.local` and `scripts/setup_admin.mjs`. **Do not commit any secrets.** If you create new scripts requiring the service role key, read it from `process.env.SUPABASE_SERVICE_ROLE_KEY`.
