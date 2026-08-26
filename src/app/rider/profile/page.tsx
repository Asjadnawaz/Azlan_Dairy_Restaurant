import type { Viewport } from "next";
import { RiderProfileForm } from "@/components/rider/rider-profile-form";

export const metadata = {
  title: "Rider Profile — Azlan Fast Food",
  description: "Rider profile settings",
};

export const viewport: Viewport = {
  themeColor: "#07110B",
};

export default function RiderProfilePage() {
  return (
    <div className="rider-shell min-h-dvh px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="font-integral text-lg">Meri Profile</h1>
        <RiderProfileForm />
      </div>
    </div>
  );
}
