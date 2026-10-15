"use client";

import dynamic from "next/dynamic";
import { formatRupees } from "@/lib/cart-pricing";

/**
 * Step 2's form.
 *
 * Two things changed beyond the split. First, validation is now per-field and
 * shown next to the field: the old page gated the whole submit behind one
 * `valid` boolean and, on failure, fired a single toast reading "Please fill in
 * required fields (Name, Phone number & Address)" — which never mentioned the
 * real blocker most of the time, the missing map pin. Second, the map-pin
 * requirement is explained at the map, where it blocks, instead of only being
 * discoverable by pressing a disabled button.
 */

// Leaflet touches `window` at import time, so it cannot be server-rendered.
const MapPicker = dynamic(
  () => import("@/components/maps/map-picker").then((mod) => mod.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-[var(--radius-lg)] border border-slate-200 bg-slate-100">
        <span className="text-xs font-semibold text-slate-400">Loading map…</span>
      </div>
    ),
  }
);

export type OrderType = "delivery" | "pickup";
export type PaymentMethod = "cod" | "bank_transfer";
export type UnavailableAction = "Call me" | "Cancel entire order";

export type CheckoutFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  orderType: OrderType;
  streetDetails: string;
  address: string;
  city: string;
  district: string;
  paymentMethod: PaymentMethod;
  itemUnavailableAction: UnavailableAction;
  note: string;
};

/** Field name → message. Only shown once the field has been touched. */
export type CheckoutErrors = Partial<Record<keyof CheckoutFields | "location", string>>;

const INPUT_CLASS =
  "w-full h-11 sm:h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-950 focus:bg-white transition-all";
const INPUT_ERROR_CLASS =
  "w-full h-11 sm:h-12 rounded-xl bg-rose-50 border-2 border-rose-300 px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-500 transition-all";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-600">
      <span className="material-symbols-outlined text-[14px]">error</span>
      {message}
    </p>
  );
}

/** Keeps whatever the customer types shaped like `03XXXXXXXXX`. */
export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "03";
  if (digits.startsWith("03")) return digits.slice(0, 11);
  if (digits.startsWith("3")) return `0${digits.slice(0, 10)}`;
  if (digits.startsWith("923")) return `0${digits.slice(2, 12)}`;
  return `03${digits.slice(0, 9)}`;
}

export function CheckoutForm({
  fields,
  set,
  errors,
  touch,
  isSignedIn,
  onSignIn,
  itemCount,
  onBackToCart,
  deliveryLocation,
  deliveryDistance,
  deliveryFee,
  deliveryBreakdown,
  isGeocoding,
  onLocationSelect,
  onUseCurrentLocation,
  maxDistanceKm,
}: {
  fields: CheckoutFields;
  set: <K extends keyof CheckoutFields>(key: K, value: CheckoutFields[K]) => void;
  errors: CheckoutErrors;
  touch: (key: keyof CheckoutFields | "location") => void;
  isSignedIn: boolean;
  onSignIn: () => void;
  itemCount: number;
  onBackToCart: () => void;
  deliveryLocation: { lat: number; lng: number } | null;
  deliveryDistance: number;
  deliveryFee: number;
  deliveryBreakdown: string;
  isGeocoding: boolean;
  onLocationSelect: (lat: number, lng: number) => void;
  onUseCurrentLocation: () => void;
  maxDistanceKm: number;
}) {
  const isDelivery = fields.orderType === "delivery";
  const isTooFar = isDelivery && deliveryLocation !== null && deliveryDistance > maxDistanceKm;

  return (
    <div className="space-y-6">
      {/* Back to cart */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
        <button
          type="button"
          onClick={onBackToCart}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-[#00230c] hover:underline sm:text-sm"
        >
          <span aria-hidden>←</span> Back to Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
        </button>
        <span className="hidden shrink-0 text-xs font-bold text-slate-500 sm:inline">
          Step 2 of 2 · Checkout details
        </span>
      </div>

      {/* Guest / member banner */}
      {!isSignedIn ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs shadow-xs sm:flex-row sm:items-center sm:p-4">
          <div className="flex items-center gap-2.5 font-medium text-emerald-950">
            <span className="material-symbols-outlined shrink-0 text-[24px] text-emerald-600">
              flash_on
            </span>
            <div>
              <p className="text-xs font-extrabold text-emerald-950">
                Guest checkout — no login needed
              </p>
              <p className="text-[11px] text-emerald-800">
                Have an account? Sign in to auto-fill your name and phone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="shrink-0 self-start rounded-xl bg-[#00230c] px-4 py-2 text-xs font-bold text-[#FFC700] shadow-xs transition-all hover:bg-[#073615] sm:self-auto"
          >
            Sign In
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 p-3 text-xs sm:p-3.5">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              Signed in as <strong>{fields.firstName || "Valued Member"}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 1. Contact */}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:space-y-4 sm:p-8">
        <h2 className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-2xl">
          Contact
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="First Name *"
              aria-label="First name"
              aria-invalid={errors.firstName ? true : undefined}
              aria-describedby={errors.firstName ? "err-first-name" : undefined}
              value={fields.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              onBlur={() => touch("firstName")}
              className={errors.firstName ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
            <FieldError id="err-first-name" message={errors.firstName} />
          </div>
          <div>
            <input
              type="text"
              autoComplete="family-name"
              placeholder="Last Name"
              aria-label="Last name"
              value={fields.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email (for your confirmation)"
            aria-label="Email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "err-email" : undefined}
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
            onBlur={() => touch("email")}
            className={errors.email ? INPUT_ERROR_CLASS : INPUT_CLASS}
          />
          <FieldError id="err-email" message={errors.email} />
        </div>

        <div>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Phone *"
            aria-label="Phone number"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "err-phone" : undefined}
            value={fields.phone}
            onChange={(e) => set("phone", normalizePhoneInput(e.target.value))}
            onBlur={() => touch("phone")}
            maxLength={11}
            className={`${errors.phone ? INPUT_ERROR_CLASS : INPUT_CLASS} font-bold`}
          />
          <FieldError id="err-phone" message={errors.phone} />
          {!errors.phone && (
            <p className="mt-1.5 px-1 text-[11px] font-medium text-slate-500">
              We call this number if the rider cannot find your gali.
            </p>
          )}
        </div>
      </section>

      {/* 2. Order type */}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:space-y-4 sm:p-8">
        <h2 className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-2xl">
          Order Type
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            onClick={() => set("orderType", "delivery")}
            aria-pressed={isDelivery}
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all sm:p-4 ${
              isDelivery
                ? "border-[#FFC700] bg-[#FFFBEA]"
                : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
            }`}
          >
            <span className="text-xl sm:text-2xl" aria-hidden>
              🚚
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-950 sm:text-sm">Delivery</p>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                {deliveryLocation ? formatRupees(deliveryFee) : "To your door in Malir"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => set("orderType", "pickup")}
            aria-pressed={!isDelivery}
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all sm:p-4 ${
              !isDelivery
                ? "border-[#FFC700] bg-[#FFFBEA]"
                : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
            }`}
          >
            <span className="text-xl sm:text-2xl" aria-hidden>
              🏪
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-950 sm:text-sm">Pickup</p>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                From the store · no delivery fee
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Delivery address — delivery only */}
      {isDelivery && (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:space-y-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-2xl">
              Delivery Address
            </h2>
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100 sm:px-3.5 sm:py-1.5 sm:text-xs"
            >
              <span className="material-symbols-outlined text-[15px]">my_location</span>
              Use current location
            </button>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-950 shadow-xs">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-emerald-700">
              home_pin
            </span>
            <div>
              <p className="text-xs font-extrabold text-emerald-950">
                House # and gali / street # required
              </p>
              <p className="text-[11px] leading-tight text-emerald-800">
                A map pin only identifies the area (e.g. Khokhrapar). Add your exact{" "}
                <strong>house #, gali #, and a landmark</strong> so the rider reaches your door.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="street-details"
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-emerald-950"
            >
              House #, gali / street # &amp; nearby landmark <span className="text-rose-600">*</span>
            </label>
            <input
              id="street-details"
              type="text"
              autoComplete="address-line1"
              value={fields.streetDetails}
              onChange={(e) => set("streetDetails", e.target.value)}
              onBlur={() => touch("streetDetails")}
              aria-invalid={errors.streetDetails ? true : undefined}
              aria-describedby={errors.streetDetails ? "err-street" : undefined}
              placeholder="e.g. House # 45, Gali # 3, near Jamia Masjid"
              className={
                errors.streetDetails
                  ? INPUT_ERROR_CLASS
                  : "h-11 w-full rounded-xl border-2 border-emerald-600/60 bg-white px-3.5 text-xs font-bold text-slate-900 shadow-xs transition-all focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:h-12 sm:px-4 sm:text-sm"
              }
            />
            <FieldError id="err-street" message={errors.streetDetails} />
          </div>

          <div>
            <label
              htmlFor="detected-area"
              className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-700"
            >
              Detected area / sector (auto-filled from the map pin)
            </label>
            <input
              id="detected-area"
              type="text"
              value={fields.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder={
                isGeocoding ? "Detecting area from the map pin…" : "e.g. Khokhrapar No 1, Malir"
              }
              className={`${INPUT_CLASS} font-semibold text-slate-700`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <input
              type="text"
              value={fields.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="City"
              aria-label="City"
              className={INPUT_CLASS}
            />
            <input
              type="text"
              value={fields.district}
              onChange={(e) => set("district", e.target.value)}
              placeholder="District / area"
              aria-label="District or area"
              className={INPUT_CLASS}
            />
          </div>

          <div className="pt-2">
            <p className="mb-2 text-xs font-bold text-slate-700">
              Drop the pin on your exact delivery location{" "}
              <span className="text-rose-600">*</span>
            </p>

            {/* The blocker is explained here, where it blocks — not only as a
                disabled submit button further down the page. */}
            {!deliveryLocation && (
              <div
                className={`mb-2 flex items-start gap-2.5 rounded-2xl border p-3 text-xs font-semibold shadow-xs ${
                  errors.location
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px]">
                  {errors.location ? "error" : "info"}
                </span>
                <p className="leading-snug">
                  We need a pin to work out your delivery fee and to check you are inside our{" "}
                  {maxDistanceKm} km radius. Tap the map or use{" "}
                  <strong>Use current location</strong>.
                </p>
              </div>
            )}

            <MapPicker
              onLocationSelect={(lat, lng) => {
                touch("location");
                onLocationSelect(lat, lng);
              }}
              initialLocation={deliveryLocation || undefined}
            />

            {deliveryBreakdown && (
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs text-slate-600">
                {isGeocoding ? "⏳" : "💡"} {deliveryBreakdown}
              </p>
            )}

            {isTooFar && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 shadow-xs">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-rose-600">
                  error
                </span>
                <div>
                  <p className="text-sm font-extrabold text-rose-900">
                    Outside our delivery area
                  </p>
                  <p className="mt-0.5 font-medium leading-snug text-rose-700">
                    That pin is <strong>{deliveryDistance.toFixed(1)} km</strong> away by road and
                    we deliver within <strong>{maxDistanceKm} km</strong>. Move the pin closer, or
                    switch to <strong>Pickup</strong> above.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Payment */}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:space-y-4 sm:p-8">
        <h2 className="text-lg font-black uppercase tracking-wide text-slate-950 sm:text-2xl">
          Payment
        </h2>
        <div className="space-y-2.5 sm:space-y-3">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-all sm:p-4 ${
              fields.paymentMethod === "cod"
                ? "border-[#FFC700] bg-[#FFFBEA]"
                : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
            }`}
          >
            <input
              type="radio"
              name="payment"
              checked={fields.paymentMethod === "cod"}
              onChange={() => set("paymentMethod", "cod")}
              className="h-4 w-4 accent-amber-500"
            />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 sm:text-sm">
                💵 Cash on delivery
              </p>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Pay the rider when your order arrives
              </p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-all sm:p-4 ${
              fields.paymentMethod === "bank_transfer"
                ? "border-[#FFC700] bg-[#FFFBEA]"
                : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
            }`}
          >
            <input
              type="radio"
              name="payment"
              checked={fields.paymentMethod === "bank_transfer"}
              onChange={() => set("paymentMethod", "bank_transfer")}
              className="h-4 w-4 accent-amber-500"
            />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 sm:text-sm">
                🏦 Bank transfer
              </p>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Send the screenshot on WhatsApp after ordering
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2 sm:pt-3">
          <label
            htmlFor="unavailable-action"
            className="mb-1.5 block text-xs font-bold text-slate-900 sm:text-sm"
          >
            If an item is unavailable, how should we proceed?
          </label>
          <div className="relative">
            <select
              id="unavailable-action"
              value={fields.itemUnavailableAction}
              onChange={(e) => set("itemUnavailableAction", e.target.value as UnavailableAction)}
              className={`${INPUT_CLASS} cursor-pointer appearance-none pr-10 font-semibold`}
            >
              <option value="Call me">Call me</option>
              <option value="Cancel entire order">Cancel entire order</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-600">
              <span className="material-symbols-outlined text-[20px]">expand_more</span>
            </div>
          </div>
        </div>

        <div className="pt-1 sm:pt-2">
          <input
            type="text"
            placeholder="Special instructions (optional)"
            aria-label="Special instructions"
            value={fields.note}
            onChange={(e) => set("note", e.target.value)}
            maxLength={200}
            className={INPUT_CLASS}
          />
        </div>
      </section>
    </div>
  );
}
