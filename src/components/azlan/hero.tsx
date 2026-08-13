"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/supabase/database.types";

export function Hero({ settings }: { settings: Settings | null }) {
  const [storeStatusOverride, setStoreStatusOverride] = useState<boolean | null>(null);

  const supabase = useMemo(() => createBrowserClient(), []);

  // Fetch current status directly from DB (fallback for initial load & cache staleness)
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("settings")
        .select("is_active")
        .eq("id", 1)
        .single();
      if (data && typeof data.is_active === "boolean") {
        setStoreStatusOverride(data.is_active);
      }
    } catch {
      // Silent fallback — keep last known state
    }
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await fetchStatus();
    })();

    const channel = supabase
      .channel("hero-store-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          const updated = payload.new as Settings;
          if (updated && typeof updated.is_active === "boolean") {
            setStoreStatusOverride(updated.is_active);
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchStatus, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchStatus, supabase]);

  const isOpen = storeStatusOverride ?? settings?.is_active ?? true;

  return (
    <section className="relative overflow-hidden bg-[#072413] text-white flex items-center pt-6 lg:pt-12 pb-16 lg:pb-20">
      {/* Ambient background glows (Optimized with GPU acceleration & lightweight mobile blurs) */}
      <div className="absolute -top-32 -left-32 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] rounded-full bg-[#5BE193] opacity-15 blur-2xl sm:blur-[120px] pointer-events-none transform-gpu" />
      <div className="absolute -bottom-32 left-1/3 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] rounded-full bg-[#FFC700] opacity-10 blur-2xl sm:blur-[140px] pointer-events-none transform-gpu hidden sm:block" />
      <div className="absolute top-1/4 right-0 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-[#003816] opacity-40 blur-2xl sm:blur-[100px] pointer-events-none transform-gpu" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(91,225,147,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">

          {/* LEFT COLUMN (Text, Status, CTA, Features) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left z-10 pt-4 lg:pt-0">

            {/* Store Status Pill */}
            <div className="inline-flex items-center">
              <div
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold backdrop-blur-md border shadow-md transition-all ${
                  isOpen
                    ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-300"
                    : "bg-rose-500/15 border-rose-400/50 text-rose-300"
                }`}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isOpen ? "bg-emerald-400 animate-ping" : "bg-rose-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      isOpen ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                  />
                </span>
                <span className="font-bold">
                  {isOpen ? "We're Open — Order Now!" : "We're Currently Closed"}
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              <span className="text-white block">Hot. Crispy.</span>
              <span className="text-[#5BE193] block mt-1">Delivered Fresh.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-white/90 tracking-wide">
              Zinger Burgers <span className="text-[#5BE193] mx-1.5">•</span> Cheesy Pizzas <span className="text-[#5BE193] mx-1.5">•</span> Loaded Rolls
            </p>

            {/* Paragraph Description */}
            <p className="max-w-xl text-xs sm:text-base text-white/70 leading-relaxed font-medium">
              Craving something crispy and bold? We craft every order with premium
              fresh ingredients and deliver it piping hot — right to your door in Malir.
            </p>

            {/* CTA Button */}
            <div className="pt-1">
              <Link
                href="/#menu"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full font-black text-sm sm:text-base bg-[#FFC700] text-[#072413] hover:bg-[#ffe066] active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,199,0,0.3)] group transform-gpu"
              >
                <span className="material-symbols-outlined text-[20px] text-[#072413] group-hover:rotate-12 transition-transform">
                  diamond
                </span>
                Explore Full Menu
              </Link>
            </div>

            {/* Bottom Features Bar */}
            <div className="pt-6 sm:pt-10 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm font-bold text-white/80">

                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#5BE193] text-[20px]">
                    lunch_dining
                  </span>
                  <span>100% Fresh Ingredients</span>
                </div>

                <div className="hidden sm:block w-px h-5 bg-white/20" />

                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#5BE193] text-[20px]">
                    bolt
                  </span>
                  <span>Fast Delivery – Malir Only</span>
                </div>

                <div className="hidden sm:block w-px h-5 bg-white/20" />

                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#5BE193] text-[20px]">
                    map
                  </span>
                  <span>Live Order Tracking</span>
                </div>

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Slanted Geometric Food Polygon Cards) */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[540px] h-[360px] sm:h-[460px] lg:h-[500px]">

              {/* Slanted Card 1 (Main Zinger Burger - Primary LCP) */}
              <div
                className="absolute left-0 top-0 w-[62%] h-[92%] z-20 rounded-3xl overflow-hidden shadow-2xl border-2 border-[#FFC700]/70 group transition-all duration-300 transform-gpu hover:scale-[1.03] hover:z-30 hover:border-[#FFC700]"
                style={{
                  clipPath: "polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)",
                }}
              >
                <div className="relative w-full h-full bg-[#00230c]">
                  <Image
                    src="/images/hero-burger.jpg"
                    alt="Hot & Crispy Zinger Burger"
                    fill
                    priority
                    sizes="(max-width: 768px) 60vw, 30vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 transform-gpu"
                  />
                  {/* Inner gradient shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Slanted Card 2 (Cheesy Pizza / Broast) */}
              <div
                className="absolute right-0 bottom-0 w-[60%] h-[92%] z-10 rounded-3xl overflow-hidden shadow-2xl border-2 border-[#5BE193]/60 group transition-all duration-300 transform-gpu hover:scale-[1.03] hover:z-30 hover:border-[#5BE193]"
                style={{
                  clipPath: "polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)",
                }}
              >
                <div className="relative w-full h-full bg-[#00230c]">
                  <Image
                    src="/images/pizza.jpg"
                    alt="Cheesy Pizza & Crispy Food"
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 60vw, 30vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 transform-gpu"
                  />
                  {/* Inner gradient shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Accent Fries Decorator (Bottom Left Overlay) */}
              <div className="absolute left-[20%] bottom-0 z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl border border-white/20 hidden sm:block transform -rotate-12 hover:rotate-0 transition-transform duration-300 transform-gpu">
                <Image
                  src="/images/fries.jpg"
                  alt="Golden Crispy Fries"
                  fill
                  loading="lazy"
                  sizes="112px"
                  className="object-cover"
                />
              </div>

              {/* Glowing Outline Background Behind Cards */}
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#FFC700]/20 to-[#5BE193]/20 blur-xl sm:blur-2xl rounded-full transform scale-90 pointer-events-none transform-gpu" />

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
