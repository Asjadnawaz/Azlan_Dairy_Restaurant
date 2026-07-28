"use client";

import type { Settings } from "@/lib/supabase/database.types";
import { useMemo } from "react";

// Check if current time (Karachi UTC+5) is within restaurant hours: 7 PM - 3 AM
function isWithinBusinessHours(): boolean {
  const now = new Date();
  const karachi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  const hour = karachi.getHours();
  // 7 PM (19) to midnight (23) = same day
  // Midnight (0) to 3 AM = same day (after midnight)
  return hour >= 19 || hour < 3;
}

export function Hero({ settings }: { settings: Settings | null }) {
  // Open if both: kill-switch is active AND current time is within business hours
  const isTimeBasedOpen = isWithinBusinessHours();
  const isKillSwitchActive = settings?.is_active ?? true;
  const isOpen = isKillSwitchActive && isTimeBasedOpen;

  return (
    <section className="hero-section bg-[var(--color-primary)] text-white flex items-center">
      <div className="hero-bg-image" />
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
            background: i % 2 === 0 ? "var(--color-mint-accent)" : "rgba(255,255,255,0.7)",
            animationDuration: `${7 + (i % 8)}s`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 py-20 md:py-32 w-full">
        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-sm ring-1
            ${isOpen
              ? "bg-white/10 text-[var(--color-mint-accent)] ring-white/20"
              : "bg-[var(--color-error)]/20 text-red-200 ring-red-400/30"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isOpen ? "bg-[var(--color-mint-accent)] animate-pulse" : "bg-red-400"}`}
          />
          {isOpen ? "Open Now" : "Currently Closed"} · {settings?.hours ?? "7:00 PM – 3:00 AM"}
        </span>

        {/* Headline */}
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight-hero leading-[1.05]">
          <span className="text-[var(--color-mint-accent)]">Azlan Dairy</span>
          <br />
          <span className="text-white">Restaurant</span>
        </h1>

        {/* Subhead */}
        <p className="mt-5 max-w-xl text-base md:text-lg text-white/80 leading-relaxed">
          100% Pure, Fresh & Organic Dairy from our own farm. Char-grilled BBQ, crispy broast, juicy burgers & more —
          delivered hot to your doorstep.
        </p>

        {/* Malir Delivery Notice */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-secondary-brand)]/20 backdrop-blur-sm border border-[var(--color-secondary-brand)]/30">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-mint-accent)]">location_on</span>
          <span className="text-sm font-semibold text-white">We Deliver Exclusively in Malir</span>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#menu"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-secondary-brand)] text-white
              font-bold hover:bg-[var(--color-secondary-brand)]/90 transition-all custom-shadow"
          >
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            Explore Our Menu
          </a>
        </div>

      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 animate-bounce-y">
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </div>
    </section>
  );
}
