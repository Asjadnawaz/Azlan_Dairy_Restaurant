"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { MapPicker } from "./map-picker";
import { calculateDeliveryFromCoordinates } from "@/lib/delivery";
import { AuthModal } from "./auth-modal";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";

interface CartDrawerProps {
  isStoreActive: boolean;
}

export function CartDrawer({ isStoreActive }: CartDrawerProps) {
  const {
    items,
    isOpen,
    step,
    close,
    setStep,
    updateQty,
    remove,
    clear,
    totalPrice,
    totalItems,
  } = useCart();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [deliveryFee, setDeliveryFee] = useState(60);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    itemCount: number;
    name: string;
    address: string;
    phone: string;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Save order to localStorage after successful placement
  const saveOrderToStorage = (
    orderNumber: string,
    phone: string,
    total: number,
    itemsSnapshot: { id: string; name: string; price: number; quantity: number; image_path?: string | null }[]
  ) => {
    try {
      const stored = JSON.parse(localStorage.getItem("azlan-orders") || "[]");
      stored.unshift({ orderNumber, phone, total, timestamp: Date.now(), items: itemsSnapshot });
      localStorage.setItem("azlan-orders", JSON.stringify(stored.slice(0, 5))); // Keep last 5
    } catch {}
  };

  useEffect(() => {
    setMounted(true);
    // Check for existing auth session
    getCurrentUser().then((user) => {
      if (user) setUserId(user.id);
    }).catch(() => {
      // No user logged in, that's fine
    });

    // Listen to auth state changes to update userId
    const subscription = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const subtotal = totalPrice();
  const itemCount = totalItems();
  const total = subtotal + deliveryFee;

  // Handle location selection and calculate delivery fee
  const handleLocationSelect = (lat: number, lng: number) => {
    setDeliveryLocation({ lat, lng });
    const { distanceKm, deliveryFee: fee, breakdown } = calculateDeliveryFromCoordinates(lat, lng);
    setDeliveryDistance(distanceKm);
    setDeliveryFee(fee);
    setDeliveryBreakdown(breakdown);
  };

  const valid =
    form.name.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.phone.replace(/\D/g, "").length >= 8 &&
    deliveryLocation !== null;

  async function handleSubmit() {
    if (!valid || submitting) return;

    // Check for authentication
    if (!userId) {
      setShowAuthModal(true);
      return;
    }

    // Debug log to check delivery values
    console.log("📍 DEBUG - Submitting order with delivery data:", {
      deliveryFee,
      deliveryDistance,
      deliveryLocation,
      hasLocation: deliveryLocation !== null,
    });

    setSubmitting(true);

    try {
      // 1. Submit order to Supabase via the SECURITY DEFINER RPC
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_phone: form.phone,
          customer_address: form.address,
          customer_note: form.note,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            image_path: i.image_path,
            quantity: i.quantity,
          })),
          subtotal,
          delivery_fee: deliveryFee,
          delivery_distance_km: deliveryDistance,
          delivery_coordinates: deliveryLocation,
          total,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // 2. Capture details for the confirmation modal BEFORE clearing the cart
      const orderNumber = data.order_number ?? "AD-???";
      const orderId = data.order_id;
      const snapshot = {
        orderId,
        orderNumber,
        total,
        itemCount,
        name: form.name,
        address: form.address,
        phone: form.phone,
      };

      // 3. Clear cart + reset form
      clear();
      setForm({ name: "", phone: "", address: "", note: "" });
      setStep("cart");
      close();

      // 4. Save order to localStorage for tracking page
      saveOrderToStorage(
        orderNumber,
        form.phone,
        total,
        items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image_path: i.image_path }))
      );

      // 5. Show animated confirmation modal
      setConfirmed(snapshot);
      toast.success(`Order ${orderNumber} placed successfully!`);
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  // Avoid SSR rendering the drawer
  if (!mounted) return null;

  return (
    <>
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(id) => {
          setUserId(id);
          setShowAuthModal(false);
          setStep("checkout"); // Automatically proceed to checkout after auth
        }}
      />

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-[var(--color-inverse-surface)]/50 animate-fade-in"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[100] h-full w-full max-w-md
          bg-[var(--color-surface-container-lowest)] shadow-2xl
          transform transition-transform duration-300 slim-scrollbar overflow-y-auto
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--color-surface-container-lowest)] border-b border-[var(--color-outline-variant)] px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">
              {step === "checkout" ? "receipt_long" : "shopping_cart"}
            </span>
            {step === "checkout" ? "Checkout" : `Your Cart (${itemCount})`}
          </h2>
          <button onClick={close} className="p-2 rounded-full hover:bg-[var(--color-surface-container)]" aria-label="Close cart">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* STEP 1: CART */}
        {step === "cart" && (
          <div className="p-5 flex flex-col gap-4">
            {/* Malir delivery notice */}
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-secondary-brand)]/10 border border-[var(--color-secondary-brand)]/20">
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">location_on</span>
              <span className="text-xs font-semibold text-[var(--color-primary)]">Delivering exclusively in Malir only</span>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-[64px] text-[var(--color-on-surface-variant)]/40">
                  shopping_bag
                </span>
                <p className="mt-4 font-semibold">Your cart is empty</p>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Add some delicious items to get started!
                </p>
                <button
                  onClick={close}
                  className="mt-6 px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                {/* Line items */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-container-low)]"
                  >
                    <img
                      src={item.image_path || "/images/burger.jpg"}
                      alt={item.name}
                      className="w-16 h-16 rounded-[var(--radius-md)] object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                      <p className="text-sm text-[var(--color-primary)] font-bold">
                        Rs. {item.price * item.quantity}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-outline-variant)] flex items-center justify-center transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-outline-variant)] flex items-center justify-center transition-colors"
                          aria-label="Increase quantity"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                        <button
                          onClick={() => remove(item.id)}
                          className="ml-auto p-1.5 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                          aria-label="Remove item"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={clear}
                  className="text-sm text-[var(--color-error)] font-medium hover:underline self-start"
                >
                  Clear cart
                </button>

                {/* Totals */}
                <div className="mt-2 p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-container-low)] space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-on-surface-variant)]">Subtotal</span>
                    <span className="font-semibold">Rs. {subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-on-surface-variant)]">Delivery</span>
                    <span className="font-semibold">
                      {deliveryLocation ? (
                        <>
                          Rs. {deliveryFee}
                          <span className="text-xs text-[var(--color-on-surface-variant)] font-normal ml-1">
                            ({deliveryDistance} km)
                          </span>
                        </>
                      ) : (
                        "Select location"
                      )}
                    </span>
                  </div>
                  <div className="border-t border-[var(--color-outline-variant)] pt-2 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-[var(--color-primary)] text-lg">Rs. {total}</span>
                  </div>
                </div>

                {/* Checkout button */}
                <button
                  onClick={() => {
                    if (!userId) {
                      setShowAuthModal(true);
                    } else {
                      setStep("checkout");
                    }
                  }}
                  disabled={!isStoreActive}
                  className={`w-full py-3.5 rounded-full font-bold text-white transition-all custom-shadow
                    ${isStoreActive
                      ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-container)]"
                      : "bg-[var(--color-on-surface-variant)]/40 cursor-not-allowed"}`}
                >
                  {isStoreActive ? "Proceed to Checkout" : "Store Closed"}
                </button>
                {!isStoreActive && (
                  <p className="text-xs text-center text-[var(--color-error)]">
                    We&apos;re currently not accepting orders. Please try again later.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* STEP 2: CHECKOUT */}
        {step === "checkout" && (
          <div className="p-5 flex flex-col gap-4">
            <button
              onClick={() => setStep("cart")}
              className="flex items-center gap-1 text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] self-start"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Cart
            </button>

            {/* Malir-only delivery notice */}
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-secondary-brand)]/10 border border-[var(--color-secondary-brand)]/20">
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">info</span>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                Deliveries currently available only in <strong className="text-[var(--color-primary)]">Malir, Karachi</strong>.
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Delivery Address *</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House #, Street, Area, Malir, Karachi"
                  rows={3}
                  className="w-full rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all resize-none"
                />
              </div>

              {/* Map Picker for Delivery Location */}
              <div>
                <MapPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={deliveryLocation || undefined}
                />
                {deliveryBreakdown && (
                  <p className="mt-2 text-xs text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-low)] px-3 py-2 rounded-[var(--radius-md)]">
                    💡 {deliveryBreakdown}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ring the bell, no onion, etc."
                  className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                />
              </div>
            </div>

            {/* Order summary */}
            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-container-low)] space-y-1.5 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Total ({itemCount} items)</span>
                <span className="text-[var(--color-primary)] text-lg">Rs. {total}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className={`w-full py-3.5 rounded-full font-bold text-white transition-all flex items-center justify-center gap-2 custom-shadow
                ${valid && !submitting
                  ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-container)]"
                  : "bg-[var(--color-on-surface-variant)]/40 cursor-not-allowed"}`}
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  Placing Order...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Place Order
                </>
              )}
            </button>
            {!valid && (
              <p className="text-xs text-center text-[var(--color-on-surface-variant)]">
                Please fill in name, address, and a valid phone number.
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Order Placed Confirmation Modal */}
      {confirmed && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--color-inverse-surface)]/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmed(null);
          }}
        >
          <div className="relative w-full max-w-sm bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] custom-shadow-lg overflow-hidden animate-scale-in">
            {/* Top accent */}
            <div className="h-1.5 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-mint-accent)] to-[var(--color-secondary-brand)]" />

            <div className="p-6 sm:p-8 text-center">
              {/* Animated success icon */}
              <div className="relative mx-auto w-20 h-20 mb-4">
                <span className="absolute inset-0 rounded-full bg-[var(--color-primary)]/15 animate-soft-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-[var(--color-primary)] flex items-center justify-center animate-scale-in">
                  <span className="material-symbols-outlined text-[44px] text-white">
                    check
                  </span>
                </div>
              </div>

              <h2 className="text-xl font-extrabold text-[var(--color-primary)]">
                Order Placed Successfully!
              </h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Thank you, {confirmed.name.split(" ")[0]}! We&apos;ve received your order.
              </p>

              {/* Order number badge */}
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-surface-container)]">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">
                  receipt
                </span>
                <span className="text-xs text-[var(--color-on-surface-variant)]">Order ID</span>
                <span className="font-extrabold text-[var(--color-primary)] tracking-wide">
                  {confirmed.orderNumber}
                </span>
              </div>

              {/* Summary */}
              <div className="mt-5 text-left rounded-[var(--radius-lg)] bg-[var(--color-surface-container-low)] divide-y divide-[var(--color-outline-variant)]/60">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                    Items
                  </span>
                  <span className="font-semibold">{confirmed.itemCount}</span>
                </div>
                <div className="flex items-start justify-between px-4 py-3 text-sm gap-3">
                  <span className="flex items-center gap-2 text-[var(--color-on-surface-variant)] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    Delivery
                  </span>
                  <span className="font-medium text-right">{confirmed.address}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-bold">Total</span>
                  <span className="font-extrabold text-[var(--color-primary)] text-lg">
                    Rs. {confirmed.total}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]/80 leading-relaxed">
                We&apos;ll prepare your order with care. Use Track Order anytime to view its latest status.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <a
                  href={`/orders/${confirmed.orderId}`}
                  onClick={() => setConfirmed(null)}
                  className="flex-1 py-3 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm hover:bg-[var(--color-primary-container)] transition-colors custom-shadow text-center"
                >
                  Track Order
                </a>
                <button
                  onClick={() => setConfirmed(null)}
                  className="px-6 py-3 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface)] font-bold text-sm hover:bg-[var(--color-surface-container-highest)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
