import { RiderProfileForm } from "@/components/rider/rider-profile-form";

export const metadata = {
  title: "Rider Profile — Azlan Fast Food",
  description: "Rider profile settings",
};

export default function RiderProfilePage() {
  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8 flex items-center justify-center">
      <RiderProfileForm />
    </div>
  );
}
