"use client";

/**
 * The admin shell: sidebar, top bar, and the section router.
 *
 * Sections switch on `location.hash`, so `/admin/orders` stays the only admin
 * route. That keeps the five existing links to it working untouched, makes
 * switching instant with no server round-trip, and — the reason that matters —
 * never tears down the realtime channel, so a new order still lands the moment
 * it is placed no matter which section is open. Assigning `location.hash` also
 * pushes a history entry, so browser back/forward move between sections for free.
 *
 * Everything except Orders is `next/dynamic`, so first paint ships the orders
 * list and nothing else.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { Order, OrderItem, Rider } from "@/lib/supabase/database.types";
import type { AdminStats } from "@/lib/admin-stats";
import type { StoreOpenMode } from "@/lib/store-hours";
import { StoreToggle } from "./store-toggle";
import { AdminSidebar, SECTIONS, isAdminSection, type AdminSection } from "./admin-sidebar";
import { OrdersSection, type OrderFilter } from "./orders-section";
import { OverviewSection } from "./overview-section";

const SectionLoader = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading section">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] animate-pulse"
        />
      ))}
    </div>
    <div className="h-64 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] animate-pulse" />
  </div>
);

const SalesSection = dynamic(() => import("./sales-section").then((m) => m.SalesSection), {
  loading: SectionLoader,
});
const ProductsSection = dynamic(
  () => import("./products-section").then((m) => m.ProductsSection),
  { loading: SectionLoader }
);
const CustomersSection = dynamic(
  () => import("./customers-section").then((m) => m.CustomersSection),
  { loading: SectionLoader }
);
const PriceManager = dynamic(() => import("./price-manager").then((m) => m.PriceManager), {
  loading: SectionLoader,
});

const COLLAPSE_KEY = "azlan-admin-sidebar-collapsed";

/**
 * The collapse choice lives in localStorage, which is an external store — reading
 * it through `useSyncExternalStore` keeps the server render (always expanded) and
 * the client render consistent without a setState-in-effect cascade, and syncs a
 * second admin tab for free.
 */
const collapseListeners = new Set<() => void>();

function subscribeCollapse(onChange: () => void) {
  collapseListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    collapseListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCollapse() {
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

function writeCollapse(next: boolean) {
  window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  for (const listener of collapseListeners) listener();
}

export function AdminShell({
  orders,
  itemsByOrder,
  riders,
  stats,
  loadingStats,
  statsNote,
  onRefreshStats,
  storeMode,
  storeIsOpen,
  storeHoursText,
  forceOpenExpiresInMs,
  onStoreModeChange,
  userEmail,
  signOutButton,
  onPrint,
  onClearAll,
  clearing,
}: {
  orders: Order[];
  itemsByOrder: Map<string, OrderItem[]>;
  riders: Rider[];
  stats: AdminStats | null;
  loadingStats: boolean;
  /** Set when the aggregates are known to be partial. */
  statsNote?: string | null;
  onRefreshStats: () => void;
  storeMode: StoreOpenMode;
  /** What the mode plus the schedule actually add up to right now. */
  storeIsOpen: boolean;
  /** e.g. "7:00 PM – 4:00 AM", derived from the settings row. */
  storeHoursText: string;
  /** Grace left on a live force-open; null when there is none. */
  forceOpenExpiresInMs: number | null;
  onStoreModeChange: (mode: StoreOpenMode) => void;
  userEmail?: string;
  signOutButton?: React.ReactNode;
  onPrint: (order: Order, items: OrderItem[], width?: "80mm" | "58mm") => void;
  onClearAll: () => void;
  clearing?: boolean;
}) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapse, readCollapse, () => false);

  // Hash is read after mount — reading `window` during render would break
  // hydration, and a deep link only has to resolve once the page is interactive.
  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (isAdminSection(raw)) setSection(raw);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const go = useCallback((next: AdminSection) => {
    setSection(next);
    if (window.location.hash.replace(/^#/, "") !== next) {
      window.location.hash = next;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const toggleCollapsed = useCallback(() => {
    writeCollapse(!readCollapse());
  }, []);

  const jumpToOrders = useCallback(
    (nextFilter: OrderFilter) => {
      setFilter(nextFilter);
      go("orders");
    },
    [go]
  );

  const pendingCount = useMemo(
    () => orders.reduce((n, o) => (o.status === "pending" ? n + 1 : n), 0),
    [orders]
  );

  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0];

  return (
    <div className="min-h-dvh flex bg-[var(--color-background)]">
      <AdminSidebar
        active={section}
        onSelect={go}
        pendingCount={pendingCount}
        userEmail={userEmail}
        signOutButton={signOutButton}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={drawerOpen}
        onCloseMobile={() => setDrawerOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-[var(--color-surface-container-lowest)]/95 backdrop-blur border-b border-[var(--color-outline-variant)]">
          <div className="flex flex-wrap items-center gap-2 px-3 sm:px-5 py-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden w-9 h-9 shrink-0 rounded-xl border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] flex items-center justify-center hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                menu
              </span>
            </button>

            <div className="min-w-0 mr-auto">
              <h1 className="text-base sm:text-lg font-extrabold text-[var(--color-on-surface)] leading-tight truncate">
                {current.label}
              </h1>
              <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] hidden sm:flex items-center gap-1.5">
                {/* The toggle shows the chosen *mode*; this shows what that mode
                    plus the clock actually add up to — "Auto" alone doesn't tell
                    an admin at 5 PM whether the shop is taking orders. */}
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    storeIsOpen
                      ? "bg-[var(--color-success)]"
                      : "bg-[var(--color-error)]"
                  }`}
                  aria-hidden="true"
                />
                <span>{storeIsOpen ? "Taking orders" : "Not taking orders"}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {pendingCount > 0
                    ? `${pendingCount} order${pendingCount === 1 ? "" : "s"} waiting to be started`
                    : "No orders waiting"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshStats}
              disabled={loadingStats}
              aria-label="Refresh statistics"
              title="Refresh statistics"
              className="w-9 h-9 shrink-0 rounded-xl border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] flex items-center justify-center hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  loadingStats ? "animate-spin" : ""
                }`}
                aria-hidden="true"
              >
                refresh
              </span>
            </button>

            <StoreToggle
              mode={storeMode}
              forceOpenExpiresInMs={forceOpenExpiresInMs}
              hoursText={storeHoursText}
              onModeChange={onStoreModeChange}
            />
          </div>

          {/* Phone-sized shortcut row: every section is one tap, no drawer. */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar px-3 pb-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(s.key)}
                aria-current={section === s.key ? "page" : undefined}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  section === s.key
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface-container-lowest)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {s.icon}
                </span>
                {s.label === "Price Manager" ? "Prices" : s.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5 space-y-4">
          {statsNote && (
            <p className="flex items-start gap-2 rounded-xl border border-[#f2ce77] bg-[#fff6e0] px-3 py-2 text-[11px] font-bold text-[#7a4d00]">
              <span className="material-symbols-outlined text-[15px] shrink-0" aria-hidden="true">
                info
              </span>
              {statsNote}
            </p>
          )}

          {section === "overview" && (
            <OverviewSection
              stats={stats}
              loadingStats={loadingStats}
              orders={orders}
              itemsByOrder={itemsByOrder}
              riders={riders}
              onPrint={onPrint}
              onJumpToOrders={jumpToOrders}
            />
          )}

          {section === "orders" && (
            <OrdersSection
              orders={orders}
              itemsByOrder={itemsByOrder}
              riders={riders}
              filter={filter}
              onFilterChange={setFilter}
              onPrint={onPrint}
              onClearAll={onClearAll}
              clearing={clearing}
            />
          )}

          {section === "sales" && <SalesSection stats={stats} loadingStats={loadingStats} />}

          {section === "products" && (
            <ProductsSection
              stats={stats}
              loadingStats={loadingStats}
              onRefreshStats={onRefreshStats}
              onOpenPrices={() => go("prices")}
            />
          )}

          {section === "prices" && <PriceManager />}

          {section === "customers" && (
            <CustomersSection stats={stats} loadingStats={loadingStats} />
          )}
        </main>
      </div>
    </div>
  );
}
