"use client";

import { usePathname } from "next/navigation";
import { StoreClosedBanner } from "@/components/azlan/store-closed-banner";
import { AnnouncementBar } from "@/components/azlan/announcement-bar";
import { Header } from "@/components/azlan/header";
import { FloatingButtons } from "@/components/azlan/floating-buttons";

export function LayoutChrome({ isStoreActive }: { isStoreActive: boolean }) {
  const pathname = usePathname();

  // Do not render website chrome (Header, Navbar, Announcement bar, Floating buttons) on admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <StoreClosedBanner isActive={isStoreActive} />
      <AnnouncementBar />
      <Header />
      <FloatingButtons />
    </>
  );
}
