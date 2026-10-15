"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { formatRupees } from "@/lib/cart-pricing";

/**
 * The persistent bottom-right stack.
 *
 * The cart button appears when the cart is non-empty (except on the cart page itself)
 * and carries the count and the running subtotal so there is always a visible
 * way back to checkout. Back-to-top keeps its scroll condition.
 */
export function FloatingButtons() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const totalItems = useCart((s) => s.totalItems());
  const totalPrice = useCart((s) => s.totalPrice());
  const hasHydrated = useCart((s) => s._hasHydrated);

  const isCartPage = Boolean(pathname?.startsWith("/cart"));

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const next = window.scrollY > 500;
        setScrolled((prev) => (prev !== next ? next : prev));
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasItems = hasHydrated && totalItems > 0 && !isCartPage;

  return (
    <div
      className="fixed right-4 sm:right-6 z-40 flex flex-col items-end gap-3"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {/* Back to top — desktop only, and only once there is something to go back up from */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`w-11 h-11 rounded-full bg-white custom-shadow items-center justify-center
          text-[var(--color-primary)] transition-all duration-300 hover:scale-110 hidden md:flex
          ${scrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
        aria-label="Back to top"
        aria-hidden={!scrolled}
        tabIndex={scrolled ? 0 : -1}
      >
        <span className="material-symbols-outlined text-[22px]">keyboard_arrow_up</span>
      </button>

      {/* View cart — visible whenever the cart has something in it */}
      <Link
        href="/cart"
        aria-hidden={!hasItems}
        tabIndex={hasItems ? 0 : -1}
        className={`group flex items-center gap-2.5 rounded-full bg-[var(--color-primary)] text-white
          pl-4 pr-5 py-3 custom-shadow-lg font-extrabold transition-all duration-300
          active:scale-95 hover:brightness-110
          ${hasItems ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90 pointer-events-none"}`}
      >
        <span className="relative flex items-center">
          <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
          <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFC700] text-[#00230C] text-[11px] font-black px-1">
            {totalItems}
          </span>
        </span>
        <span className="flex flex-col leading-tight text-left">
          <span className="text-[13px] sm:text-sm">View Cart</span>
          <span className="text-[11px] font-bold text-white/80">
            {formatRupees(totalPrice)}
          </span>
        </span>
        <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">
          arrow_forward
        </span>
      </Link>
    </div>
  );
}
