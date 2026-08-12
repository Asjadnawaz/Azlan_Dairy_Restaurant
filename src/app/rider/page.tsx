"use client";

import { useState } from "react";
import { RiderPasscodeForm } from "@/components/rider/rider-passcode-form";
import { RiderDashboard } from "@/components/rider/rider-dashboard";

export default function RiderPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => typeof document !== "undefined" && document.cookie.includes("rider_auth=true")
  );

  if (!isAuthenticated) {
    return <RiderPasscodeForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <RiderDashboard onLogout={() => setIsAuthenticated(false)} />;
}
