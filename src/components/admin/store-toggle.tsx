"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function StoreToggle({
  isActive,
  onToggle,
}: {
  isActive: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const supabase = createBrowserClient();

  async function toggle() {
    if (updating) return;
    setUpdating(true);
    const newValue = !isActive;
    onToggle(newValue);

    const { error } = await supabase
      .from("settings")
      .update({ is_active: newValue, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      onToggle(!newValue);
      toast.error("Failed to update store status");
    } else {
      toast.success(newValue ? "Store is now OPEN" : "Store is now CLOSED");
    }
    setUpdating(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={updating}
      className={`relative flex items-center gap-3 px-4 py-2 rounded-full font-bold text-sm transition-all
        ${isActive
          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
          : "bg-[var(--color-error)]/10 text-[var(--color-error)]"}`}
    >
      <span
        className={`w-11 h-6 rounded-full relative transition-colors ${
          isActive ? "bg-[var(--color-success)]" : "bg-[var(--color-error)]/40"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            isActive ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[18px]">
          {isActive ? "storefront" : "storefront"}
        </span>
        {isActive ? "Store Open" : "Store Closed"}
      </span>
    </button>
  );
}
