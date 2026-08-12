"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function FloatingButtons() {
  const [show, setShow] = useState(false);
  const totalItems = useCart((s) => s.totalItems());
  const hasHydrated = useCart((s) => s._hasHydrated);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isShow = window.scrollY > 500;
          setShow((prev) => (prev !== isShow ? isShow : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col gap-3 items-end transition-all duration-300 transform-gpu ${
        show
          ? "opacity-100 scale-100 translate-y-0 visible"
          : "opacity-0 scale-0 translate-y-12 pointer-events-none invisible"
      }`}
    >
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-11 h-11 rounded-full bg-[var(--color-surface-container-lowest)] custom-shadow
          flex items-center justify-center text-[var(--color-primary)]
          transition-all hover:scale-110 hidden md:flex"
        aria-label="Back to top"
      >
        <span className="material-symbols-outlined text-[22px]">keyboard_arrow_up</span>
      </button>

      {/* Cart button */}
      <Link
        href="/cart"
        className="relative w-14 h-14 rounded-full bg-[var(--color-primary)] text-white
          custom-shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="View cart"
      >
        <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
        {hasHydrated && totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-secondary-brand)] text-xs font-bold px-1.5">
            {totalItems}
          </span>
        )}
      </Link>
    </div>
  );
}
