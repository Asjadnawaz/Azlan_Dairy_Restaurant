import type { Metadata, Viewport } from "next";
import { RiderPwaInstall } from "@/components/rider/rider-pwa-install";

export const metadata: Metadata = {
  title: "Rider Portal — Azlan Fast Food & BBQ Point",
  description: "Official delivery dispatch and shift management portal for Azlan Fast Food riders in Malir, Karachi.",
  manifest: "/rider-manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/rider-icon-192.png", type: "image/png" }],
    apple: [{ url: "/icons/rider-apple-touch-icon.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Azlan Rider",
  },
};

export const viewport: Viewport = {
  themeColor: "#07110B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07110B] text-slate-100 flex flex-col">
      <div className="max-w-4xl w-full mx-auto p-3 sm:p-4 flex-1 flex flex-col">
        <RiderPwaInstall />
        {children}
      </div>
    </div>
  );
}
