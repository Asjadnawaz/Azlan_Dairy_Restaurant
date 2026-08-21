import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { syncUserProfile } from "@/lib/auth-role";

function safeRedirect(target: string, requestUrl: string) {
  const url = new URL(target, requestUrl);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";
  const authError =
    requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error");

  if (authError) {
    console.error("Auth callback error:", authError);
    return safeRedirect(`/?auth_error=${encodeURIComponent(authError)}`, request.url);
  }

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const role = await syncUserProfile(data.user);

      if (role === "admin") {
        return safeRedirect("/admin/orders", request.url);
      }
      if (role === "rider") {
        return safeRedirect("/rider", request.url);
      }
      const redirectTarget = next.includes("?") ? `${next}&login=google_success` : `${next}?login=google_success`;
      return safeRedirect(redirectTarget, request.url);
    }
  }

  return safeRedirect("/", request.url);
}
