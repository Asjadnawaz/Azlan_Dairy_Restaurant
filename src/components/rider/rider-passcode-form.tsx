"use client";

import { useState } from "react";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function RiderPasscodeForm({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!passcode.trim()) {
      toast.error("Please enter the rider passcode");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid Passcode");
      }

      toast.success("Rider Authentication Successful!");
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#00230c] relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[#FFC700] opacity-10 blur-[100px]" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[350px] h-[350px] rounded-full bg-[#006e30] opacity-20 blur-[100px]" />

      <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-center space-y-6 animate-scale-in">
        {/* Icon & Title */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#00230c] text-[#FFC700] flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-[36px]">two_wheeler</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Rider Portal
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            Azlan Fast Food &amp; BBQ Delivery Team
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
              Enter Rider Passcode
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                key
              </span>
              <input
                type="password"
                maxLength={8}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-center font-mono text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#00230c] text-[#FFC700] font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                Verifying...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                Unlock Dashboard
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 font-medium pt-2">
          Authorized Delivery Riders Only
        </p>
      </div>
    </div>
  );
}
