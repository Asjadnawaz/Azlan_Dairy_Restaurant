"use client";

import { useState, useEffect } from "react";

const REVIEWS = [
  {
    id: "rev-1",
    src: "/images/Review1.PNG",
    alt: "Google Maps Review 1",
  },
  {
    id: "rev-2",
    src: "/images/Review2.PNG",
    alt: "Google Maps Review 2",
  },
  {
    id: "rev-3",
    src: "/images/Review3.PNG",
    alt: "Google Maps Review 3",
  },
  {
    id: "rev-4",
    src: "/images/Review4.PNG",
    alt: "Google Maps Review 4",
  },
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Automatically cycle through reviews every 3.5s with a smooth right-sliding animation
  useEffect(() => {
    if (selectedImage) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [selectedImage]);

  return (
    <section id="reviews" className="py-16 md:py-24 bg-[var(--color-surface-container-low)] relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-mint-accent)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 mb-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3.5">
          {/* Google Maps Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-zinc-800 border border-[var(--color-outline-variant)] shadow-sm">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-xs font-extrabold text-[var(--color-on-surface)] tracking-wide">
              Google Maps Reviews
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-primary)] tracking-tight">
            What Our Customers Say
          </h2>

          <div className="flex items-center justify-center gap-2">
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-[22px] fill-current">
                  star
                </span>
              ))}
            </div>
            <span className="font-extrabold text-base text-[var(--color-on-surface)]">4.9</span>
            <span className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] font-semibold">
              (Verified Google Reviews)
            </span>
          </div>
        </div>
      </div>

      {/* Centered Focus Review Showcase with Right Sliding Animation */}
      <div className="relative z-10 mx-auto max-w-xl px-4 flex items-center justify-center">
        <div className="relative min-h-[260px] sm:min-h-[340px] w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-3 sm:p-5 flex items-center justify-center">
          {REVIEWS.map((rev, index) => {
            const isCurrent = index === activeIndex;
            const isPrev = index === (activeIndex - 1 + REVIEWS.length) % REVIEWS.length;

            return (
              <div
                key={rev.id}
                onClick={() => setSelectedImage(rev.src)}
                className={`absolute inset-0 p-3 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-700 ease-in-out transform-gpu will-change-transform ${
                  isCurrent
                    ? "opacity-100 translate-x-0 scale-100 z-10 pointer-events-auto"
                    : isPrev
                    ? "opacity-0 translate-x-full scale-95 z-0 pointer-events-none"
                    : "opacity-0 -translate-x-full scale-95 z-0 pointer-events-none"
                }`}
              >
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-white">
                  <img
                    src={rev.src}
                    alt={rev.alt}
                    className="max-h-[260px] sm:max-h-[320px] w-auto object-contain rounded-xl shadow-sm"
                  />

                  {/* Google Verified Review Badge */}
                  <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 text-[11px] font-extrabold text-[var(--color-primary)] flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                    Google Review #{index + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Google Maps Link Button */}
      <div className="mt-8 text-center relative z-10">
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-zinc-800 border border-[var(--color-primary)]/30 text-[var(--color-primary)] font-bold text-xs sm:text-sm shadow-sm hover:bg-[var(--color-primary)] hover:text-white transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-red-500">location_on</span>
          <span>Read All Customer Reviews on Google Maps</span>
        </a>
      </div>

      {/* Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 border-b border-[var(--color-outline-variant)] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-[20px]">verified</span>
                <span className="font-extrabold text-sm text-[var(--color-on-surface)]">
                  Google Maps Customer Review
                </span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Close review"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto flex items-center justify-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950">
              <img
                src={selectedImage}
                alt="Enlarged Google Maps Review"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
