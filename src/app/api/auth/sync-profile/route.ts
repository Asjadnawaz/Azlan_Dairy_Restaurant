import { createServerClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/auth-role";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await syncUserProfile(user);
    return NextResponse.json({ success: true, role });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
