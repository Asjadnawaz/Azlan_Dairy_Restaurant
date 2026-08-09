import { OrderLineItem } from "./types";

interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderId: string;
  items: OrderLineItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  customerPhone: string;
  orderNote?: string;
}

export function generateOrderConfirmationEmail({
  customerName,
  orderNumber,
  orderId,
  items,
  subtotal,
  deliveryFee,
  total,
  deliveryAddress,
  customerPhone,
  orderNote,
}: OrderConfirmationEmailProps): string {
  const firstName = customerName.split(" ")[0] || customerName;

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #374151;">
          ${item.name}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #374151; text-align: center;">
          ×${item.quantity}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #00230c; font-weight: 700; text-align: right;">
          Rs. ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `
    )
    .join("");

  const isPickup = deliveryAddress.toLowerCase().includes("pickup");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed – ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #00230c 0%, #014d1b 100%); padding: 36px 40px; text-align: center;">
              <h1 style="margin: 0 0 4px; font-size: 28px; font-weight: 900; color: #FFC700; letter-spacing: -0.5px;">
                Azlan Fast Food
              </h1>
              <p style="margin: 0; font-size: 13px; color: #86efac; letter-spacing: 0.5px;">
                &amp; BBQ Point • Malir, Karachi
              </p>
            </td>
          </tr>

          <!-- Hero Status Banner -->
          <tr>
            <td style="background: #FFC700; padding: 20px 40px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #78350f; text-transform: uppercase; letter-spacing: 1px;">
                ✅ Order Confirmed
              </p>
              <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #1c1917;">
                ${orderNumber}
              </h2>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 20px;">
              <p style="margin: 0; font-size: 17px; color: #111827; font-weight: 600;">
                Salaam ${firstName}! 🎉
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Your order has been successfully placed and our kitchen team is already getting to work. We'll have your food ready soon!
              </p>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.8px;">
                🍔 Your Order
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: left; text-transform: uppercase; letter-spacing: 0.6px;">Item</th>
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: center; text-transform: uppercase; letter-spacing: 0.6px;">Qty</th>
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: right; text-transform: uppercase; letter-spacing: 0.6px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Subtotal</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151; font-weight: 600; text-align: right;">Rs. ${subtotal.toLocaleString()}</td>
                </tr>
                ${
                  !isPickup
                    ? `<tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Delivery Fee</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151; font-weight: 600; text-align: right;">Rs. ${deliveryFee.toLocaleString()}</td>
                </tr>`
                    : `<tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #16a34a;">Delivery</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #16a34a; font-weight: 600; text-align: right;">Store Pickup</td>
                </tr>`
                }
                <tr>
                  <td colspan="2" style="padding-top: 10px; border-top: 1px solid #d1d5db;"></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 16px; font-weight: 900; color: #00230c;">Total</td>
                  <td style="padding: 4px 0; font-size: 18px; font-weight: 900; color: #00230c; text-align: right;">Rs. ${total.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Details -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="background: #f9fafb; padding: 14px 16px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px;">
                      📍 ${isPickup ? "Pickup Location" : "Delivery Address"}
                    </p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #374151;">${deliveryAddress}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background: #f9fafb; padding: 14px 16px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px;">
                      📞 Contact Number
                    </p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #374151;">${customerPhone}</p>
                  </td>
                </tr>
                ${
                  orderNote
                    ? `<tr>
                  <td style="background: #fffbeb; padding: 14px 16px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px;">
                      📝 Special Note
                    </p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #374151;">${orderNote}</p>
                  </td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Payment Method -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center;">
                <p style="margin: 0; font-size: 13px; color: #15803d; font-weight: 600;">
                  💵 Payment: Cash on Delivery — Please keep cash ready upon arrival.
                </p>
              </div>
            </td>
          </tr>

          <!-- Estimated Time -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; text-align: center;">
                <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #1d4ed8;">⏱ Estimated Delivery Time</p>
                <p style="margin: 0; font-size: 22px; font-weight: 900; color: #1e40af;">30 – 45 Minutes</p>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                Questions? Call or WhatsApp us directly.
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #00230c;">
                🍗 Azlan Fast Food &amp; BBQ Point
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Khokhrapar, Sabir Colony, Malir, Karachi &bull; Order ID: ${orderId}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
