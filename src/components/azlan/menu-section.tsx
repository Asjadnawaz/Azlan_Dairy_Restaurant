"use client";

import { useState, useRef, useEffect } from "react";
import { ProductCard } from "./product-card";
import type { Item } from "@/lib/supabase/database.types";

import { createBrowserClient } from "@/lib/supabase/client";

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function MenuSection({
  items: initialItems,
  isStoreActive,
}: {
  items: Item[];
  isStoreActive: boolean;
}) {
  const [realtimeItems, setRealtimeItems] = useState<Item[] | null>(null);
  const menuItems = realtimeItems ?? initialItems;

  // Realtime listener for live price changes & availability
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("menu-items-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "items" },
        (payload) => {
          const updated = payload.new as Item;
          setRealtimeItems((previousItems) =>
            (previousItems ?? initialItems).map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "items" },
        (payload) => {
          const newItem = payload.new as Item;
          setRealtimeItems((previousItems) => [...(previousItems ?? initialItems), newItem]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialItems]);

  // Group items by category preserves natural menu order
  const categoryNames = Array.from(new Set(menuItems.map((i) => i.category)));
  const [activeCategory, setActiveCategory] = useState<string>(categoryNames[0] || "");

  const tabRef = useRef<HTMLDivElement>(null);
  const isClickScrolling = useRef<boolean>(false);

  // Grouped map: categoryName -> Array of Items
  const groupedItems = categoryNames.reduce<Record<string, Item[]>>((acc, cat) => {
    acc[cat] = menuItems.filter((i) => i.category === cat);
    return acc;
  }, {});

  // ScrollSpy: observe sections as user scrolls down page
  useEffect(() => {
    if (categoryNames.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const catName = entry.target.getAttribute("data-category");
            if (catName) {
              setActiveCategory(catName);
            }
          }
        });
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    categoryNames.forEach((cat) => {
      const el = document.getElementById(`cat-${slugify(cat)}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categoryNames]);

  // Auto-scroll the active tab pill into view in the sticky bar
  useEffect(() => {
    const activePill = tabRef.current?.querySelector('[data-active="true"]') as HTMLElement;
    if (activePill && tabRef.current) {
      const containerRect = tabRef.current.getBoundingClientRect();
      const pillRect = activePill.getBoundingClientRect();
      const offset = pillRect.left - containerRect.left - containerRect.width / 2 + pillRect.width / 2;
      tabRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  }, [activeCategory]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    isClickScrolling.current = true;

    const targetEl = document.getElementById(`cat-${slugify(cat)}`);
    if (targetEl) {
      const headerOffset = 135; // account for navbar + sticky category bar
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }

    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  return (
    <section id="menu" className="scroll-mt-[135px] relative">
      {/* Sticky category navigation bar */}
      <div className="sticky top-[64px] z-30 bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-md border-y border-[var(--color-outline-variant)]/40 shadow-sm">
        <div
          ref={tabRef}
          className="mx-auto max-w-7xl px-4 md:px-8 py-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {categoryNames.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                data-active={isActive}
                onClick={() => handleCategoryClick(cat)}
                className={`shrink-0 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide transition-all duration-300 whitespace-nowrap
                  ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-md scale-105"
                      : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)]"
                  }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories Content Sections */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 space-y-16">
        {categoryNames.map((cat) => {
          const categoryItems = groupedItems[cat] || [];
          const firstItem = categoryItems[0];
          const tagline =
            firstItem?.category_tagline ||
            `Delicious & fresh ${cat.toLowerCase()} prepared daily.`;

          return (
            <div
              key={cat}
              id={`cat-${slugify(cat)}`}
              data-category={cat}
              className="scroll-mt-[140px] pt-4"
            >
              {/* Category Heading (Matching reference format cleanly without lines) */}
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
                <div>
                  <h2 className="font-integral text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--color-primary)] uppercase">
                    {cat}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed max-w-2xl">
                    {tagline}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-extrabold uppercase tracking-widest text-[var(--color-secondary-brand)] bg-[var(--color-secondary-brand)]/10 px-3 py-1 rounded-full w-fit">
                  {categoryItems.length} {categoryItems.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              {/* Items Grid for this Category */}
              {categoryItems.length === 0 ? (
                <div className="text-center py-10 text-[var(--color-on-surface-variant)]">
                  <p className="font-medium">No items available in this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {categoryItems.map((item) => (
                    <ProductCard key={item.id} item={item} isStoreActive={isStoreActive} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
