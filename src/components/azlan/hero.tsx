"use client";

import Image from "next/image";
import Link from "next/link";
import type { Settings } from "@/lib/supabase/database.types";
import { useStoreStatus } from "@/hooks/use-store-status";
import { formatCountdown } from "@/lib/store-hours";

/**
 * The hero.
 *
 * What changed and why:
 *
 * - It no longer runs its own `settings` realtime channel and 15-second
 *   interval, and no longer writes store status into state from an effect (a
 *   React 19 error in this project). The shared hook does that once per page.
 * - Mobile-first type scale. The old `text-4xl` headline plus a `text-xl`
 *   subtitle plus a paragraph plus a features row pushed the CTA and the food
 *   photography below the fold on a 375px screen — the two things that actually
 *   sell. The copy is tighter and the button sits above the fold.
 * - Two CTAs instead of one dead end. "Order Now" scrolls to the menu; when the
 *   shop is closed the secondary CTA is a WhatsApp link, so a visitor who cannot
 *   order right now leaves a message instead of leaving. That is the retention
 *   the brief asked for — an exit popup would annoy far more than it converts.
 * - The trust row shows real values from `settings` rather than three slogans.
 */
export function Hero({ settings }: { settings: Settings | null }) {
  const status = useStoreStatus();
  const isOpen = status.isOpen;

  const deliveryFee = settings?.delivery_fee ?? 0;
  const minOrder = settings?.min_order_value ?? 0;

  const trust = [
    { icon: "schedule", label: status.operatingHoursText, sub: "Delivery hours" },
    {
      icon: "local_shipping",
      label: deliveryFee > 0 ? `Rs. ${deliveryFee}` : "Affordable",
      sub: "Delivery Fee",
    },
    {
      icon: "payments",
      label: minOrder > 0 ? `Rs. ${minOrder} min` : "Cash on delivery",
      sub: minOrder > 0 ? "Minimum order" : "Pay at your door",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#072413] text-white">
      {/* Ambient background glows. Fewer and cheaper than before — three large
          blurred circles on a phone were costing a visible chunk of first paint. */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[280px] w-[280px] transform-gpu rounded-full bg-[#5BE193] opacity-15 blur-3xl sm:h-[500px] sm:w-[500px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/4 hidden h-[520px] w-[520px] transform-gpu rounded-full bg-[#003816] opacity-40 blur-[100px] sm:block" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(91,225,147,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20 lg:pt-14">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-6">
          {/* ------------------------------------------------ copy + actions */}
          <div className="z-10 lg:col-span-7">
            {/* Status pill — one line at every width */}
            <div
              className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold backdrop-blur-md sm:text-xs ${isOpen
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                : "border-amber-400/50 bg-amber-500/15 text-amber-300"
                }`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                {isOpen && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${isOpen ? "bg-emerald-400" : "bg-amber-500"
                    }`}
                />
              </span>
              <span className="truncate">
                {isOpen
                  ? "Open now — delivering in Malir"
                  : status.reason === "temporary_closure"
                    ? "Maintenance Shutdown — reopening Oct 12"
                    : status.mode === "force_closed"
                      ? "Orders paused — back shortly"
                      : `Closed — opens in ${formatCountdown(status.minutesUntilOpen)}`}
              </span>
            </div>

            <h1 className="mt-5 text-[2rem] font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="block text-white">Hot. Crispy.</span>
              <span className="mt-1 block text-[#5BE193]">Delivered Fresh.</span>
            </h1>

            <p className="mt-3 text-sm font-bold tracking-wide text-white/85 sm:mt-4 sm:text-lg lg:text-xl">
              Zinger Burgers
              <span className="mx-1.5 text-[#5BE193]">•</span>Cheesy Pizzas
              <span className="mx-1.5 text-[#5BE193]">•</span>Charcoal BBQ
            </p>

            <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/65 sm:text-sm">
              Every order made to order with fresh ingredients and sent out piping
              hot — straight to your door in Malir.
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link
                href="/#menu"
                className="btn-shine group inline-flex transform-gpu items-center justify-center gap-2 rounded-full bg-[#FFC700] px-7 py-3.5 text-sm font-black text-[#072413] shadow-[0_10px_30px_rgba(255,199,0,0.28)] transition-all hover:bg-[#ffe066] active:scale-95 sm:text-base"
              >
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-12">
                  restaurant_menu
                </span>
                {isOpen ? "Order Now" : "See the Menu"}
              </Link>
            </div>

            {/* Trust row — real numbers, not slogans */}
            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 sm:mt-10 sm:gap-6 sm:pt-6">
              {trust.map((fact) => (
                <div key={fact.icon} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 sm:text-[11px]">
                    <span className="material-symbols-outlined text-[15px] text-[#5BE193]">
                      {fact.icon}
                    </span>
                    <span className="truncate">{fact.sub}</span>
                  </dt>
                  <dd className="mt-0.5 truncate text-xs font-black text-white sm:text-sm">
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ------------------------------------------------------- artwork */}
          <div className="relative mt-2 flex items-center justify-center lg:col-span-5 lg:mt-0 lg:justify-end">
            <div className="relative h-[260px] w-full max-w-[540px] sm:h-[420px] lg:h-[500px]">
              {/* Primary LCP image */}
              <div
                className="group absolute left-0 top-0 z-20 h-[92%] w-[62%] transform-gpu overflow-hidden rounded-3xl border-2 border-[#FFC700]/70 shadow-2xl transition-all duration-300 hover:z-30 hover:scale-[1.03]"
                style={{ clipPath: "polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)" }}
              >
                <div className="relative h-full w-full bg-[#00230c]">
                  <Image
                    src="/images/hero-burger.webp"
                    alt="Hot and crispy Zinger burger"
                    fill
                    priority
                    fetchPriority="high"
                    sizes="(max-width: 640px) 62vw, (max-width: 1024px) 40vw, 360px"
                    className="transform-gpu object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </div>

              <div
                className="group absolute bottom-0 right-0 z-10 h-[92%] w-[60%] transform-gpu overflow-hidden rounded-3xl border-2 border-[#5BE193]/60 shadow-2xl transition-all duration-300 hover:z-30 hover:scale-[1.03]"
                style={{ clipPath: "polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)" }}
              >
                <div className="relative h-full w-full bg-[#00230c]">
                  <Image
                    src="/images/pizza.webp"
                    alt="Freshly baked cheesy pizza"
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 60vw, (max-width: 1024px) 40vw, 340px"
                    className="transform-gpu object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </div>

              {/* Decorative accent — desktop only, it just crowds a phone */}
              <div className="absolute bottom-0 left-[20%] z-20 hidden h-28 w-28 transform-gpu -rotate-12 overflow-hidden rounded-2xl border border-white/20 shadow-xl transition-transform duration-300 hover:rotate-0 sm:block">
                <Image
                  src="/images/fries.webp"
                  alt="Golden crispy fries"
                  fill
                  loading="lazy"
                  sizes="112px"
                  className="object-cover"
                />
              </div>

              <div className="pointer-events-none absolute inset-0 z-0 transform-gpu scale-90 rounded-full bg-gradient-to-r from-[#FFC700]/20 to-[#5BE193]/20 blur-xl sm:blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
