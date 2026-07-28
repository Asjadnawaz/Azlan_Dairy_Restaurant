"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin/orders";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast.success("Welcome back!");
        router.push(redirectPath);
        router.refresh();
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error(
        err instanceof Error
          ? err.message === "Invalid login credentials"
            ? "Invalid email or password"
            : err.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-[var(--color-on-surface)]">
          Email
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)]">
            mail
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            autoComplete="email"
            autoFocus
            className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)]
              border border-[var(--color-outline-variant)] pl-10 pr-4 text-sm
              focus:outline-none focus:border-[var(--color-primary)]/40
              focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-[var(--color-on-surface)]">
          Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)]">
            lock
          </span>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)]
              border border-[var(--color-outline-variant)] pl-10 pr-10 text-sm
              focus:outline-none focus:border-[var(--color-primary)]/40
              focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm
          hover:bg-[var(--color-primary-container)] transition-all flex items-center justify-center gap-2
          disabled:opacity-50 custom-shadow"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Signing in...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">login</span>
            Sign In
          </>
        )}
      </button>
    </form>
  );
}
