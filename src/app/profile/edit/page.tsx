import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { EditProfileForm } from "./edit-profile-form";

export const metadata = {
  title: "Edit Profile | Azlan Fast Food",
  description: "Update your personal information and preferences.",
};

export default async function EditProfilePage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If no session, redirect to home. Alternatively, could redirect to a login page.
  if (!session?.user) {
    redirect("/");
  }

  return <EditProfileForm initialUser={session.user} />;
}
