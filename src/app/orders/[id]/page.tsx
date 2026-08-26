import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings.server";
import { OrderTracker } from "@/components/azlan/order-tracker";
import type { Order, OrderItem } from "@/lib/supabase/database.types";

/**
 * Order tracking page.
 *
 * Reached three ways: the confirmation modal and the delivery-receipt email link
 * by uuid, and /orders links by order number. That distinction matters, because
 * this page runs on the service-role key and shows a name, a phone number, a
 * street address and a total.
 *
 * `AD-1041` is guessable — the numbers are sequential — so an order-number
 * lookup now has to be accompanied by the last four digits of the phone on the
 * order. A uuid is not guessable, so that path stays open: it is the link in the
 * email, and asking a customer to re-authenticate after they just checked out
 * would be friction for nothing.
 */

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Order pages are private; keep them out of search results. */
export const metadata: Metadata = {
  title: "Track your order · Azlan Fast Food",
  robots: { index: false, follow: false },
};

function last4(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "").slice(-4);
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Shown instead of the order when an order-number link arrives unverified. */
function VerifyPrompt({ orderNumber, failed }: { orderNumber: string; failed: boolean }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <span className="material-symbols-outlined text-[24px]">lock</span>
        </span>

        <h1 className="mt-4 text-lg font-black text-[var(--color-on-surface)]">
          Confirm it&apos;s your order
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
          Enter the last 4 digits of the phone number used for order{" "}
          <span className="font-bold text-[var(--color-on-surface)]">{orderNumber}</span>.
        </p>

        <form method="get" className="mt-5 space-y-3">
          <input
            type="tel"
            name="p"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            pattern="[0-9]{4}"
            required
            aria-label="Last 4 digits of your phone number"
            placeholder="1234"
            className="w-full rounded-2xl border-2 border-[var(--color-outline-variant)] bg-white px-4 py-3.5 text-center text-2xl font-black tracking-[0.5em] text-[var(--color-on-surface)] outline-none transition-colors focus:border-[var(--color-primary)]"
          />
          {failed && (
            <p className="text-xs font-bold text-red-600">
              Those digits don&apos;t match this order. Please try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-black text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            View my order
          </button>
        </form>

        <Link
          href="/orders"
          className="mt-4 inline-block text-xs font-bold text-[var(--color-on-surface-variant)] underline decoration-dotted"
        >
          Back to my orders
        </Link>
      </div>
    </div>
  );
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { id: orderId } = await params;
  const supplied = firstValue((await searchParams).p);

  const admin = createAdminClient();

  const orderQuery = admin.from("orders").select(`
      *,
      order_items (
        id,
        item_id,
        name_snapshot,
        price_snapshot,
        quantity,
        line_total,
        sort_order
      )
    `);

  const isUuid = uuidRegex.test(orderId);
  const { data: order, error } = isUuid
    ? await orderQuery.eq("id", orderId).maybeSingle()
    : await orderQuery.ilike("order_number", orderId).maybeSingle();

  if (error || !order) {
    notFound();
  }

  if (!isUuid) {
    const expected = last4((order as Order).customer_phone);
    // An order with no usable phone on file cannot be verified this way; the
    // uuid link still works, so fall back to asking rather than to showing.
    if (!expected || last4(supplied) !== expected) {
      return (
        <div className="min-h-screen bg-[var(--color-background)]">
          <VerifyPrompt
            orderNumber={(order as Order).order_number}
            failed={supplied.length > 0}
          />
        </div>
      );
    }
  }

  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <OrderTracker
        order={order as Order}
        items={((order.order_items || []) as OrderItem[]).slice().sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )}
        settings={settings}
      />
    </div>
  );
}
