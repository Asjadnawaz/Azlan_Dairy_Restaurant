import type { StoredOrder } from "@/lib/reviews-local";

/** Item names come from the database and go into a printed HTML document. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Print one invoice.
 *
 * `window.print()` cannot be used here: the site's global `@media print` block
 * (globals.css) hides every top-level node except `#thermal-receipt-print-portal`
 * so the 80mm thermal receipt prints cleanly — which means printing this modal
 * directly yields a blank page. Instead we render the invoice into a hidden
 * iframe that carries its own stylesheet and print only that document.
 */
export function printInvoice(order: StoredOrder): void {
  const rows = (order.items || [])
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td class="c">${item.quantity}</td><td class="r">Rs. ${item.price}</td><td class="r">Rs. ${item.price * item.quantity}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(order.orderNumber ?? "")}</title>
      <style>
        *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
        body{margin:0;padding:28px;color:#111}
        h1{margin:0;font-size:20px;color:#0a3318}
        .muted{color:#666;font-size:12px}
        .meta{display:flex;justify-content:space-between;gap:16px;margin:18px 0;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
        th,td{padding:8px 6px;border-bottom:1px solid #e5e5e5;text-align:left}
        th{background:#f5f5f5;text-transform:uppercase;font-size:11px}
        .c{text-align:center}.r{text-align:right}
        .totals{margin-top:14px;font-size:13px}
        .totals div{display:flex;justify-content:space-between;padding:3px 0}
        .grand{font-weight:800;font-size:16px;color:#0a3318;border-top:2px solid #0a3318;padding-top:8px;margin-top:6px}
      </style></head><body>
      <h1>AZLAN FAST FOOD &amp; BBQ POINT</h1>
      <p class="muted">Official Invoice</p>
      <div class="meta">
        <div><div class="muted">Order</div><b>#${escapeHtml(order.orderNumber ?? "")}</b></div>
        <div><div class="muted">Date</div>${new Date(order.timestamp ?? 0).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</div>
        <div><div class="muted">Status</div>PAID / COMPLETE</div>
      </div>
      ${order.customer_name ? `<p class="muted">Customer: <b style="color:#111">${escapeHtml(order.customer_name)}</b>${order.phone ? ` · ${escapeHtml(order.phone)}` : ""}</p>` : ""}
      <table><thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        ${order.subtotal !== undefined ? `<div><span>Subtotal</span><span>Rs. ${order.subtotal}</span></div>` : ""}
        ${order.delivery_fee ? `<div><span>Delivery</span><span>Rs. ${order.delivery_fee}</span></div>` : ""}
        <div class="grand"><span>Total Paid</span><span>Rs. ${order.total}</span></div>
      </div>
      </body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  // Give the print dialog time to grab the document before we drop the frame.
  window.setTimeout(() => {
    if (frame.parentNode) frame.parentNode.removeChild(frame);
  }, 1000);
}
