"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * `tone="dark"` is for the admin sidebar, whose surface is the deep brand green —
 * the default light-surface inks are invisible against it.
 */
export function SignOutButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();

  async function handleSignOut() {
    // Hand a live force-open back to the schedule before the session goes away —
    // otherwise walking out via Sign Out leaves the shop open with no dashboard
    // left to heartbeat it closed. A deliberate "Closed" is left untouched by the
    // route. Best-effort: a failed retire must not block signing out, and the
    // 30-minute grace is the backstop either way.
    try {
      await fetch("/api/admin/toggle-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retire: true }),
        keepalive: true,
      });
    } catch {
      /* backstop: the force-open lapses on its own within 30 minutes */
    }

    document.cookie = "admin_auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
        tone === "dark"
          ? "w-full text-white/70 hover:text-white hover:bg-white/10"
          : "rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
      }`}
      title="Sign out"
    >
      <span className="material-symbols-outlined text-[20px]">logout</span>
      <span className={tone === "dark" ? "" : "hidden sm:inline"}>Sign Out</span>
    </button>
  );
}
