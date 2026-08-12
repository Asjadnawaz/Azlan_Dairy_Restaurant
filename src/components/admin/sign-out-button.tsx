"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
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
      className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold
        text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)]
        hover:bg-[var(--color-error)]/10 transition-colors"
      title="Sign out"
    >
      <span className="material-symbols-outlined text-[20px]">logout</span>
      <span className="hidden sm:inline">Sign Out</span>
    </button>
  );
}
