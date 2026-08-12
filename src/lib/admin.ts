export function isAdminUser(
  user: {
    email?: string | null;
    app_metadata?: Record<string, any> | null;
    user_metadata?: Record<string, any> | null;
  } | null | undefined
): boolean {
  if (!user || !user.email) return false;

  const emailLower = user.email.toLowerCase();

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

  const adminEmailsFromEnv = envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const defaultAdminEmails = [
    "admin@azlandairy.com",
    "admin@azlandairy.pk",
    "admin@azlanfastfood.com",
    "azlandairy@gmail.com",
    "azlanfastfood@gmail.com",
  ];

  const allAdminEmails = new Set([...adminEmailsFromEnv, ...defaultAdminEmails]);

  return allAdminEmails.has(emailLower);
}

