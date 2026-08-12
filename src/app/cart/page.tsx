"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { calculateDeliveryFromCoordinates, fetchRoadRoute, reverseGeocode } from "@/lib/delivery";

// Leaflet accesses `window` at import time — must be loaded client-only
const MapPicker = dynamic(
  () => import("@/components/azlan/map-picker").then((mod) => mod.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 rounded-[var(--radius-lg)] bg-slate-100 border border-slate-200 flex items-center justify-center">
        <span className="text-xs text-slate-400 font-semibold">Loading map…</span>
      </div>
    ),
  }
);
import { AuthModal } from "@/components/azlan/auth-modal";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import { createBrowserClient } from "@/lib/supabase/client";

export default function CartPage() {
  const { items, updateQty, remove, clear, totalPrice, totalItems } = useCart();
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState<"cart" | "checkout">("cart");

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state matching reference checkout design
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("03");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Karachi");
  const [district, setDistrict] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer">("cod");
  const [itemUnavailableAction, setItemUnavailableAction] = useState<"Call me" | "Cancel entire order">("Call me");
  const [note, setNote] = useState("");

  // Map & Delivery state
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(60);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Order confirmation state
  const [confirmed, setConfirmed] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    itemCount: number;
    name: string;
    address: string;
    phone: string;
  } | null>(null);

  // Store status
  const [isStoreActive, setIsStoreActive] = useState(true);

  useEffect(() => {
    setMounted(true);
    const supabase = createBrowserClient();
    supabase
      .from("settings")
      .select("is_active")
      .single()
      .then(({ data }) => {
        if (data && data.is_active !== undefined) {
          setIsStoreActive(data.is_active);
        }
      });

    const prefillUser = (u: any) => {
      if (!u) return;
      setUserId(u.id);
      
      const meta = u.user_metadata || {};
      
      if (u.email && !email) setEmail(u.email);
      if (meta.phone && phone === "03") setPhone(meta.phone);
      
      if (meta.first_name) {
        if (!firstName) setFirstName(meta.first_name);
        if (!lastName && meta.last_name) setLastName(meta.last_name);
      } else if (meta.full_name && !firstName) {
        const parts = meta.full_name.split(" ");
        setFirstName(parts[0]);
        if (parts.length > 1) setLastName(parts.slice(1).join(" "));
      }
    };

    getCurrentUser()
      .then((user) => {
        if (user) prefillUser(user);
      })
      .catch(() => { });

    const subscription = onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        prefillUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subtotal = totalPrice();
  const itemCount = totalItems();
  const effectiveDeliveryFee = orderType === "pickup" ? 0 : deliveryFee;
  const grandTotal = Math.max(0, subtotal + effectiveDeliveryFee - discount);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setDeliveryLocation({ lat, lng });
    setIsGeocoding(true);

    // Immediately show Haversine estimate while OSRM loads
    const fallback = calculateDeliveryFromCoordinates(lat, lng);
    setDeliveryDistance(fallback.distanceKm);
    setDeliveryFee(fallback.deliveryFee);
    setDeliveryBreakdown(fallback.breakdown + " (calculating road route & address…)");

    // Fetch road route and reverse geocode in parallel
    const [route, geoResult] = await Promise.all([
      fetchRoadRoute(lat, lng),
      reverseGeocode(lat, lng),
    ]);

    setDeliveryDistance(route.distanceKm);
    setDeliveryFee(route.deliveryFee);
    setDeliveryBreakdown(route.breakdown);

    if (geoResult) {
      setAddress(geoResult.address);
      if (geoResult.city) setCity(geoResult.city);
      if (geoResult.district) setDistrict(geoResult.district);
    }
    setIsGeocoding(false);

    if (route.distanceKm > 5.0) {
      toast.error(
        `Selected location (${route.distanceKm.toFixed(1)} km) is outside our 5 km delivery radius.`
      );
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationSelect(position.coords.latitude, position.coords.longitude);
          toast.success("GPS Location captured successfully!");
        },
        () => {
          toast.error("Could not fetch location automatically. Please use the map search below.");
        }
      );
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    if (code === "AZLAN10" || code === "WELCOME10") {
      const disc = Math.round(subtotal * 0.1);
      setDiscount(disc);
      setCouponApplied(true);
      toast.success(`Coupon ${code} applied! 10% discount subtracted.`);
    } else {
      toast.error("Invalid coupon code. Try AZLAN10 for 10% OFF!");
    }
  };

  const fullName = `${firstName} ${lastName}`.trim();
  const isTooFar = orderType === "delivery" && deliveryLocation !== null && deliveryDistance > 5.0;
  const isWithinRadius = orderType === "pickup" || (deliveryLocation !== null && deliveryDistance <= 5.0);

  const valid =
    firstName.trim().length > 0 &&
    (orderType === "pickup" || address.trim().length > 0) &&
    isWithinRadius &&
    phone.replace(/\D/g, "").length >= 8;

  const saveOrderToStorage = (
    orderNumber: string,
    phoneVal: string,
    totalVal: number,
    itemsSnapshot: { id: string; name: string; price: number; quantity: number; image_path?: string | null }[]
  ) => {
    try {
      const stored = JSON.parse(localStorage.getItem("azlan-orders") || "[]");
      stored.unshift({ orderNumber, phone: phoneVal, total: totalVal, timestamp: Date.now(), items: itemsSnapshot });
      localStorage.setItem("azlan-orders", JSON.stringify(stored.slice(0, 5)));
    } catch { }
  };

  async function handleSubmitOrder() {
    if (items.length === 0) {
      toast.error("Your basket is empty");
      return;
    }

    if (!isStoreActive) {
      toast.error("Store Closed. Please Try Again Later.");
      return;
    }

    if (!userId) {
      setShowAuthModal(true);
      return;
    }

    if (orderType === "delivery" && deliveryDistance > 5.0) {
      toast.error(`Your delivery location (${deliveryDistance.toFixed(1)} km) is outside our 5 km delivery radius.`);
      return;
    }

    if (!valid || submitting) {
      toast.error("Please fill in required fields (Name, Phone number & Location Pin within 5 km)");
      return;
    }

    setSubmitting(true);

    try {
      const fullAddressString =
        orderType === "pickup"
          ? "Store Pickup (Azlan Fast Food & BBQ Point, Malir, Karachi)"
          : `${address}, ${city}, ${district}`;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: fullName,
          customer_phone: phone,
          customer_address: fullAddressString,
          customer_note: note
            ? `[${orderType.toUpperCase()}] [${paymentMethod.toUpperCase()}] [If unavailable: ${itemUnavailableAction}] ${note}`
            : `[${orderType.toUpperCase()}] [${paymentMethod.toUpperCase()}] [If unavailable: ${itemUnavailableAction}]`,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            image_path: i.image_path,
            quantity: i.quantity,
          })),
          subtotal,
          delivery_fee: effectiveDeliveryFee,
          delivery_distance_km: orderType === "pickup" ? 0 : deliveryDistance,
          delivery_coordinates: deliveryLocation,
          total: grandTotal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to place order. Please try again.");
        return;
      }

      const orderNumber = data.order_number ?? "AD-???";
      const orderId = data.order_id;
      const snapshot = {
        orderId,
        orderNumber,
        total: grandTotal,
        itemCount,
        name: fullName,
        address: fullAddressString,
        phone,
      };

      saveOrderToStorage(
        orderNumber,
        phone,
        grandTotal,
        items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image_path: i.image_path }))
      );

      clear();
      setConfirmed(snapshot);
      toast.success(`Order ${orderNumber} placed successfully!`);
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error("Failed to place order. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-[var(--color-on-surface)] pt-6 pb-20 px-4 md:px-8">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(id) => {
          setUserId(id);
          setShowAuthModal(false);
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header & Step Navigation */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="font-integral text-4xl sm:text-6xl text-slate-950 uppercase tracking-tight">
              {activeStep === "cart" ? (
                <>YOUR <span className="text-green-700 italic">CART.</span></>
              ) : (
                <>SECURE <span className="text-green-700 italic">CHECKOUT.</span></>
              )}
            </h1>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveStep("cart")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${activeStep === "cart"
                  ? "bg-[#00230c] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#FFC700] text-slate-950 flex items-center justify-center font-black text-[11px]">1</span>
                YOUR CART ({itemCount})
              </button>

              <span className="text-slate-300 font-extrabold text-xs">➔</span>

              <button
                type="button"
                onClick={() => setActiveStep("checkout")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${activeStep === "checkout"
                  ? "bg-[#00230c] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#FFC700] text-slate-950 flex items-center justify-center font-black text-[11px]">2</span>
                CHECKOUT
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-12 text-center max-w-xl mx-auto my-12 border border-slate-200 shadow-sm">
            <span className="material-symbols-outlined text-[72px] text-slate-400 mb-4">
              shopping_bag
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Cart is Empty</h2>
            <p className="text-sm text-slate-600 mb-6">
              Looks like you haven&apos;t added any delicious items yet!
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#00230c] text-white font-extrabold text-sm hover:bg-slate-800 transition-all shadow-md"
            >
              BROWSE MENU
            </Link>
          </div>
        ) : activeStep === "cart" ? (
          /* ========================================== */
          /* STEP 1: DEDICATED CART PAGE VIEW */
          /* ========================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Full Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-md backdrop-blur-md">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="font-integral text-xl sm:text-2xl text-slate-950 uppercase tracking-wide">
                      Cart Items
                    </h2>
                    <span className="px-3 py-1 rounded-full bg-[#00230c] text-[#FFC700] font-black text-xs shadow-xs">
                      {itemCount} {itemCount === 1 ? "Item" : "Items"}
                    </span>
                  </div>
                  <button
                    onClick={clear}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-rose-200/80 bg-rose-50/60 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    Clear All
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group p-4 sm:p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={item.image_path || "/images/burger.jpg"}
                            alt={item.name}
                            className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover ring-1 ring-slate-200/70 group-hover:ring-emerald-500/40 group-hover:scale-105 transition-all duration-300 shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-[#00230c] transition-colors leading-tight">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100/80 text-emerald-900 border border-emerald-200/50">
                              Rs. {item.price} <span className="text-[10px] font-medium text-emerald-700 ml-1">/ unit</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                        {/* Quantity Counter */}
                        <div className="flex items-center bg-white rounded-full border border-slate-200 p-1 shadow-xs">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 font-bold hover:bg-[#00230c] hover:text-[#FFC700] active:scale-95 transition-all"
                            title="Decrease quantity"
                          >
                            <span className="material-symbols-outlined text-[16px]">remove</span>
                          </button>
                          <span className="w-9 text-center font-black text-sm text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 font-bold hover:bg-[#00230c] hover:text-[#FFC700] active:scale-95 transition-all"
                            title="Increase quantity"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                        </div>

                        {/* Price Total */}
                        <div className="text-right min-w-[90px]">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total</p>
                          <p className="font-black text-lg sm:text-xl text-[#00230c]">
                            Rs.{item.price * item.quantity}
                          </p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => remove(item.id)}
                          className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-xs font-extrabold text-[#00230c] hover:underline"
                >
                  <span>←</span> Continue Shopping
                </Link>
              </div>
            </div>

            {/* Right Column: Cart Summary & Checkout Trigger */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-[#023020] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-800 space-y-6">
                <h2 className="font-integral text-xl sm:text-2xl text-white uppercase tracking-wide">
                  CART SUMMARY
                </h2>

                {/* Coupon Code input */}
                <div className="pt-1">
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 focus-within:border-[#FFC700] transition-colors">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponApplied}
                      className="w-full bg-transparent px-3 text-xs text-white placeholder-zinc-500 focus:outline-none uppercase font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponApplied}
                      className="px-4 py-2 rounded-lg bg-[#FFC700] text-black font-black text-xs uppercase hover:bg-blue-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {couponApplied ? "Applied" : "Apply"}
                    </button>
                  </div>
                </div>

                {/* Calculations */}
                <div className="space-y-3 text-xs sm:text-sm font-semibold pt-2">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Subtotal</span>
                    <span className="font-bold text-white">Rs.{subtotal}</span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Estimated Delivery</span>
                    <span className="font-bold text-white">Rs.{deliveryFee}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between items-center text-amber-400">
                      <span>Discount</span>
                      <span className="font-bold">- Rs.{discount}</span>
                    </div>
                  )}

                  {/* Divider line */}
                  <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="font-integral text-base sm:text-lg uppercase text-[#FFC700] font-black">
                      Total
                    </span>
                    <span className="font-black text-2xl sm:text-3xl text-[#FFC700]">
                      Rs.{grandTotal}
                    </span>
                  </div>
                </div>

                {/* Proceed to Checkout Button */}
                <button
                  type="button"
                  onClick={() => setActiveStep("checkout")}
                  className="font-integral text-base sm:text-lg uppercase tracking-wider font-black w-full py-4 text-center rounded-full bg-[#FFC700] text-black hover:bg-[#E0AF00] hover:cursor-pointer active:scale-[0.99] shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 border-1 border-white"
                >
                  PROCEED TO CHECKOUT ➔
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================== */
          /* STEP 2: DEDICATED CHECKOUT PAGE VIEW */
          /* ========================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Input Form Cards */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Back to Cart Bar */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => setActiveStep("cart")}
                  className="inline-flex items-center gap-2 text-xs font-extrabold text-[#00230c] hover:underline"
                >
                  <span>←</span> Back to Cart ({itemCount} items)
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Step 2 of 2: Checkout Details
                </span>
              </div>

              {/* 1. CONTACT CARD */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <h2 className="font-integral text-xl sm:text-2xl text-slate-950 uppercase tracking-wide">
                  CONTACT
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="First Name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email (for confirmation)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone *"
                    value={phone}
                    onChange={(e) => {
                      let val = e.target.value;
                      const digits = val.replace(/\D/g, "");
                      if (digits.length === 0) {
                        val = "03";
                      } else if (digits.startsWith("03")) {
                        val = digits.slice(0, 11);
                      } else if (digits.startsWith("3")) {
                        val = "0" + digits.slice(0, 10);
                      } else if (digits.startsWith("923")) {
                        val = "0" + digits.slice(2, 12);
                      } else {
                        val = "03" + digits.slice(0, 9);
                      }
                      setPhone(val);
                    }}
                    maxLength={11}
                    className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-bold focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium px-4 -mt-2">
                Please edit your profile so that you don't need to enter your personal details again and again.
              </p>

              {/* 2. ORDER TYPE CARD */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <h2 className="font-integral text-xl sm:text-2xl text-slate-950 uppercase tracking-wide">
                  ORDER TYPE
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Delivery Toggle */}
                  <button
                    type="button"
                    onClick={() => setOrderType("delivery")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${orderType === "delivery"
                      ? "border-[#FFC700] bg-[#FFFBEA]"
                      : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
                      }`}
                  >
                    <span className="text-2xl">🚚</span>
                    <div>
                      <p className="font-extrabold text-sm text-slate-950">Delivery</p>
                      <p className="text-xs text-slate-500">To your door in Malir</p>
                    </div>
                  </button>

                  {/* Pickup Toggle */}
                  <button
                    type="button"
                    onClick={() => setOrderType("pickup")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${orderType === "pickup"
                      ? "border-[#FFC700] bg-[#FFFBEA]"
                      : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
                      }`}
                  >
                    <span className="text-2xl">🏪</span>
                    <div>
                      <p className="font-extrabold text-sm text-slate-950">Pickup</p>
                      <p className="text-xs text-slate-500">From store · No delivery fee</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. DELIVERY ADDRESS CARD (Only when Delivery) */}
              {orderType === "delivery" && (
                <div className="bg-slate-50/60 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-integral text-xl sm:text-2xl text-slate-950 uppercase tracking-wide">
                      DELIVERY ADDRESS
                    </h2>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      <span>📍</span> Use Current Location
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <span>
                      {isGeocoding
                        ? "Fetching address details from map pin..."
                        : "Click anywhere on the map below or use GPS to automatically detect your address."}
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1">
                      {isGeocoding ? "Locating..." : "Dynamic Pin Address"}
                    </span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={isGeocoding ? "Detecting address..." : "Street address / House # (auto-detected from map pin)"}
                      className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="District / Area"
                        className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Drag the pin to your exact delivery location:
                    </label>
                    <MapPicker
                      onLocationSelect={handleLocationSelect}
                      initialLocation={deliveryLocation || undefined}
                    />
                    {deliveryBreakdown && (
                      <p className="mt-2 text-xs text-slate-600 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                        💡 {deliveryBreakdown}
                      </p>
                    )}
                    {isTooFar && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 shadow-xs">
                        <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">
                          error
                        </span>
                        <div>
                          <p className="font-extrabold text-sm text-rose-900">Delivery Unavailable (Too Far)</p>
                          <p className="mt-0.5 font-medium text-rose-700 leading-snug">
                            Selected location is <strong>{deliveryDistance.toFixed(1)} km</strong> away. We only deliver within a <strong>5 KM road distance</strong> of our store. Please select a closer location.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. PAYMENT CARD */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <h2 className="font-integral text-xl sm:text-2xl text-slate-950 uppercase tracking-wide">
                  PAYMENT
                </h2>
                <div className="space-y-3">
                  {/* COD */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "cod"
                      ? "border-[#FFC700] bg-[#FFFBEA]"
                      : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <div>
                      <p className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                        💵 Cash on Delivery
                      </p>
                      <p className="text-xs text-slate-500">Pay when you receive your order</p>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "bank_transfer"
                      ? "border-[#FFC700] bg-[#FFFBEA]"
                      : "border-slate-200 bg-slate-100/80 hover:bg-slate-100"
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "bank_transfer"}
                      onChange={() => setPaymentMethod("bank_transfer")}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <div>
                      <p className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                        🏦 Bank Transfer
                      </p>
                      <p className="text-xs text-slate-500">Send screenshot via WhatsApp after ordering</p>
                    </div>
                  </label>
                </div>

                {/* Dropdown: If an item is unavailable, how should we proceed? */}
                <div className="pt-3">
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                    If an item is unavailable, how should we proceed?
                  </label>
                  <div className="relative">
                    <select
                      value={itemUnavailableAction}
                      onChange={(e) => setItemUnavailableAction(e.target.value as "Call me" | "Cancel entire order")}
                      className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-950 focus:bg-white transition-all cursor-pointer appearance-none pr-10"
                    >
                      <option value="Call me">Call me</option>
                      <option value="Cancel entire order">Cancel entire order</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-600">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Special instructions (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-12 rounded-xl bg-slate-100/80 border border-slate-200 px-4 text-sm font-medium focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                  />
                </div>

                {/* Big Yellow CTA Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={!valid || submitting || !isStoreActive}
                    className={`font-integral text-base sm:text-lg uppercase tracking-wider font-black w-full py-4 text-center rounded-full shadow-lg transition-all flex items-center justify-center gap-2 ${valid && isStoreActive && !submitting
                      ? "bg-[#FFC700] text-slate-950 hover:bg-amber-400 active:scale-[0.99] shadow-amber-500/20"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      }`}
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        PROCESSING ORDER...
                      </>
                    ) : isStoreActive ? (
                      "PLACE ORDER"
                    ) : (
                      "STORE CLOSED"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Dark Summary Sidebar Box matching reference */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
              <div className="bg-[#023020] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-800 space-y-6">
                <h2 className="font-integral text-xl sm:text-2xl text-white uppercase tracking-wide">
                  SUMMARY
                </h2>

                {/* Items snapshot list */}
                <div className="space-y-2.5 text-xs sm:text-sm font-medium border-b border-zinc-800 pb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-zinc-300">
                      <span className="truncate max-w-[200px]">
                        {item.name} <span className="text-zinc-500 font-bold">×{item.quantity}</span>
                      </span>
                      <span className="font-bold text-white shrink-0">Rs.{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Coupon Code row */}
                <div className="pt-1">
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 focus-within:border-[#FFC700] transition-colors">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponApplied}
                      className="w-full bg-transparent px-3 text-xs text-white placeholder-zinc-500 focus:outline-none uppercase font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponApplied}
                      className="px-5 py-2 rounded-lg bg-[#FFC700] text-slate-950 font-black text-xs uppercase hover:bg-amber-400 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {couponApplied ? "Applied" : "Apply"}
                    </button>
                  </div>
                </div>

                {/* Cost Calculations */}
                <div className="space-y-3 text-xs sm:text-sm font-semibold pt-2">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Subtotal</span>
                    <span className="font-bold text-white">Rs.{subtotal}</span>
                  </div>

                  {orderType === "delivery" && (
                    <div className="flex justify-between items-center text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span>Delivery</span>
                        {deliveryDistance > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-bold">
                            {deliveryDistance.toFixed(2)} km
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-white">
                        {deliveryLocation ? `Rs.${deliveryFee}` : "Rs. 60"}
                      </span>
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="flex justify-between items-center text-amber-400">
                      <span>Discount</span>
                      <span className="font-bold">- Rs.{discount}</span>
                    </div>
                  )}

                  {/* Divider line */}
                  <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="font-integral text-base sm:text-lg uppercase text-[#FFC700] font-black">
                      Total
                    </span>
                    <span className="font-black text-2xl sm:text-3xl text-[#FFC700]">
                      Rs.{grandTotal}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmed && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-scale-in border border-slate-200">
            <div className="w-20 h-20 rounded-full bg-[#FFC700] text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <span className="material-symbols-outlined text-[48px]">done</span>
            </div>

            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">
              ORDER PLACED SUCCESSFULLY!
            </h2>
            <p className="mt-1 text-sm text-slate-600 font-medium">
              Thank you, {confirmed.name}! Your order has been received.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-xs font-bold border border-slate-200">
              <span>Order ID:</span>
              <span className="text-slate-950 font-black text-sm">{confirmed.orderNumber}</span>
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-2xl text-left space-y-2 text-sm font-semibold border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span>{confirmed.itemCount} items</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Address</span>
                <span className="text-right text-xs truncate max-w-[200px]">{confirmed.address}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-base">
                <span>Total Amount</span>
                <span className="text-amber-600 font-black">Rs. {confirmed.total}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href={`/orders/${confirmed.orderId}`}
                onClick={() => setConfirmed(null)}
                className="flex-1 py-3.5 rounded-full bg-[#FFC700] text-slate-950 font-extrabold text-sm uppercase text-center shadow-md hover:bg-amber-400 transition-colors"
              >
                Track Order
              </Link>
              <button
                onClick={() => setConfirmed(null)}
                className="px-6 py-3.5 rounded-full bg-slate-200 font-bold text-sm text-slate-800 hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
