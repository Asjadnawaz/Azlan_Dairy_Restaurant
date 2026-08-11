"use client";

import { useState, useEffect } from "react";
import { RiderPasscodeForm } from "@/components/rider/rider-passcode-form";
import { RiderDashboard } from "@/components/rider/rider-dashboard";

export default function RiderPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if rider_auth cookie or state exists
    const hasAuthCookie = document.cookie.includes("rider_auth=true");
    setIsAuthenticated(hasAuthCookie);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#00230c] flex items-center justify-center">
        <span className="material-symbols-outlined text-[#FFC700] text-[40px] animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <RiderPasscodeForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <RiderDashboard onLogout={() => setIsAuthenticated(false)} />;
}
