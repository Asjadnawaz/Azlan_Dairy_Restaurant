# Rider Dashboard — Simplified Plan (Single Rider)

## Assumption
There is exactly **one delivery rider**. No rider management, no assignments, no profiles.

## Database Changes

Only add `delivery_fee` tracking on orders if not already present.

```sql
-- delivery_fee already exists from 20250729_add_delivery_fee.sql
```

No new tables needed. The rider is implicitly the single delivery person for all `delivering` status orders.

## Rider Auth

Simplest possible: a shared PIN/password for the rider device.

- Route: `/rider`
- No user accounts, no profiles
- Session via `rider_auth` cookie (same pattern as admin)
- PIN configured in env: `RIDER_PIN` (e.g., `1234`)

## Pages

### `/rider` — Rider Dashboard
- Simple PIN login form (if not authenticated)
- Once logged in, show orders with status `ready` or `delivering`
- Each order card shows:
  - Customer name + phone (tap to call)
  - Delivery address
  - Map route (restaurant → customer)
  - Order items
  - **Action buttons:**
    - `ready` → "Pick Up" (→ `delivering`)
    - `delivering` → "Mark Delivered" (→ `completed`)

### No separate pages needed
- Single page `/rider` handles everything
- No `/rider/orders`, `/rider/profile`, etc. needed

## API Routes

### `POST /api/rider/login`
- Body: `{ pin: string }`
- Validate against `RIDER_PIN` env var
- Set `rider_auth=true` cookie on success
- Return `{ success: true }`

### `POST /api/rider/logout`
- Clear `rider_auth` cookie

### `GET /api/rider/orders`
- Auth: check `rider_auth` cookie
- Return orders where `status = 'ready' OR status = 'delivering'`
- Include `order_items` and `settings`

### `PATCH /api/rider/orders/[id]`
- Auth: check `rider_auth` cookie
- Body: `{ status: 'delivering' | 'completed' }`
- Update order status + timestamps
- Return updated order

## Components

### `src/components/rider/rider-login-form.tsx`
- PIN input (4 digits)
- Submit button
- Error display

### `src/components/rider/rider-dashboard.tsx`
- Top bar: "Rider Dashboard" title + Logout button
- Two sections:
  1. **Ready for Pickup** — orders with `status = 'ready'`
  2. **Out for Delivery** — orders with `status = 'delivering'`
- Each section has order cards with action buttons
- Realtime updates via Supabase subscriptions
- Polling fallback every 4s (same pattern as admin)

### `src/components/rider/rider-order-card.tsx`
- Customer info (name, phone)
- Delivery address + distance
- Leaflet map (restaurant → customer)
- Compact items list
- Primary action button based on status

### `src/components/rider/rider-map.tsx`
- Same as `admin/order-map.tsx`
- Restaurant marker + customer marker + polyline

## Proxy Update

```ts
// src/proxy.ts
const isRiderRoute = pathname.startsWith("/rider");
const riderAuthCookie = request.cookies.get("rider_auth")?.value === "true";

if (isRiderRoute && !riderAuthCookie) {
  return NextResponse.redirect(new URL("/rider", request.url));
}
```

## File Structure

```
src/app/rider/page.tsx                    # Server component
src/components/rider/
  rider-dashboard.tsx                     # Main client component
  rider-order-card.tsx                    # Order card for rider
  rider-map.tsx                           # Leaflet map
  rider-login-form.tsx                    # PIN form
src/app/api/rider/
  login/route.ts                          # POST validate PIN
  logout/route.ts                         # POST clear cookie
  orders/route.ts                         # GET assigned orders
  orders/[id]/route.ts                    # PATCH status update
src/proxy.ts                              # Updated rider guard
```

## Design

- Match existing admin aesthetic
- Mobile-first (rider likely uses phone)
- Large touch targets for action buttons
- High-contrast status colors

## No Changes Needed

- Database schema (riders table not needed)
- Admin dashboard (no rider management UI)
- Order types (no rider_id column needed)
- Real-time: just listen for order status changes on `ready`/`delivering`
