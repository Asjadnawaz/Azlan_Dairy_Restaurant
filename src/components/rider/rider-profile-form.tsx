"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Rider } from "@/lib/supabase/database.types";
import { RIDER_TOAST } from "./rider-utils";

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
      toast.error("Naam likhna zaroori hai (max 50 harf)", RIDER_TOAST);
      return;
    }

    if (!/^03\d{9}$/.test(cleanPhone)) {
      toast.error("Sahi number daalein, jaise 03001234567", RIDER_TOAST);
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

      // 2. Update the riders row.
      //
      // NOT upsert: PostgREST issues upsert as INSERT ... ON CONFLICT, and RLS
      // evaluates the INSERT policy even when the row already exists. `riders`
      // grants a rider UPDATE on their own row ("Riders can update own profile",
      // auth.uid() = user_id) but no INSERT — only admins can create a rider —
      // so upsert always failed with 42501 and Save could never succeed.
      const { data: updated, error: riderError } = await supabase
        .from("riders")
        .update({
          name: cleanName,
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("id");

      if (riderError) throw riderError;

      // No row matched: this account has no rider record, and the rider cannot
      // create one themselves. Say who can, rather than failing silently.
      if (!updated || updated.length === 0) {
        toast.error(
          "Aap ka rider record nahi mila. Manager se kehein ke wo aap ko rider banayein.",
          RIDER_TOAST
        );
        return;
      }

      toast.success("Profile save ho gayi", RIDER_TOAST);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Profile save nahi hui";
      toast.error(msg, RIDER_TOAST);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="py-8 text-center text-sm font-bold text-[var(--r-muted)]">
        Profile load ho rahi hai…
      </p>
    );
  }

  const fieldClass =
    "w-full min-h-14 px-4 rounded-2xl border border-[var(--r-line)] bg-[var(--r-bg)] text-[var(--r-text)] text-base font-medium outline-none";
  const labelClass =
    "block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--r-muted)] mb-2";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl bg-[var(--r-panel)] border border-[var(--r-line)] p-4"
    >
      <p className="text-sm text-[var(--r-muted)] leading-relaxed">
        Yeh naam aur number customer ko aur admin ko dikhta hai.
      </p>

      <div>
        <label htmlFor="rider-name" className={labelClass}>
          Poora naam
        </label>
        <input
          id="rider-name"
          type="text"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jaise: Muhammad Ali"
          className={fieldClass}
          required
        />
      </div>

      <div>
        <label htmlFor="rider-phone" className={labelClass}>
          Mobile number
        </label>
        <input
          id="rider-phone"
          type="tel"
          inputMode="numeric"
          maxLength={15}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
          className={`${fieldClass} tnum`}
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full min-h-14 rounded-2xl bg-[var(--r-cash)] text-[var(--r-bg)] font-integral text-base flex items-center justify-center gap-2 cursor-pointer active:opacity-85 disabled:opacity-60"
      >
        {saving ? (
          <>
            <span className="material-symbols-outlined text-[20px] animate-spin">
              progress_activity
            </span>
            <span>Save ho raha hai…</span>
          </>
        ) : (
          <span>Save Karein</span>
        )}
      </button>
    </form>
  );
}
