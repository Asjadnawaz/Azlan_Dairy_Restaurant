import type { OrderItem } from "@/lib/supabase/database.types";
import type { OrderLineItem } from "./types";

interface DeliveryReceiptEmailProps {
  customerName: string;
  orderNumber: string;
  orderId: string;
  items: (OrderItem | OrderLineItem)[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress?: string;
  customerPhone?: string;
  siteUrl?: string;
  supportPhone?: string;
}

export function generateDeliveryReceiptEmail({
  customerName,
  orderNumber,
  orderId,
  items,
  subtotal,
  deliveryFee,
  total,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://azlanfastfood.com",
  supportPhone = "0300-0000000",
}: DeliveryReceiptEmailProps): string {
  const firstName = customerName.split(" ")[0] || customerName;
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const reviewUrl = `${cleanSiteUrl}/orders/${orderId}`;

  const itemsRows = items
    .map((item) => {
      const name = "name_snapshot" in item ? item.name_snapshot : item.name;
      const lineTotal = "line_total" in item ? item.line_total : item.price * item.quantity;
      return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937; vertical-align: top;">
          <div style="font-weight: 600; color: #111827;">${name}</div>
        </td>
        <td style="padding: 12px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280; text-align: center; vertical-align: top; white-space: nowrap;">
          × ${item.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 600; color: #111827; text-align: right; vertical-align: top; white-space: nowrap;">
          Rs. ${lineTotal.toLocaleString()}
        </td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Delivered – ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">

          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <h1 style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #00230c;">
                AZLAN FAST FOOD &amp; BBQ
              </h1>
              <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase;">
                Karachi, Pakistan
              </p>
            </td>
          </tr>

          <!-- Main Status Header -->
          <tr>
            <td style="padding: 28px 32px 20px;">
              <div style="display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px;">
                Order #${orderNumber} &bull; Delivered
              </div>
              <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">
                Order Delivered
              </h2>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                Salaam ${firstName}, your order has been delivered. We hope you enjoy your meal.
              </p>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #00230c; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 11px 24px; border-radius: 6px; letter-spacing: 0.3px;">
                Rate &amp; Review Your Food →
              </a>
            </td>
          </tr>

          <!-- Receipt Items Table -->
          <tr>
            <td style="padding: 0 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <thead>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <th style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: left; text-transform: uppercase; letter-spacing: 0.8px;">Item</th>
                    <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: center; text-transform: uppercase; letter-spacing: 0.8px;">Qty</th>
                    <th style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #9ca3af; text-align: right; text-transform: uppercase; letter-spacing: 0.8px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals Calculation -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 4px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">Subtotal</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #374151; font-weight: 500; text-align: right;">Rs. ${subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">Delivery Fee</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #374151; font-weight: 500; text-align: right;">Rs. ${deliveryFee.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 8px; border-bottom: 1px solid #e5e7eb;"></td>
                </tr>
                <tr>
                  <td style="padding: 10px 0 0; font-size: 15px; font-weight: 700; color: #111827;">Total Paid (COD)</td>
                  <td style="padding: 10px 0 0; font-size: 16px; font-weight: 800; color: #00230c; text-align: right;">Rs. ${total.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quality Note -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 14px 18px;">
                <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">
                  Your satisfaction is our priority. If anything was not up to standard with your order, please reach out to us at ${supportPhone} and we will make it right.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; background-color: #fafaf9; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #1f2937;">
                Azlan Fast Food &amp; BBQ Point
              </p>
              <p style="margin: 0 0 12px; font-size: 12px; color: #6b7280; line-height: 1.5;">
                Main Khokhrapar no. 2.5, Malir, Karachi<br />
                Operating Hours: 7:00 PM – 3:00 AM Daily
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Order ID: ${orderId} &bull; Thank you for ordering with us.
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
