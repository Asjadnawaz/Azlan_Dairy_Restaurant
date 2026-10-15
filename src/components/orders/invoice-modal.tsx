"use client";

import type { StoredOrder } from "@/lib/reviews-local";

/**
 * On-screen copy of the invoice. The printable version lives in
 * `lib/invoice-print.ts` (a hidden iframe, because the global print stylesheet
 * only lets the thermal receipt through).
 */
export function InvoiceModal({
  order,
  onClose,
  onPrint,
}: {
  order: StoredOrder;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] rounded-3xl max-w-xl w-full border border-[var(--color-surface-variant)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Invoice Header */}
        <div className="px-6 py-5 bg-[var(--color-primary)] text-white flex items-center justify-between border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-mint-accent)] font-bold">Official Invoice</p>
            <h2 className="text-xl font-black tracking-tight">AZLAN FAST FOOD & BBQ POINT</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-white text-[20px]">close</span>
          </button>
        </div>

        {/* Invoice Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-[var(--color-surface-variant)]">
            <div>
              <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-semibold">Order Number</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">#{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-semibold">Date & Time</p>
              <p className="font-semibold">
                {new Date(order.timestamp ?? 0).toLocaleString("en-PK", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-semibold">Status</p>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                PAID / COMPLETE
              </span>
            </div>
          </div>

          {order.customer_name && (
            <div className="bg-[var(--color-surface-container-low)] p-3.5 rounded-xl space-y-1 border border-[var(--color-surface-variant)]">
              <p className="font-bold text-xs uppercase text-[var(--color-on-surface-variant)]">Customer Information</p>
              <p className="font-semibold">{order.customer_name}</p>
              {order.phone && <p className="text-xs text-[var(--color-on-surface-variant)]">Phone: {order.phone}</p>}
              {order.customer_address && <p className="text-xs text-[var(--color-on-surface-variant)]">Address: {order.customer_address}</p>}
            </div>
          )}

          {/* Items Table */}
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-2">Item Breakdown</p>
            <div className="border border-[var(--color-surface-variant)] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--color-surface-container-low)] text-xs font-bold uppercase border-b border-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface-variant)]">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium">{item.name}</td>
                      <td className="py-2.5 px-3 text-center text-xs font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-xs">Rs. {item.price}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-xs">Rs. {item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-[var(--color-surface-variant)] pt-3 space-y-1.5 text-xs">
            {order.subtotal !== undefined && (
              <div className="flex justify-between text-[var(--color-on-surface-variant)]">
                <span>Subtotal</span>
                <span className="font-medium text-[var(--color-on-surface)]">Rs. {order.subtotal}</span>
              </div>
            )}
            {order.delivery_fee !== undefined && order.delivery_fee > 0 && (
              <div className="flex justify-between text-[var(--color-on-surface-variant)]">
                <span>Delivery Fee</span>
                <span className="font-medium text-[var(--color-on-surface)]">Rs. {order.delivery_fee}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base pt-2 border-t border-[var(--color-surface-variant)] text-[var(--color-primary)]">
              <span>Total Amount Paid</span>
              <span style={{ color: "var(--color-cta-yellow)" }}>Rs. {order.total}</span>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-[var(--color-surface-container-low)] border-t border-[var(--color-surface-variant)] flex items-center justify-end gap-3">
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Invoice
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-xs font-bold hover:bg-[var(--color-surface-variant)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
