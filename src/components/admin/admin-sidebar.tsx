"use client";

/**
 * The admin sidebar.
 *
 * Three shapes from one component: a 240px labelled rail at `xl`, a 72px icon
 * rail at `lg` (collapse choice remembered), and an off-canvas drawer below that.
 * The drawer is a plain fixed panel rather than a portal so it stays inside the
 * admin layout's stacking context and can never end up above the receipt print
 * portal.
 */

export type AdminSection =
  | "overview"
  | "orders"
  | "sales"
  | "products"
  | "prices"
  | "customers";

export const SECTIONS: { key: AdminSection; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "dashboard" },
  { key: "orders", label: "Orders", icon: "receipt_long" },
  { key: "sales", label: "Sales", icon: "trending_up" },
  { key: "products", label: "Products", icon: "restaurant_menu" },
  { key: "prices", label: "Price Manager", icon: "sell" },
  { key: "customers", label: "Customers", icon: "groups" },
];

export function isAdminSection(value: string): value is AdminSection {
  return SECTIONS.some((s) => s.key === value);
}

function NavList({
  active,
  onSelect,
  pendingCount,
  showLabels,
}: {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
  pendingCount: number;
  showLabels: boolean;
}) {
  return (
    <nav className="flex-1 px-2 py-3 space-y-1" aria-label="Admin sections">
      {SECTIONS.map((s) => {
        const isActive = active === s.key;
        const badge = s.key === "orders" && pendingCount > 0 ? pendingCount : null;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            aria-current={isActive ? "page" : undefined}
            title={showLabels ? undefined : s.label}
            className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
              showLabels ? "" : "justify-center"
            } ${
              isActive
                ? "bg-white/12 text-white"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">
              {s.icon}
            </span>
            {showLabels && <span className="truncate">{s.label}</span>}
            {badge !== null && (
              <span
                className={`tabular-nums text-[10px] font-extrabold rounded-md bg-[var(--color-cta-yellow)] text-[#3a2b00] px-1.5 py-0.5 ${
                  showLabels ? "ml-auto" : "absolute top-1 right-1"
                }`}
              >
                {badge}
                {!showLabels && <span className="sr-only"> pending orders</span>}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  active,
  onSelect,
  pendingCount,
  showLabels,
  userEmail,
  signOutButton,
  collapseControl,
}: {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
  pendingCount: number;
  showLabels: boolean;
  userEmail?: string;
  signOutButton?: React.ReactNode;
  collapseControl?: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`flex items-center gap-2.5 px-4 py-4 border-b border-white/10 ${
          showLabels ? "" : "justify-center px-2"
        }`}
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-[var(--color-cta-yellow)] text-[#3a2b00] flex items-center justify-center font-black">
          <span className="material-symbols-outlined text-[20px]">storefront</span>
        </span>
        {showLabels && (
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white leading-tight truncate">
              Azlan Dairy
            </p>
            <p className="text-[11px] text-white/60 font-semibold">Admin</p>
          </div>
        )}
        {showLabels && collapseControl}
      </div>

      <NavList
        active={active}
        onSelect={onSelect}
        pendingCount={pendingCount}
        showLabels={showLabels}
      />

      <div className={`border-t border-white/10 p-3 space-y-2 ${showLabels ? "" : "px-2"}`}>
        {showLabels && userEmail && (
          <p className="text-[11px] text-white/60 font-semibold truncate px-1" title={userEmail}>
            {userEmail}
          </p>
        )}
        {!showLabels && collapseControl}
        {signOutButton}
      </div>
    </>
  );
}

export function AdminSidebar({
  active,
  onSelect,
  pendingCount,
  userEmail,
  signOutButton,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
  pendingCount: number;
  userEmail?: string;
  signOutButton?: React.ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const collapseControl = (
    <button
      type="button"
      onClick={onToggleCollapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="w-8 h-8 shrink-0 rounded-lg text-white/70 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-auto"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        {collapsed ? "chevron_right" : "chevron_left"}
      </span>
    </button>
  );

  return (
    <>
      {/* lg+ static rail */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[var(--color-primary)] transition-[width] duration-200 ${
          collapsed ? "w-[72px]" : "w-60"
        }`}
      >
        <div className="sticky top-0 h-dvh flex flex-col">
          <SidebarBody
            active={active}
            onSelect={onSelect}
            pendingCount={pendingCount}
            showLabels={!collapsed}
            userEmail={userEmail}
            signOutButton={signOutButton}
            collapseControl={collapseControl}
          />
        </div>
      </aside>

      {/* below lg: drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[400] flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/50 animate-fade-in cursor-default"
          />
          <div className="relative w-64 max-w-[82vw] h-dvh bg-[var(--color-primary)] flex flex-col shadow-2xl animate-fade-in">
            <SidebarBody
              active={active}
              onSelect={(s) => {
                onSelect(s);
                onCloseMobile();
              }}
              pendingCount={pendingCount}
              showLabels
              userEmail={userEmail}
              signOutButton={signOutButton}
            />
          </div>
        </div>
      )}
    </>
  );
}
