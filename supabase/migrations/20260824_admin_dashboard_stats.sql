-- ===========================================================================
-- Admin dashboard: indexes + the optional one-round-trip stats function.
--
-- NOTHING HERE IS REQUIRED. The dashboard already works without it:
-- /api/admin/stats tries admin_dashboard_stats() first and silently falls back
-- to four plain queries aggregated in TypeScript (src/lib/admin-stats.ts).
-- Running this file replaces five round-trips with one and lifts the 5,000-order
-- ceiling that makes the dashboard show its "totals cover the most recent 5,000
-- orders" notice.
--
-- Run sections 1 and 2 in the Supabase SQL editor. Sections 3 and 4 are
-- commented out on purpose — read them before you decide.
--
-- Everything is idempotent; re-running it is safe.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Indexes
--
-- orders is scanned by placed_at (the dashboard's ordering and every date
-- window), by status (the filter pills and the pipeline funnel) and by
-- customer_phone (the Customers section groups on it). order_items is only ever
-- read by order_id.
-- ---------------------------------------------------------------------------

create index if not exists orders_placed_at_desc_idx
  on public.orders (placed_at desc);

create index if not exists orders_status_idx
  on public.orders (status);

create index if not exists orders_customer_phone_idx
  on public.orders (customer_phone);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);


-- ---------------------------------------------------------------------------
-- 2. admin_dashboard_stats()
--
-- Returns exactly one JSONB object in the shape of the `AdminStats` type in
-- src/lib/admin-stats.ts. The API validates the shape before using it
-- (isAdminStats), so a partial paste falls back to the query path rather than
-- rendering an empty dashboard.
--
-- Business rules mirrored from buildAdminStats(), keep them in sync:
--   * Days and hours bucket at Asia/Karachi (+05:00, no DST) — "today" has to
--     mean today in Malir even when the server runs UTC.
--   * Cancelled orders keep their pipeline slot but are excluded from every
--     revenue figure and from the delivery/pickup and COD/bank splits.
--   * aov = round(revenue / orders), or 0 when there are no orders.
--   * daily is exactly 14 points, oldest first, zero-filled.
--   * hourly is exactly 24 integers, index = PKT hour.
--   * Pickup = a [PICKUP] tag in customer_note, or "store pickup" in the
--     address. Bank = a [BANK_TRANSFER] or [ONLINE] tag; everything else is COD.
--   * Items sold under a name no longer on the menu stay in the product list
--     with id = null — they still earned money.
--   * A customer is a phone number. The name comes from their most recent
--     order; "registered" means any of their orders carried a user_id, or the
--     phone matches a profiles row.
--
-- security definer because the caller is the service-role key from
-- createAdminClient() and this must never be reachable from the browser:
-- execute is revoked from anon and authenticated below.
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
with b as (
  select (now() at time zone 'Asia/Karachi')::date as today
),

-- Every order, decorated with the PKT buckets and the note-derived flags.
o as (
  select
    ord.id,
    coalesce(ord.total, 0)::bigint                                     as total,
    ord.status::text                                                   as status,
    ord.placed_at,
    (ord.placed_at at time zone 'Asia/Karachi')::date                  as dkey,
    extract(hour from (ord.placed_at at time zone 'Asia/Karachi'))::int as hr,
    nullif(btrim(coalesce(ord.customer_name, '')), '')                 as customer_name,
    nullif(btrim(coalesce(ord.customer_phone, '')), '')                as customer_phone,
    ord.user_id,
    (
      coalesce(ord.customer_note, '') ~* '\[PICKUP\]'
      or coalesce(ord.customer_address, '') ilike '%store pickup%'
    )                                                                  as is_pickup,
    (coalesce(ord.customer_note, '') !~* '\[(BANK_TRANSFER|ONLINE)\]') as is_cod,
    (select today from b)                                              as today
  from public.orders ord
),

-- Revenue-bearing orders: everything except cancellations.
live as (
  select * from o where status <> 'cancelled'
),

win as (
  select
    coalesce(sum(total) filter (where dkey = today), 0)                            as r_today,
    count(*)            filter (where dkey = today)                                as o_today,
    coalesce(sum(total) filter (where dkey = today - 1), 0)                        as r_yest,
    count(*)            filter (where dkey = today - 1)                            as o_yest,
    coalesce(sum(total) filter (where dkey >= today - 6), 0)                       as r_7,
    count(*)            filter (where dkey >= today - 6)                           as o_7,
    coalesce(sum(total) filter (where dkey between today - 13 and today - 7), 0)   as r_p7,
    count(*)            filter (where dkey between today - 13 and today - 7)       as o_p7,
    coalesce(sum(total) filter (where dkey >= today - 29), 0)                      as r_30,
    count(*)            filter (where dkey >= today - 29)                          as o_30,
    coalesce(sum(total), 0)                                                        as r_all,
    count(*)                                                                       as o_all,
    count(*)            filter (where is_pickup)                                   as pickup,
    count(*)            filter (where not is_pickup)                               as delivery,
    count(*)            filter (where is_cod)                                      as cod,
    count(*)            filter (where not is_cod)                                  as bank
  from live
),

-- The six windows share a shape, so build them once and merge the object in.
wins as (
  select jsonb_object_agg(
           k,
           jsonb_build_object(
             'revenue', r,
             'orders', n,
             'aov', case when n > 0 then round(r::numeric / n)::int else 0 end
           )
         ) as j
  from (
    select 'today'     as k, w.r_today as r, w.o_today as n from win w
    union all select 'yesterday', w.r_yest, w.o_yest        from win w
    union all select 'last7',     w.r_7,    w.o_7           from win w
    union all select 'prev7',     w.r_p7,   w.o_p7          from win w
    union all select 'last30',    w.r_30,   w.o_30          from win w
    union all select 'all',       w.r_all,  w.o_all         from win w
  ) t
),

cancel as (
  select count(*) as n from o where status = 'cancelled'
),

-- picked_up / delivering / out_for_delivery all read as "with rider" to the
-- shop; delivered is the TS-only alias for completed.
pipe as (
  select
    case
      when status in ('picked_up', 'delivering', 'out_for_delivery') then 'with_rider'
      when status = 'delivered' then 'completed'
      else status
    end   as bucket,
    count(*) as n
  from live
  group by 1
),
pipeline as (
  select jsonb_agg(
           jsonb_build_object('status', p.status, 'label', p.label, 'count', coalesce(x.n, 0))
           order by p.ord
         ) as j
  from (values
    (1, 'pending',    'Pending'),
    (2, 'preparing',  'Preparing'),
    (3, 'ready',      'Ready'),
    (4, 'with_rider', 'With rider'),
    (5, 'completed',  'Delivered')
  ) as p(ord, status, label)
  left join pipe x on x.bucket = p.status
),

days as (
  select (b.today - g)::date as dkey
  from b, generate_series(0, 13) as g
),
daily as (
  select jsonb_agg(
           jsonb_build_object(
             'date',    to_char(d.dkey, 'YYYY-MM-DD'),
             'revenue', coalesce(x.revenue, 0),
             'orders',  coalesce(x.orders, 0)
           ) order by d.dkey
         ) as j
  from days d
  left join (
    select dkey, sum(total) as revenue, count(*) as orders
    from live group by dkey
  ) x on x.dkey = d.dkey
),

hourly as (
  select jsonb_agg(coalesce(x.n, 0) order by h.h) as j
  from generate_series(0, 23) as h(h)
  left join (select hr, count(*) as n from live group by hr) x on x.hr = h.h
),

sold as (
  select
    oi.name_snapshot                        as name,
    sum(coalesce(oi.quantity, 0))::bigint   as units,
    sum(coalesce(oi.line_total, 0))::bigint as revenue
  from public.order_items oi
  join live l on l.id = oi.order_id
  group by oi.name_snapshot
),
menu as (
  select i.id::text as id, i.name, i.category, i.price, i.is_available
  from public.items i
),
plist as (
  select
    m.id, m.name, m.category, m.price, m.is_available,
    coalesce(s.units, 0)   as units,
    coalesce(s.revenue, 0) as revenue
  from menu m
  left join sold s on s.name = m.name
  union all
  select null::text, s.name, null::text, null::int, null::boolean, s.units, s.revenue
  from sold s
  where not exists (select 1 from menu m where m.name = s.name)
),
products as (
  select
    (select count(*) from menu)                                     as total,
    (select count(*) from menu where is_available is not false)     as available,
    (select count(*) from menu where is_available is false)         as unavailable,
    (select count(distinct category) from menu
      where nullif(btrim(category), '') is not null)                as categories,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', p.id, 'name', p.name, 'category', p.category,
                 'price', p.price, 'is_available', p.is_available,
                 'units', p.units, 'revenue', p.revenue
               ) order by p.revenue desc, p.units desc, p.name
             )
      from plist p
    ), '[]'::jsonb)                                                 as list
),

cust as (
  select
    l.customer_phone                                                          as phone,
    coalesce((array_agg(l.customer_name order by l.placed_at desc, l.id))[1],
             'Guest')                                                         as name,
    count(*)::int                                                             as orders,
    sum(l.total)::bigint                                                      as spent,
    max(l.placed_at)                                                          as last_order,
    min(l.placed_at)                                                          as first_order,
    (
      bool_or(l.user_id is not null)
      or exists (
           select 1 from public.profiles p
           where nullif(btrim(coalesce(p.phone, '')), '') = l.customer_phone
         )
    )                                                                         as is_registered
  from live l
  where l.customer_phone is not null
  group by l.customer_phone
),
customers_agg as (
  select
    count(*)::int                                        as total,
    (count(*) filter (where orders > 1))::int            as repeat_n,
    (count(*) filter (where is_registered))::int         as registered,
    (count(*) filter (
      where (first_order at time zone 'Asia/Karachi')::date = (select today from b)
    ))::int                                              as new_today,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'name', name, 'phone', phone, 'orders', orders, 'spent', spent,
        'last_order',  to_char(last_order  at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'first_order', to_char(first_order at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'is_registered', is_registered
      ) order by spent desc, name
    ), '[]'::jsonb)                                      as list
  from cust
)

select
  wins.j
  || jsonb_build_object(
       'generated_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       'cancelled',    cancel.n,
       'daily',        coalesce(daily.j,    '[]'::jsonb),
       'hourly',       coalesce(hourly.j,   '[]'::jsonb),
       'pipeline',     coalesce(pipeline.j, '[]'::jsonb),
       'fulfilment',   jsonb_build_object('delivery', win.delivery, 'pickup', win.pickup),
       'payment',      jsonb_build_object('cod', win.cod, 'bank', win.bank),
       'products',     jsonb_build_object(
                         'total', products.total,
                         'available', products.available,
                         'unavailable', products.unavailable,
                         'categories', products.categories,
                         'list', products.list
                       ),
       'customers',    jsonb_build_object(
                         'total', ca.total,
                         'repeat', ca.repeat_n,
                         'registered', ca.registered,
                         'new_today', ca.new_today,
                         'list', ca.list
                       )
     )
from wins, win, cancel, daily, hourly, pipeline, products, customers_agg ca;
$fn$;

comment on function public.admin_dashboard_stats() is
  'Admin dashboard aggregates as one JSONB, shaped like the AdminStats type in '
  'src/lib/admin-stats.ts. Service-role only.';

-- The browser must never be able to call this.
revoke all on function public.admin_dashboard_stats() from public;
revoke all on function public.admin_dashboard_stats() from anon;
revoke all on function public.admin_dashboard_stats() from authenticated;
grant execute on function public.admin_dashboard_stats() to service_role;

-- Make PostgREST notice the new function immediately instead of on its next
-- schema poll.
notify pgrst, 'reload schema';


-- ===========================================================================
-- 3. OPTIONAL — a real customers table
--
-- Not needed by anything shipped. Right now a "customer" is derived by grouping
-- orders on customer_phone, which is complete (guests included) but cannot hold
-- anything the customer did not type into an order: loyalty balance, saved
-- addresses, marketing consent, notes. If you want those, uncomment this and
-- the dashboard's Customers section can later read the table directly.
--
-- The trigger keeps it in sync from orders, so it backfills itself as orders
-- come in; the INSERT ... SELECT seeds it from history.
-- ===========================================================================

-- create table if not exists public.customers (
--   phone            text primary key,
--   name             text,
--   user_id          uuid references auth.users (id) on delete set null,
--   loyalty_points   integer not null default 0,
--   marketing_opt_in boolean not null default false,
--   internal_note    text,
--   first_order_at   timestamptz,
--   last_order_at    timestamptz,
--   created_at       timestamptz not null default now(),
--   updated_at       timestamptz not null default now()
-- );
--
-- alter table public.customers enable row level security;
--
-- -- Customers are shop data: no browser role gets in, only the service-role key.
-- drop policy if exists "customers are service role only" on public.customers;
--
-- create or replace function public.sync_customer_from_order()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = public, pg_temp
-- as $trg$
-- begin
--   if nullif(btrim(coalesce(new.customer_phone, '')), '') is null then
--     return new;
--   end if;
--
--   insert into public.customers (phone, name, user_id, first_order_at, last_order_at)
--   values (
--     btrim(new.customer_phone),
--     nullif(btrim(coalesce(new.customer_name, '')), ''),
--     new.user_id,
--     new.placed_at,
--     new.placed_at
--   )
--   on conflict (phone) do update set
--     name          = coalesce(excluded.name, public.customers.name),
--     user_id       = coalesce(excluded.user_id, public.customers.user_id),
--     last_order_at = greatest(public.customers.last_order_at, excluded.last_order_at),
--     updated_at    = now();
--
--   return new;
-- end;
-- $trg$;
--
-- drop trigger if exists orders_sync_customer on public.orders;
-- create trigger orders_sync_customer
--   after insert on public.orders
--   for each row execute function public.sync_customer_from_order();
--
-- -- Seed from existing history.
-- insert into public.customers (phone, name, user_id, first_order_at, last_order_at)
-- select
--   btrim(o.customer_phone),
--   (array_agg(nullif(btrim(coalesce(o.customer_name, '')), '')
--              order by o.placed_at desc))[1],
--   (array_agg(o.user_id) filter (where o.user_id is not null))[1],
--   min(o.placed_at),
--   max(o.placed_at)
-- from public.orders o
-- where nullif(btrim(coalesce(o.customer_phone, '')), '') is not null
-- group by btrim(o.customer_phone)
-- on conflict (phone) do nothing;


-- ===========================================================================
-- 4. UNRELATED, STILL OPEN — orders RLS is wide open
--
-- Not touched by the dashboard work; included because it keeps coming up. On
-- public.orders the policies orders_auth_read, orders_auth_update and
-- orders_auth_delete are all USING (true) for the authenticated role, and
-- order_items_auth_all is ALL ... USING (true). So any logged-in customer, with
-- nothing but the public anon key that ships in the browser bundle, can read,
-- modify and delete every order in the table — other people's names, phone
-- numbers, addresses and totals included.
--
-- The admin and rider screens are unaffected either way: they go through the
-- service-role key, which bypasses RLS entirely.
--
-- READ BEFORE RUNNING. This changes who can do what. Confirm the policy names
-- against your database first, since they may have moved on:
--   select policyname, cmd, roles, qual from pg_policies
--   where tablename in ('orders', 'order_items');
-- ===========================================================================

-- alter table public.orders      enable row level security;
-- alter table public.order_items enable row level security;
--
-- drop policy if exists orders_auth_read       on public.orders;
-- drop policy if exists orders_auth_update     on public.orders;
-- drop policy if exists orders_auth_delete     on public.orders;
-- drop policy if exists order_items_auth_all   on public.order_items;
--
-- -- A customer sees only their own orders.
-- create policy orders_read_own on public.orders
--   for select to authenticated
--   using (user_id = auth.uid());
--
-- -- Guest checkout still has to be able to create an order.
-- create policy orders_insert_any on public.orders
--   for insert to anon, authenticated
--   with check (true);
--
-- -- Line items follow their parent order.
-- create policy order_items_read_own on public.order_items
--   for select to authenticated
--   using (exists (
--     select 1 from public.orders o
--     where o.id = order_items.order_id and o.user_id = auth.uid()
--   ));
--
-- create policy order_items_insert_any on public.order_items
--   for insert to anon, authenticated
--   with check (true);
--
-- -- Deliberately no update or delete policy for anon/authenticated: status
-- -- changes go through PATCH /api/orders/[id] and deletes through
-- -- DELETE /api/admin/orders, both server-side on the service-role key.
--
-- -- NOTE: this tightens what a browser session can SELECT, which also narrows
-- -- what Realtime will deliver to it. Check the customer order-tracking screen
-- -- and the rider dashboard after running — a filtered subscription that used to
-- -- work because of USING (true) will stop receiving events.
