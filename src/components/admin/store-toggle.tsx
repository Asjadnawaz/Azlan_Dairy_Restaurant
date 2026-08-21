"use client";

import { useState } from "react";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function StoreToggle({
  isActive,
  onToggle,
}: {
  isActive: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [updating, setUpdating] = useState(false);

  async function toggle() {
    if (updating) return;
    setUpdating(true);
    const newValue = !isActive;
    onToggle(newValue);

    try {
      const res = await fetch("/api/admin/toggle-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update store status");
      }

      toast.success(newValue ? "Store is now OPEN" : "Store is now CLOSED");
    } catch (err: unknown) {
      onToggle(!newValue);
      toast.error(getErrorMessage(err, "Failed to update store status"));
    } finally {
      setUpdating(false);
    }
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
          {isActive ? "schedule" : "lock"}
        </span>
        {isActive ? "Auto Schedule (7 PM - 4 AM)" : "Store Closed (Manual)"}
      </span>
    </button>
  );
}
