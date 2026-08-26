import type { Viewport } from "next";
import { RiderDashboard } from "@/components/rider/rider-dashboard";

export const metadata = {
  title: "Rider Dashboard — Azlan Fast Food",
  description: "Rider order delivery dashboard for Azlan Fast Food & BBQ Point",
};

// Matches the rider shell background so the Android status bar blends in.
export const viewport: Viewport = {
  themeColor: "#07110B",
};

export default function RiderPage() {
  return <RiderDashboard />;
}
