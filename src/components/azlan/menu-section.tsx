"use client";

import { useState, useRef, useEffect } from "react";
import { ProductCard } from "./product-card";
import type { Item } from "@/lib/supabase/database.types";

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function MenuSection({
  items,
  isStoreActive,
}: {
  items: Item[];
  isStoreActive: boolean;
}) {
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? items : items.filter((i) => i.category === active);

  const tabRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active pill into view
  useEffect(() => {
    const el = tabRef.current?.querySelector('[data-active="true"]') as HTMLElement;
    if (el && tabRef.current) {
      const containerRect = tabRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.left - containerRect.left - containerRect.width / 2 + elRect.width / 2;
      tabRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  }, [active]);

  return (
    <section id="menu" className="scroll-mt-[130px]">
      {/* Sticky category tabs */}
      <div className="sticky top-[57px] z-30 bg-[var(--color-background)]/95 backdrop-blur-md border-b border-[var(--color-outline-variant)]/40">
        <div
          ref={tabRef}
          className="mx-auto max-w-7xl px-4 md:px-8 py-3 flex gap-2 overflow-x-auto no-scrollbar"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              data-active={active === cat}
              onClick={() => setActive(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                ${active === cat
                  ? "bg-[var(--color-primary)] text-white custom-shadow"
                  : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 md:py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined text-[64px] opacity-30">search_off</span>
            <p className="mt-2 font-medium">No items in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((item) => (
              <ProductCard key={item.id} item={item} isStoreActive={isStoreActive} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
