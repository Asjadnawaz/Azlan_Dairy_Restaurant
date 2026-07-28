"use client";

export function StoreClosedBanner({ isActive }: { isActive: boolean }) {
  if (isActive) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2
                 bg-error/10 text-error px-4 py-2.5 text-sm font-semibold backdrop-blur-sm
                 animate-fade-in border-b border-error/20"
      role="alert"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        storefront
      </span>
      <span>
        We&apos;re currently closed for online orders. Please try again later.
      </span>
    </div>
  );
}
