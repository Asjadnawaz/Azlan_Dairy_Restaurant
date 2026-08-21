import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";

export type UserRole = "admin" | "rider" | "customer";

/**
 * Synchronizes Supabase Auth user with the `public.profiles` database table.
 * 1. Checks if profile row exists for user.id.
 * 2. If not present, creates a new row with role ('admin', 'rider', or 'customer').
 * 3. Returns the active role of the user.
 */
export async function syncUserProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): Promise<UserRole> {
  if (!user || !user.id) return "customer";

  try {
    const supabase = createAdminClient();

    // 1. Fetch existing profile from database
    const { data: existingProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchErr) {
      console.warn("Could not query profiles table:", fetchErr.message);
    }

    let targetRole: UserRole = "customer";

    if (isAdminUser(user)) {
      targetRole = "admin";
    } else if (existingProfile?.role) {
      targetRole = existingProfile.role as UserRole;
    } else {
      const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
      if (metaRole === "admin" || metaRole === "rider") {
        targetRole = metaRole;
      }
    }

    // 2. Insert or update profile if missing or if role is elevated to admin
    if (!existingProfile || (isAdminUser(user) && existingProfile.role !== "admin")) {
      const userEmail = user.email || null;
      const userName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        null;
      const userPhone = (user.user_metadata?.phone || null) as string | null;

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: userEmail,
          full_name: userName,
          role: targetRole,
          phone: userPhone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    // 3. If role is rider, ensure corresponding entry exists in public.riders
    if (targetRole === "rider") {
      const riderName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        "Rider";
      const riderPhone = (user.user_metadata?.phone as string) || "03000000000";

      await supabase.from("riders").upsert(
        {
          user_id: user.id,
          name: riderName,
          phone: riderPhone,
          status: "available",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    return targetRole;
  } catch (err) {
    console.error("Error in syncUserProfile:", err);
    return isAdminUser(user) ? "admin" : "customer";
  }
}
