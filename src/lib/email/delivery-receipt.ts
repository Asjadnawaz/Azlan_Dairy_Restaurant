import type { OrderItem } from "@/lib/supabase/database.types";

interface DeliveryReceiptEmailProps {
  customerName: string;
  orderNumber: string;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  customerPhone: string;
}

export function generateDeliveryReceiptEmail({
  customerName,
  orderNumber,
  orderId,
  items,
  subtotal,
  deliveryFee,
  total,
  deliveryAddress,
  customerPhone,
}: DeliveryReceiptEmailProps): string {
  const firstName = customerName.split(" ")[0] || customerName;

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #374151;">
          ${item.name_snapshot}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #374151; text-align: center;">
          ×${item.quantity}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #00230c; font-weight: 700; text-align: right;">
          Rs. ${item.line_total.toLocaleString()}
        </td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Delivered – ${orderNumber}</title>
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
            <td style="background: #22c55e; padding: 20px 40px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                🎉 Order Delivered Successfully
              </p>
              <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">
                ${orderNumber}
              </h2>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 20px;">
              <p style="margin: 0; font-size: 17px; color: #111827; font-weight: 600;">
                Salaam ${firstName}! 🍽️
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Your order has been delivered! We hope you enjoy your meal. Please take a moment to leave a review and let us know how we did.
              </p>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.8px;">
                Order Summary
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: left; text-transform: uppercase;">Item</th>
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: center; text-transform: uppercase;">Qty</th>
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: right; text-transform: uppercase;">Price</th>
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
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Delivery Fee</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151; font-weight: 600; text-align: right;">Rs. ${deliveryFee.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 10px; border-top: 1px solid #d1d5db;"></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 16px; font-weight: 900; color: #00230c;">Total Paid</td>
                  <td style="padding: 4px 0; font-size: 18px; font-weight: 900; color: #00230c; text-align: right;">Rs. ${total.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Review CTA Button -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="https://azlandairy.com/orders/${orderId}" target="_blank" style="display: inline-block; background-color: #00230c; color: #FFC700; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(0,35,12,0.25);">
                ⭐ Rate &amp; Review Your Food
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                Thank you for choosing Azlan Fast Food &amp; BBQ Point!
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Khokhrapar, Sabir Colony, Malir, Karachi • Order ID: ${orderId}
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
