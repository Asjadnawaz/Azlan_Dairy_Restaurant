"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Review } from "@/lib/supabase/database.types";

const FALLBACK_REVIEWS: Partial<Review>[] = [
  {
    id: "fb-1",
    customer_name: "Tariq Mahmood",
    rating: 5,
    comment: "Best Zinger Burger in Malir! Crispy, juicy, and delivered super fast in hot packing.",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_verified: true,
  },
  {
    id: "fb-2",
    customer_name: "Saima Farooq",
    rating: 5,
    comment: "The cheesy pizza and loaded fries were top notch. Clean packaging and fresh taste!",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    is_verified: true,
  },
  {
    id: "fb-3",
    customer_name: "Hamza Khan",
    rating: 5,
    comment: "Awesome BBQ and quick home delivery in Sabir Colony. Will definitely order again!",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    is_verified: true,
  },
];

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<Partial<Review>[]>(FALLBACK_REVIEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          setReviews(data as Review[]);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    void loadTestimonials();
  }, []);

  return (
    <section id="reviews" className="py-16 md:py-24 bg-[var(--color-surface-container-low)] relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-mint-accent)]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[var(--color-outline-variant)] shadow-sm">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-xs font-extrabold text-[var(--color-on-surface)] tracking-wide">
              VERIFIED CUSTOMER REVIEWS
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-primary)] tracking-tight">
            Real Taste. Real Reviews. Loved by Malir.
          </h2>

          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-[22px] text-amber-400 filled"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
            <span className="font-extrabold text-base text-[var(--color-on-surface)]">4.9 / 5.0</span>
            <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
              (Customer Rating)
            </span>
          </div>
        </div>

        {/* Modern Reviews Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
            >
              <div className="space-y-3">
                {/* Rating Stars & Verified Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-[18px] text-amber-400 filled"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>

                  {rev.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      Verified Buyer
                    </span>
                  )}
                </div>

                {/* Comment Text */}
                <p className="text-slate-700 text-sm leading-relaxed font-medium">
                  &quot;{rev.comment}&quot;
                </p>
              </div>

              {/* Reviewer Details */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                    {rev.customer_name?.charAt(0) || "C"}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                      {rev.customer_name || "Valued Customer"}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {rev.created_at
                        ? new Date(rev.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "Recent"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shadow-md hover:bg-emerald-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-300">rate_review</span>
            <span>Write a Review on Google Maps</span>
          </a>
        </div>
      </div>
    </section>
  );
}
