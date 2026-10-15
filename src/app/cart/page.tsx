"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { useCart } from "@/lib/cart-store";
import { computeTotals, formatRupees } from "@/lib/cart-pricing";
import { findCoupon, type Coupon } from "@/lib/coupons";
import {
  MAX_DELIVERY_RADIUS_KM,
  calculateDeliveryFromCoordinates,
  fetchRoadRoute,
  reverseGeocode,
} from "@/lib/delivery";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import dynamic from "next/dynamic";
import { useStoreStatus } from "@/hooks/use-store-status";
import { formatCountdown } from "@/lib/store-hours";

const AuthModal = dynamic(
  () => import("@/components/auth/auth-modal").then((m) => m.AuthModal),
  { ssr: false }
);
import { CartItems } from "@/components/cart/cart-items";
import {
  CheckoutForm,
  normalizePhoneInput,
  type CheckoutErrors,
  type CheckoutFields,
} from "@/components/cart/checkout-form";
import { OrderSummary } from "@/components/cart/order-summary";
import {
  CartHeader,
  CartSkeleton,
  ConfirmationModal,
  EmptyCart,
  PlaceOrderButton,
} from "@/components/cart/cart-pieces";
import { saveOrderToStorage, type Confirmation } from "@/lib/cart-storage";

/**
 * Cart and checkout.
 *
 * Was a single 1,133-line client component holding both steps, with the coupon
 * UI pasted in twice and the discount computed in the browser. Now the two views
 * are components (src/components/cart/), the money comes from
 * `computeTotals` — the same function POST /api/orders re-runs before it writes
 * the row — and the coupon travels as a `coupon_code` the server resolves itself.
 *
 * Store status comes from the shared `useStoreStatus` hook rather than this
 * page's own `settings` query, so the closed state here always agrees with the
 * banner and the menu.
 */

const DEFAULT_DELIVERY_FEE = 60;

const INITIAL_FIELDS: CheckoutFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "03",
  orderType: "delivery",
  streetDetails: "",
  address: "",
  city: "Karachi",
  district: "",
  paymentMethod: "cod",
  itemUnavailableAction: "Call me",
  note: "",
};

export default function CartPage() {
  const { items, updateQty, remove, clear, _hasHydrated } = useCart();
  const [activeStep, setActiveStep] = useState<"cart" | "checkout">("cart");

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [fields, setFields] = useState<CheckoutFields>(INITIAL_FIELDS);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Delivery
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);

  const store = useStoreStatus();
  const isStoreOpen = store.isOpen;

  const set = useCallback(
    <K extends keyof CheckoutFields>(key: K, value: CheckoutFields[K]) => {
      setFields((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const touch = useCallback((key: keyof CheckoutFields | "location") => {
    setTouched((current) => ({ ...current, [key]: true }));
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Auth prefill                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    // Only ever fills blanks, so it cannot clobber something being typed.
    const prefill = (u: User) => {
      setUserId(u.id);
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;

      setFields((current) => {
        const next = { ...current };
        if (u.email && !next.email) next.email = u.email;
        if (typeof meta.phone === "string" && next.phone === "03") {
          next.phone = normalizePhoneInput(meta.phone);
        }
        if (typeof meta.first_name === "string") {
          if (!next.firstName) next.firstName = meta.first_name;
          if (!next.lastName && typeof meta.last_name === "string") {
            next.lastName = meta.last_name;
          }
        } else if (typeof meta.full_name === "string") {
          const [given = "", ...rest] = meta.full_name.split(" ");
          if (!next.firstName) next.firstName = given;
          if (!next.lastName) next.lastName = rest.join(" ");
        }
        return next;
      });
    };

    getCurrentUser()
      .then((user) => {
        if (user) prefill(user);
      })
      .catch(() => {
        /* Not signed in — guest checkout is the normal path here. */
      });

    const subscription = onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) prefill(session.user);
      else if (event === "SIGNED_OUT") setUserId(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Money — one computation, shared with the server                        */
  /* ---------------------------------------------------------------------- */

  const isPickup = fields.orderType === "pickup";
  const coupon: Coupon | null = useMemo(() => findCoupon(couponCode), [couponCode]);

  const totals = useMemo(
    () =>
      computeTotals({
        items,
        deliveryFee,
        couponCode,
        isPickup,
      }),
    [items, deliveryFee, couponCode, isPickup]
  );

  const itemCount = totals.itemCount;

  /* ---------------------------------------------------------------------- */
  /* Validation — per field, surfaced next to the field                     */
  /* ---------------------------------------------------------------------- */

  const allErrors = useMemo<CheckoutErrors>(() => {
    const next: CheckoutErrors = {};

    if (!fields.firstName.trim()) next.firstName = "We need a name for the order";

    if (!/^03\d{9}$/.test(fields.phone.replace(/\D/g, ""))) {
      next.phone = "Enter an 11-digit number starting 03, e.g. 03001234567";
    }

    if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      next.email = "That email address doesn't look right";
    }

    if (!isPickup) {
      if (!fields.streetDetails.trim() && !fields.address.trim()) {
        next.streetDetails = "Add your house # and gali # so the rider can find you";
      }
      if (!deliveryLocation) {
        next.location = "Drop the pin on your delivery location";
      } else if (deliveryDistance > MAX_DELIVERY_RADIUS_KM) {
        next.location = `That pin is ${deliveryDistance.toFixed(1)} km away — outside our ${MAX_DELIVERY_RADIUS_KM} km radius`;
      }
    }

    return next;
  }, [fields, isPickup, deliveryLocation, deliveryDistance]);

  const isValid = Object.keys(allErrors).length === 0;

  // A pristine form should not be a wall of red. Errors appear once the field has
  // been visited, or once submit has been pressed.
  const visibleErrors = useMemo<CheckoutErrors>(() => {
    if (submitAttempted) return allErrors;
    const shown: CheckoutErrors = {};
    for (const [key, message] of Object.entries(allErrors)) {
      if (touched[key]) shown[key as keyof CheckoutErrors] = message;
    }
    return shown;
  }, [allErrors, touched, submitAttempted]);

  /* ---------------------------------------------------------------------- */
  /* Location                                                               */
  /* ---------------------------------------------------------------------- */

  const handleLocationSelect = useCallback(async (lat: number, lng: number) => {
    setDeliveryLocation({ lat, lng });
    setIsGeocoding(true);

    // Show the straight-line estimate straight away so the total is never blank
    // while OSRM and Nominatim are in flight.
    const estimate = calculateDeliveryFromCoordinates(lat, lng);
    setDeliveryDistance(estimate.distanceKm);
    setDeliveryFee(estimate.deliveryFee);
    setDeliveryBreakdown(`${estimate.breakdown} — checking the road route…`);

    const [route, geo] = await Promise.all([
      fetchRoadRoute(lat, lng),
      reverseGeocode(lat, lng),
    ]);

    setDeliveryDistance(route.distanceKm);
    setDeliveryFee(route.deliveryFee);
    setDeliveryBreakdown(route.breakdown);

    if (geo) {
      setFields((current) => ({
        ...current,
        address: geo.address,
        city: geo.city || current.city,
        district: geo.district || current.district,
      }));
    }
    setIsGeocoding(false);

    if (route.distanceKm > MAX_DELIVERY_RADIUS_KM) {
      toast.error(
        `That location is ${route.distanceKm.toFixed(1)} km away — outside our ${MAX_DELIVERY_RADIUS_KM} km delivery radius.`
      );
    }
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("This browser cannot share your location. Please tap the map instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        touch("location");
        void handleLocationSelect(position.coords.latitude, position.coords.longitude);
        toast.success("Location captured.");
      },
      () => {
        toast.error("Could not read your location. Please tap your spot on the map below.");
      }
    );
  }, [handleLocationSelect, touch]);

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                 */
  /* ---------------------------------------------------------------------- */

  const fullName = `${fields.firstName} ${fields.lastName}`.trim();

  const buildAddress = useCallback((): string => {
    if (isPickup) {
      return "Store Pickup (Azlan Fast Food & BBQ Point, Malir, Karachi)";
    }

    const parts: string[] = [];
    if (fields.streetDetails.trim()) parts.push(fields.streetDetails.trim());
    if (fields.address.trim()) parts.push(fields.address.trim());
    if (fields.city && !fields.address.toLowerCase().includes(fields.city.toLowerCase())) {
      parts.push(fields.city);
    }
    if (
      fields.district &&
      !fields.address.toLowerCase().includes(fields.district.toLowerCase()) &&
      fields.district !== "Malir District"
    ) {
      parts.push(fields.district);
    }

    let full = parts.join(", ");
    // The `[GPS: …]` suffix is parsed by splitAddress() in src/lib/orders.ts and
    // by the admin and rider screens — the format is load-bearing.
    if (deliveryLocation) {
      full += ` [GPS: ${deliveryLocation.lat.toFixed(5)}, ${deliveryLocation.lng.toFixed(5)}]`;
    }
    return full;
  }, [fields, isPickup, deliveryLocation]);

  /** Same tag order the admin and rider screens expect. */
  const buildNote = useCallback((): string => {
    const tags = `[${fields.orderType.toUpperCase()}] [${fields.paymentMethod.toUpperCase()}] [If unavailable: ${fields.itemUnavailableAction}]`;
    return fields.note.trim() ? `${tags} ${fields.note.trim()}` : tags;
  }, [fields]);

  async function handleSubmitOrder() {
    setSubmitAttempted(true);

    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!isStoreOpen) {
      toast.error(
        store.reason === "temporary_closure"
          ? (store.temporaryClosureMessage ?? "Temporarily closed for maintenance shutdown. Online orders will resume on October 12.")
          : store.isWithinHours
            ? "We have paused online orders for now. Please check back shortly."
            : `We are closed right now — we open in ${formatCountdown(store.minutesUntilOpen)}.`
      );
      return;
    }
    if (!isValid) {
      // Name the first actual problem rather than listing every field.
      const first = Object.values(allErrors)[0];
      toast.error(first ?? "Please complete the form.");
      // Bring the offending field into view — a phone user may be far from it.
      document
        .querySelector('[aria-invalid="true"], [role="alert"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    const address = buildAddress();

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: fullName,
          customer_phone: fields.phone,
          customer_email: fields.email.trim() || undefined,
          customer_address: address,
          customer_note: buildNote(),
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            image_path: i.image_path,
            quantity: i.quantity,
          })),
          subtotal: totals.subtotal,
          delivery_fee: isPickup ? 0 : deliveryFee,
          delivery_distance_km: isPickup ? 0 : deliveryDistance,
          delivery_coordinates: deliveryLocation,
          // The server resolves the code and re-derives the discount itself.
          coupon_code: coupon?.code ?? null,
          total: totals.total,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        order_id?: string;
        order_number?: string;
        total?: number;
      };

      if (!res.ok) {
        toast.error(data.error || "Could not place your order. Please try again.");
        return;
      }

      const snapshot: Confirmation = {
        orderId: data.order_id ?? "",
        orderNumber: data.order_number ?? "AD-???",
        // The server's figure, not ours — if a price moved, this is what is owed.
        total: data.total ?? totals.total,
        itemCount,
        name: fullName,
        address,
      };

      saveOrderToStorage(snapshot, fields.phone, totals.subtotal, totals.deliveryFee, items);

      clear();
      setConfirmed(snapshot);
      toast.success(`Order ${snapshot.orderNumber} placed.`);
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error("Could not reach the kitchen. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  // Zustand rehydrates from localStorage after mount. The page used to return
  // `null` for that frame, so the whole screen was blank on every visit.
  if (!_hasHydrated) return <CartSkeleton />;

  const isEmpty = items.length === 0;
  const summaryProps = {
    totals,
    coupon,
    couponCode,
    onApplyCoupon: (code: string) => {
      setCouponCode(code);
      toast.success(`${code} applied.`);
    },
    onClearCoupon: () => setCouponCode(""),
    isPickup,
    distanceKm: deliveryDistance,
    feeIsEstimate: deliveryLocation === null,
  };

  return (
    <div className="min-h-screen bg-white px-4 pt-6 pb-28 text-[var(--color-on-surface)] md:px-8 lg:pb-20">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(id) => {
          setUserId(id);
          setShowAuthModal(false);
        }}
      />

      <div className="mx-auto max-w-7xl">
        <CartHeader
          activeStep={activeStep}
          itemCount={itemCount}
          showSteps={!isEmpty}
          onStep={setActiveStep}
        />

        {!isStoreOpen && !isEmpty && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px]">
              {store.reason === "temporary_closure" ? "construction" : "schedule"}
            </span>
            <p className="leading-snug">
              {store.reason === "temporary_closure" ? (
                <>
                  <strong className="font-black">Maintenance Shutdown:</strong> Store is closed for 15 days. Online orders will resume on October 12. Build your cart now and it will be waiting for you.
                </>
              ) : (
                <>
                  We&apos;re closed right now
                  {store.isWithinHours
                    ? " — online orders are paused."
                    : `. We open in ${formatCountdown(store.minutesUntilOpen)} (${store.operatingHoursText}).`}{" "}
                  Build your cart now and it will be waiting for you.
                </>
              )}
            </p>
          </div>
        )}

        {isEmpty ? (
          <EmptyCart />
        ) : activeStep === "cart" ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <CartItems
                items={items}
                itemCount={itemCount}
                onInc={(id) => updateQty(id, 1)}
                onDec={(id) => updateQty(id, -1)}
                onRemove={remove}
                onClear={clear}
              />
            </div>

            {/* The dark panel is desktop-only; on a phone the sticky bar below
                carries the total and the next action instead. */}
            <div className="hidden lg:col-span-4 lg:block lg:sticky lg:top-24">
              <OrderSummary title="Cart Summary" {...summaryProps}>
                <button
                  type="button"
                  onClick={() => setActiveStep("checkout")}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-gradient-to-r from-[#FFC700] via-[#ffd736] to-[#FFC700] py-4 text-base font-black uppercase tracking-wider text-[#00230C] shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-amber-400/40 active:scale-[0.98]"
                >
                  Proceed to Checkout
                  <span className="material-symbols-outlined text-[22px] font-black">
                    arrow_forward
                  </span>
                </button>
              </OrderSummary>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7 xl:col-span-8">
              <CheckoutForm
                fields={fields}
                set={set}
                errors={visibleErrors}
                touch={touch}
                isSignedIn={userId !== null}
                onSignIn={() => setShowAuthModal(true)}
                itemCount={itemCount}
                onBackToCart={() => setActiveStep("cart")}
                deliveryLocation={deliveryLocation}
                deliveryDistance={deliveryDistance}
                deliveryFee={deliveryFee}
                deliveryBreakdown={deliveryBreakdown}
                isGeocoding={isGeocoding}
                onLocationSelect={handleLocationSelect}
                onUseCurrentLocation={handleUseCurrentLocation}
                maxDistanceKm={MAX_DELIVERY_RADIUS_KM}
              />

              {/* Desktop submit. On mobile the sticky bar owns this. */}
              <div className="mt-6 hidden lg:block">
                <PlaceOrderButton
                  onClick={handleSubmitOrder}
                  submitting={submitting}
                  isStoreOpen={isStoreOpen}
                  total={totals.total}
                />
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24 xl:col-span-4">
              <OrderSummary title="Summary" {...summaryProps} lines={items} />
            </div>
          </div>
        )}
      </div>

      {/* Sticky mobile action bar — the live total and the one next action. */}
      {!isEmpty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur-md lg:hidden [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {itemCount} {itemCount === 1 ? "item" : "items"}
                {totals.discount > 0 ? " · discount applied" : ""}
              </p>
              <p className="truncate text-lg font-black text-[#00230c]">
                {formatRupees(totals.total)}
              </p>
            </div>

            {activeStep === "cart" ? (
              <button
                type="button"
                onClick={() => setActiveStep("checkout")}
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-[#00230c] px-5 py-3.5 text-xs font-black uppercase tracking-wide text-[#FFC700] shadow-lg transition-transform active:scale-[0.97]"
              >
                Checkout
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <div className="ml-auto min-w-0 shrink">
                <PlaceOrderButton
                  onClick={handleSubmitOrder}
                  submitting={submitting}
                  isStoreOpen={isStoreOpen}
                  compact
                />
              </div>
            )}
          </div>
        </div>
      )}

      {confirmed && (
        <ConfirmationModal confirmed={confirmed} onClose={() => setConfirmed(null)} />
      )}
    </div>
  );
}

