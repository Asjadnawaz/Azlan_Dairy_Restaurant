import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Data Protection Policy | Azlan Fast Food & BBQ Point (Azlan Dairy)",
  description:
    "Official Privacy Policy and data protection disclosures for Azlan Fast Food & BBQ Point (a division of Azlan Dairy) in Malir, Karachi. Learn how we safeguard your personal data, delivery GPS, and ordering history.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | Azlan Fast Food & BBQ Point (Azlan Dairy)",
    description:
      "Customer privacy commitments, delivery location handling, data security, and rights for Azlan Fast Food in Malir, Karachi.",
    url: "https://azlanfastfood.com/privacy-policy",
    type: "website",
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
