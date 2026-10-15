import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order History",
  description:
    "View your order history with Azlan Fast Food & BBQ Point (Azlan Dairy).",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
