-- ===========================================================================
-- Customer flow: store schedule columns + one-review-per-item-per-order.
--
-- Run sections 1 and 2 in the Supabase SQL editor. Section 3 is already
-- satisfied on this database and is here for the record. Section 4 is commented
-- out on purpose — read it before you decide.
--
-- Everything is idempotent; re-running it is safe.
--
-- WHAT BREAKS WITHOUT SECTION 1
--   The app degrades rather than failing: `getStoreOpenStatus` falls back to the
--   old `is_active` boolean (false ⇔ force_closed), and /api/admin/toggle-store
--   catches the missing-column error, writes `is_active` only and answers with
--   `degraded: "missing_columns"` so the dashboard says "Saved as open/closed
--   only". So today the admin can still close the shop early — but CANNOT open
--   it outside 7 PM – 4 AM, which is the whole point of section 1.
--
-- WHAT BREAKS WITHOUT SECTION 2
--   Nothing visible, but "genuine reviews" stops being enforceable at the
--   database. /api/reviews already refuses a second review for the same
--   (order, item); the unique index is what makes that true under a double-tap
--   or two tabs racing, where two requests can both pass the check before
--   either has inserted.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. settings: the schedule and the three open modes
--
-- The old model was a single `is_active` boolean, and `getStoreOpenStatus`
-- treated the 7 PM – 4 AM window as a veto — so the flag could only ever CLOSE
-- the shop early. There was no way to take orders at 5 PM for a private booking
-- or an early Ramzan opening.
--
--   open_mode         'auto' follows the schedule; 'force_open' and
--                     'force_closed' override it in either direction.
--   force_open_until  when a force-open lapses. The admin dashboard heartbeats
--                     this forward every 5 minutes while someone is watching,
--                     and the sign-out button retires it. Once it passes AND the
--                     clock is outside opening hours, the next read of the
--                     status reports closed and writes open_mode back to 'auto'
--                     (src/lib/store-hours.ts → `forceOpenLapsed`). That is the
--                     30-minute safety net: a force-open cannot survive the
--                     night on its own.
--   open_hour /       the schedule itself, admin-editable, one source of truth.
--   close_hour        The window wraps midnight whenever close_hour <= open_hour
--                     (19 → 4 is the normal case). 0–23; equal values mean
--                     always open.
-- ---------------------------------------------------------------------------

alter table public.settings
  add column if not exists open_mode text not null default 'auto',
  add column if not exists force_open_until timestamptz,
  add column if not exists open_hour smallint not null default 19,
  add column if not exists close_hour smallint not null default 4;

-- Only the three modes the code knows how to read. Without this a typo in the
-- SQL editor would silently fall through `readMode`'s default and reopen a shop
-- the owner had closed.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settings_open_mode_check'
  ) then
    alter table public.settings
      add constraint settings_open_mode_check
      check (open_mode in ('auto', 'force_open', 'force_closed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'settings_hours_range_check'
  ) then
    alter table public.settings
      add constraint settings_hours_range_check
      check (open_hour between 0 and 23 and close_hour between 0 and 23);
  end if;
end $$;

-- Backfill so the live row keeps behaving exactly as it does now: a shop that is
-- currently switched off stays off, everything else follows the schedule.
update public.settings
set open_mode = case when is_active then 'auto' else 'force_closed' end
where open_mode is null or open_mode not in ('auto', 'force_open', 'force_closed');

-- `hours` is display-only and the app now derives it from open_hour/close_hour,
-- but the stored default said "7:00 PM - 3:00 AM" while the code has always used
-- 4 AM. Align it so anything still reading the column cannot contradict the site.
update public.settings
set hours = '7:00 PM – 4:00 AM'
where id = 1 and hours <> '7:00 PM – 4:00 AM';


-- ---------------------------------------------------------------------------
-- 2. reviews: one review per item per order
--
-- This is what makes "genuine" enforceable. `order_id` is nullable, so the index
-- is partial — legacy rows without an order (there are none today) do not
-- collide with each other.
--
-- Safe to run as-is: reviews currently holds 0 rows and 0 duplicate
-- (order_id, item_id) pairs, so the index cannot fail to build.
--
-- Deliberately NO browser INSERT policy is added. `reviews` has exactly one
-- policy — "Public can view reviews" (SELECT) — and that is correct: the only
-- writer is POST /api/reviews on the service-role key, which is what lets it
-- verify that the order is completed and that the item was really in it. Adding
-- an INSERT policy for `anon`/`authenticated` would let anyone post a five-star
-- review for any product from the browser console.
-- ---------------------------------------------------------------------------

create unique index if not exists reviews_order_item_unique_idx
  on public.reviews (order_id, item_id)
  where order_id is not null;


-- ---------------------------------------------------------------------------
-- 3. reviews (item_id) read index — ALREADY PRESENT, nothing to run
--
-- The product-detail modal reads reviews by item_id. `idx_reviews_item_id`
-- already covers it (as does `idx_reviews_created_at` for the homepage's
-- newest-first list), so the plan's optional index is a no-op here. Kept as a
-- comment so a fresh database gets it too:
--
--   create index if not exists idx_reviews_item_id on public.reviews (item_id);
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 4. RLS — NOT APPLIED. Read this before running any of it.
--
-- Three tables are writable by any signed-in customer holding the public anon
-- key. These are real, verified against pg_policies, and none of them is fixed
-- by the application code in this round — the fix is a policy change, and
-- changing policies can break the app if a code path is relying on the hole.
-- Test each one on a branch before production.
--
-- 4a. orders / order_items — raised previously, still open.
--     `orders_auth_read`, `orders_auth_update`, `orders_auth_delete` and
--     `order_items_auth_all` are all USING (true) for `authenticated`. Any
--     logged-in customer can read every order in the system (names, phones,
--     addresses, totals), change any status, and delete any order.
--
--     Before enabling: the admin dashboard and the rider screens both read and
--     write orders. Check whether they go through the service-role client
--     (createAdminClient) or the browser client — anything still on the browser
--     client will start getting empty results.
--
--     -- drop policy if exists "orders_auth_read" on public.orders;
--     -- drop policy if exists "orders_auth_update" on public.orders;
--     -- drop policy if exists "orders_auth_delete" on public.orders;
--     -- drop policy if exists "order_items_auth_all" on public.order_items;
--     --
--     -- -- Customers see only their own orders, matched on the phone in their profile.
--     -- create policy "orders_own_read" on public.orders
--     --   for select to authenticated
--     --   using (
--     --     customer_phone in (
--     --       select phone from public.profiles where id = auth.uid()
--     --     )
--     --   );
--     --
--     -- create policy "order_items_own_read" on public.order_items
--     --   for select to authenticated
--     --   using (
--     --     order_id in (
--     --       select id from public.orders
--     --       where customer_phone in (
--     --         select phone from public.profiles where id = auth.uid()
--     --       )
--     --     )
--     --   );
--     --
--     -- -- No UPDATE or DELETE for `authenticated` at all: status changes belong to
--     -- -- the admin and rider API routes, which use the service-role key and
--     -- -- bypass RLS anyway.
--
-- 4b. settings — `settings_auth_update` is USING (true) for `authenticated`, so
--     any signed-in customer can flip the store open or closed, or rewrite the
--     shop's phone number and delivery fee. /api/admin/toggle-store already runs
--     on the service-role key and checks isAdminUser, so it does not need this
--     policy.
--
--     -- drop policy if exists "settings_auth_update" on public.settings;
--
-- 4c. items — `items_auth_all` is USING (true) for `authenticated`, so any
--     signed-in customer can edit menu prices or delete products. The admin
--     price manager writes through /api/admin/items; confirm that route is on
--     the service-role client before dropping this.
--
--     -- drop policy if exists "items_auth_all" on public.items;
--     -- -- Reads stay open; `items_anon_read` and `items_auth_read` already cover them.
-- ---------------------------------------------------------------------------
