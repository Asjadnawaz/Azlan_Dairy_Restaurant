"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Item } from "@/lib/supabase/database.types";
import { toast } from "sonner";

export function PriceManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/items");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load items");
      }
      setItems(data.items || []);
    } catch (err: any) {
      toast.error(err.message || "Failed loading menu items");
    } finally {
      setLoading(false);
    }
  }

  function handlePriceInputChange(id: string, val: string) {
    const num = parseFloat(val);
    setEditingPrices((prev) => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num,
    }));
  }

  async function handleSavePrice(id: string, currentPrice: number) {
    const newPrice = editingPrices[id] !== undefined ? editingPrices[id] : currentPrice;
    if (newPrice === currentPrice) return;
    if (newPrice < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setSavingIds((prev) => new Set(prev).add(id));

    try {
      const res = await fetch("/api/admin/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, price: newPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update price");
      }

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, price: newPrice } : item))
      );
      toast.success(`Price updated to Rs. ${newPrice}`);
    } catch (err: any) {
      toast.error(err.message || "Failed updating price");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleToggleAvailability(item: Item) {
    const updatedStatus = !item.is_available;
    setSavingIds((prev) => new Set(prev).add(item.id));

    try {
      const res = await fetch("/api/admin/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: updatedStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed updating availability");
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: updatedStatus } : i))
      );
      toast.success(`${item.name} is now ${updatedStatus ? "Available" : "Out of Stock"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed updating availability");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-[var(--color-surface-container-lowest)] p-4 sm:p-6 rounded-2xl border border-[var(--color-outline-variant)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--color-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">sell</span>
              Real-time Price &amp; Menu Manager
            </h2>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Update item prices directly. Changes reflect live on the website instantly.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table / List */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <span className="material-symbols-outlined text-[40px] text-emerald-700 animate-spin">
            progress_activity
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-600">Loading menu database...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="material-symbols-outlined text-[48px] text-slate-300">
            search_off
          </span>
          <p className="mt-2 text-sm font-bold text-slate-600">No items found matching filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const currentPrice = item.price;
            const draftPrice =
              editingPrices[item.id] !== undefined ? editingPrices[item.id] : currentPrice;
            const isModified = draftPrice !== currentPrice;
            const isSaving = savingIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition-all flex flex-col justify-between ${
                  !item.is_available ? "opacity-60 bg-slate-50 border-slate-200" : "border-slate-200 hover:border-emerald-500/40"
                }`}
              >
                <div>
                  <div className="flex gap-3 items-start mb-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                      <Image
                        src={
                          item.image_path
                            ? item.image_path
                                .replace("/images/Orignal_Images/", "/images/Webp_Orignal_images/")
                                .replace(/\.(jpeg|jpg|png)$/i, ".webp")
                            : "/images/burger.jpg"
                        }
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase mb-1">
                        {item.category}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {/* Availability Toggle */}
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    disabled={isSaving}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                      item.is_available
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {item.is_available ? "check_circle" : "cancel"}
                    </span>
                    {item.is_available ? "In Stock" : "Unavailable"}
                  </button>

                  {/* Price Edit Control */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">Rs.</span>
                    <input
                      type="number"
                      value={draftPrice}
                      onChange={(e) => handlePriceInputChange(item.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePrice(item.id, currentPrice);
                      }}
                      className={`w-20 px-2 py-1 rounded-lg text-sm font-extrabold border text-right focus:outline-none transition-all ${
                        isModified
                          ? "border-amber-400 bg-amber-50 text-amber-900 focus:ring-2 focus:ring-amber-400"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      }`}
                    />
                    <button
                      onClick={() => handleSavePrice(item.id, currentPrice)}
                      disabled={!isModified || isSaving}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        isModified
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed"
                      }`}
                      title="Save new price"
                    >
                      {isSaving ? (
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
