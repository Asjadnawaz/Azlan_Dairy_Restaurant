"use client";

import type { Settings } from "@/lib/supabase/database.types";

// Check if current time (Karachi UTC+5) is within restaurant hours: 7 PM – 3 AM
function isWithinBusinessHours(): boolean {
  const now = new Date();
  const karachi = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const hour = karachi.getHours();
  return hour >= 19 || hour < 3;
}

export function Hero({ settings }: { settings: Settings | null }) {
  const isTimeBasedOpen = isWithinBusinessHours();
  const isKillSwitchActive = settings?.is_active ?? true;
  const isOpen = isKillSwitchActive && isTimeBasedOpen;

  return (
    <section className="hero-section text-white flex items-center">
      {/* Background image */}
      <div className="hero-bg-image" />

      {/* Layered dark gradient for deep, rich contrast */}
      <div className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(160deg, rgba(0,35,12,0.88) 0%, rgba(0,35,12,0.65) 50%, rgba(117,76,152,0.45) 100%)",
        }}
      />

      {/* Ambient glow blobs */}
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />

      {/* Floating particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="hero-particle"
          style={{
            width: `${4 + (i % 3) * 3}px`,
            height: `${4 + (i % 3) * 3}px`,
            left: `${(i * 7.14) % 100}%`,
            bottom: `-20px`,
            background:
              i % 2 === 0
                ? "var(--color-mint-accent)"
                : "rgba(255,255,255,0.4)",
            animationDuration: `${7 + (i % 8)}s`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-4xl w-full px-4 md:px-8 py-24 md:py-40 flex flex-col items-center text-center gap-6">

        {/* ── OPEN / CLOSED STATUS BANNER ── */}
        <div
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-extrabold text-base sm:text-lg backdrop-blur-sm shadow-lg ${
            isOpen
              ? "bg-green-500/20 border-2 border-green-400/60 text-green-300"
              : "bg-red-600/20 border-2 border-red-400/60 text-red-300"
          }`}
        >
          {/* Pulsing dot */}
          <span className="relative flex h-4 w-4 shrink-0">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOpen ? "bg-green-400 animate-ping" : "bg-red-400"
              }`}
            />
            <span
              className={`relative inline-flex h-4 w-4 rounded-full ${
                isOpen ? "bg-green-400" : "bg-red-500"
              }`}
            />
          </span>

          {isOpen ? (
            <>
              <span className="material-symbols-outlined text-[22px] text-green-400">
                storefront
              </span>
              We&apos;re Open — Order Now!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[22px] text-red-400">
                store
              </span>
              We&apos;re Currently Closed
            </>
          )}
        </div>


        {/* Eyebrow tag */}
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[var(--color-mint-accent)]">
          🍔 Malir&apos;s Favourite Fast Food Destination
        </p>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight-hero leading-[1.05]">
          <span className="text-white">Hot. Crispy.</span>
          <br />
          <span className="shimmer-text">Delivered Fresh.</span>
        </h1>

        {/* Supporting line */}
        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-white/90">
          Zinger Burgers &nbsp;·&nbsp; Cheesy Pizzas &nbsp;·&nbsp; Loaded Rolls
        </p>

        {/* Sub-copy */}
        <p className="max-w-xl text-sm sm:text-base text-white/65 leading-relaxed">
          Craving something crispy and bold? We craft every order with premium
          fresh ingredients and deliver it piping hot — right to your door in Malir.
        </p>

        {/* CTA */}
        <a
          href="#menu"
          className="mt-2 inline-flex items-center gap-2 px-8 py-4 rounded-full font-extrabold text-base sm:text-lg transition-all duration-200 hover:brightness-110 hover:-translate-y-1 custom-shadow-lg"
          style={{
            background: "var(--color-cta-yellow)",
            color: "var(--color-primary)",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            local_pizza
          </span>
          Explore Full Menu
        </a>

        {/* Divider */}
        <div className="w-16 h-px bg-[var(--color-mint-accent)]/40 mt-2" />

        {/* Trust badges */}
        <ul className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          {[
            { icon: "lunch_dining", text: "100% Fresh Ingredients"    },
            { icon: "bolt",         text: "Fast Delivery · Malir Only" },
            { icon: "map",          text: "Live Order Tracking"         },
          ].map(({ icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-medium"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ color: "var(--color-mint-accent)" }}
              >
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/30 animate-bounce-y">
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </div>
    </section>
  );
}
