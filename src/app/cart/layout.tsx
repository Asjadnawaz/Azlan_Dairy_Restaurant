import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart & Checkout",
  description:
    "Review your order and checkout from Azlan Fast Food & BBQ Point (Azlan Dairy). Fast delivery in Malir, Karachi.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
