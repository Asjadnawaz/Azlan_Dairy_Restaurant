"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { RIDER_TOAST } from "./rider-utils";

const FIELD_CLASS =
  "w-full min-h-14 px-4 rounded-2xl border border-[var(--r-line)] bg-[var(--r-bg)] text-[var(--r-text)] text-base font-medium outline-none";
const LABEL_CLASS =
  "block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--r-muted)] mb-2";

/** Sign-in gate for the rider portal. */
export function RiderLogin({
  onSignedIn,
  notRider = false,
}: {
  onSignedIn: () => void;
  /** Signed in successfully, but the account has no rider access. */
  notRider?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      // Keeps the profiles row — and therefore the role check — in step with auth.
      try {
        await fetch("/api/auth/sync-profile", { method: "POST" });
      } catch {
        // /api/rider/orders syncs again on its own; not worth blocking login.
      }

      onSignedIn();
    } catch (err: unknown) {
      toast.error(
        (err as Error)?.message ||
          "Login nahi hua. Email aur password check karein.",
        RIDER_TOAST
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rider-shell min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-7">
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--r-raised)] text-[var(--r-cash)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[30px]">
              two_wheeler
            </span>
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--r-muted)]">
              Azlan Fast Food
            </p>
            <h1 className="font-integral text-2xl leading-tight mt-1">
              Rider Portal
            </h1>
            <p className="text-sm text-[var(--r-muted)] mt-2 leading-relaxed">
              Apna rider email aur password daal kar andar aayein.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {notRider && (
            <p
              className="text-sm font-semibold leading-snug rounded-2xl px-3.5 py-3 border"
              style={{
                color: "var(--r-late)",
                borderColor: "color-mix(in srgb, var(--r-late) 45%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--r-late) 12%, transparent)",
              }}
            >
              Is account ko rider ka access nahi hai. Apne rider account se login
              karein, ya manager se baat karein.
            </p>
          )}

          <div>
            <label htmlFor="rider-email" className={LABEL_CLASS}>
              Email
            </label>
            <input
              id="rider-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rider@azlanfastfood.com"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="rider-password" className={LABEL_CLASS}>
              Password
            </label>
            <input
              id="rider-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={FIELD_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-14 rounded-2xl bg-[var(--r-cash)] text-[var(--r-bg)] font-integral text-base flex items-center justify-center gap-2 cursor-pointer active:opacity-85 disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span>Andar ja rahe hain…</span>
              </>
            ) : (
              <span>Login Karein</span>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-bold text-[var(--r-muted)] cursor-pointer"
        >
          ‹ Website par wapis
        </button>
      </div>
    </div>
  );
}
