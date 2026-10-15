export type Confirmation = {
  orderId: string;
  orderNumber: string;
  total: number;
  itemCount: number;
  name: string;
  address: string;
};

/* -------------------------------------------------------------------------- */
/* Local order history                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Guests have no row to look their order up by, so /orders and the review
 * watcher both read this list. Keys must stay as they are — `readLocalOrders`
 * in src/lib/reviews-local.ts parses the same shape.
 */
export function saveOrderToStorage(
  confirmation: Confirmation,
  phone: string,
  subtotal: number,
  deliveryFee: number,
  items: { id: string; name: string; price: number; quantity: number; image_path: string }[]
): void {
  try {
    const stored = JSON.parse(localStorage.getItem("azlan-orders") || "[]") as {
      orderNumber?: string;
      id?: string;
    }[];

    const entry = {
      id: confirmation.orderId,
      orderNumber: confirmation.orderNumber,
      phone,
      total: confirmation.total,
      subtotal,
      delivery_fee: deliveryFee,
      customer_name: confirmation.name,
      customer_address: confirmation.address,
      status: "pending",
      timestamp: Date.now(),
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image_path: i.image_path,
      })),
    };

    const filtered = stored.filter(
      (o) => o.orderNumber !== confirmation.orderNumber && o.id !== confirmation.orderId
    );
    filtered.unshift(entry);
    localStorage.setItem("azlan-orders", JSON.stringify(filtered.slice(0, 10)));
  } catch {
    /* Private mode or a full quota — the order is placed either way. */
  }
}
