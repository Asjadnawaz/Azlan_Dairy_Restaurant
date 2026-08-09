/**
 * Admin authorization utility.
 * Determines whether a given Supabase user object has admin privileges.
 */

export function isAdminUser(
  user: {
    email?: string | null;
    app_metadata?: Record<string, any> | null;
    user_metadata?: Record<string, any> | null;
  } | null | undefined
): boolean {
  if (!user) return false;

  // 1. Check user metadata / app metadata for role === "admin"
  if (
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin"
  ) {
    return true;
  }

  // 2. Check env var ADMIN_EMAILS or NEXT_PUBLIC_ADMIN_EMAILS (comma-separated email list)
  const envEmails =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    "";

  const adminEmails = envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.length > 0) {
    return adminEmails.includes(user.email.toLowerCase());
  }

  return false;
}
