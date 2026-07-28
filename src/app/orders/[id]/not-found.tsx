import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <span className="material-symbols-outlined text-[64px] text-[var(--color-on-surface-variant)]/40">
          search_off
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-[var(--color-primary)]">
          Order Not Found
        </h1>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          We couldn&apos;t find this order. It may have been removed or the link is
          incorrect.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/orders"
            className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
          >
            My Orders
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface)] font-bold text-sm hover:bg-[var(--color-surface-container-highest)] transition-colors"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
