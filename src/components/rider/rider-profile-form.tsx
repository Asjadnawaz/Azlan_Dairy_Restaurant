"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Rider } from "@/lib/supabase/database.types";

interface RiderProfileFormProps {
  initialRider?: Rider | null;
}

export function RiderProfileForm({ initialRider }: RiderProfileFormProps) {
  const [name, setName] = useState(initialRider?.name || "");
  const [phone, setPhone] = useState(initialRider?.phone || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!initialRider);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadRider() {
      if (initialRider) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setName(user.user_metadata?.full_name || "");

        const { data: riderData } = await supabase
          .from("riders")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (riderData) {
          setName(riderData.name);
          setPhone(riderData.phone);
        }
      } catch {
        // Silently fail if not existing yet
      } finally {
        setLoading(false);
      }
    }

    void loadRider();
  }, [initialRider, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.replace(/<[^>]*>/g, "").trim().slice(0, 50);
    const cleanPhone = phone.replace(/\D/g, "").slice(0, 15);

    if (!cleanName) {
      toast.error("Name is required (max 50 characters)");
      return;
    }

    if (!/^03\d{9}$/.test(cleanPhone)) {
      toast.error("Valid Pakistan phone number required (e.g. 03001234567)");
      return;
    }

    setSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      // 1. Update user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          phone: cleanPhone,
        },
      });

      // 2. Upsert into riders table
      const { error: riderError } = await supabase
        .from("riders")
        .upsert(
          {
            user_id: user.id,
            name: cleanName,
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (riderError) throw riderError;

      toast.success("Rider profile updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading profile data...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold text-slate-900">Rider Profile</h2>
        <p className="text-xs text-slate-500">Update your name and delivery contact number</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Full Name (Max 50 chars)
        </label>
        <input
          type="text"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Muhammad Ali"
          className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-medium"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Contact Phone (03XXXXXXXXX)
        </label>
        <input
          type="tel"
          maxLength={15}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
          className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-medium"
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Saving...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Profile Changes
          </>
        )}
      </button>
    </form>
  );
}
