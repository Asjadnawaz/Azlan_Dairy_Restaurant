"use client";

import { useState, useEffect } from "react";

const REVIEWS = [
  {
    id: "rev-1",
    src: "/images/Review1.PNG",
    alt: "Google Maps Customer Review 1",
  },
  {
    id: "rev-2",
    src: "/images/Review2.PNG",
    alt: "Google Maps Customer Review 2",
  },
  {
    id: "rev-3",
    src: "/images/Review3.PNG",
    alt: "Google Maps Customer Review 3",
  },
  {
    id: "rev-4",
    src: "/images/Review4.PNG",
    alt: "Google Maps Customer Review 4",
  },
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auto-play screenshots every 3.5 seconds
  useEffect(() => {
    if (selectedImage) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [selectedImage]);

  return (
    <section id="reviews" className="py-14 md:py-20 bg-[var(--color-surface-container-low)] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-mint-accent)]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[var(--color-outline-variant)] shadow-sm">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-[11px] font-extrabold text-[var(--color-on-surface)] tracking-wide">
              VERIFIED GOOGLE REVIEWS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-primary)] tracking-tight">
            Real Taste. Real Reviews. Loved by Malir.
          </h2>

          <div className="flex items-center justify-center gap-2 pt-0.5">
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined filled text-[22px] text-amber-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
            <span className="font-extrabold text-base text-[var(--color-on-surface)]">4.9 / 5.0</span>
            <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
              (Google Maps Rating)
            </span>
          </div>
        </div>

        {/* Compact Screenshot Showcase with Horizontal Slide Track */}
        <div className="max-w-xl mx-auto relative">
          <div className="bg-white rounded-2xl border border-[var(--color-outline-variant)]/60 shadow-lg p-1.5 sm:p-2.5 overflow-hidden min-h-[220px] sm:min-h-[260px] flex items-center">
            <div
              className="flex transition-transform duration-500 ease-out w-full"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  onClick={() => setSelectedImage(rev.src)}
                  className="w-full shrink-0 flex items-center justify-center cursor-pointer px-1"
                >
                  <img
                    src={rev.src}
                    alt={rev.alt}
                    className="max-h-[220px] sm:max-h-[260px] w-auto object-contain rounded-lg hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Google Maps Link Button */}
        <div className="mt-8 text-center">
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shadow-md hover:bg-[var(--color-primary-container)] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-300">rate_review</span>
            <span>Write a Review on Google Maps</span>
          </a>
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-2xl p-4 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 border-b border-[var(--color-outline-variant)] pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                <span className="font-extrabold text-xs sm:text-sm text-[var(--color-on-surface)]">
                  Google Maps Review Screenshot
                </span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center p-2 rounded-xl bg-zinc-50">
              <img
                src={selectedImage}
                alt="Google Maps Review Screenshot"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
