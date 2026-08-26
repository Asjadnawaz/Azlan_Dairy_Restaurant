/**
 * Route skeleton for /admin/orders.
 *
 * Mirrors the shell's frame — dark rail, top bar, KPI row — so the layout does not
 * jump when the real dashboard swaps in.
 */
export default function AdminOrdersLoading() {
  return (
    <div className="min-h-dvh flex bg-[var(--color-background)]" aria-busy="true">
      <aside className="hidden lg:flex w-60 shrink-0 bg-[var(--color-primary)]">
        <div className="w-full p-4 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-white/15" />
          <div className="pt-4 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-white/8" />
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 sm:px-5 py-3 flex items-center gap-3">
          <div className="h-6 w-32 rounded-lg bg-[var(--color-surface-container)] animate-pulse" />
          <div className="ml-auto h-9 w-28 rounded-full bg-[var(--color-surface-container)] animate-pulse" />
        </header>

        <main className="p-3 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] animate-pulse"
              />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <div className="h-64 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] animate-pulse" />
            <div className="h-64 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] animate-pulse"
              />
            ))}
          </div>
          <p className="sr-only">Loading admin dashboard…</p>
        </main>
      </div>
    </div>
  );
}
