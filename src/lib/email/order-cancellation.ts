import type { OrderItem } from "@/lib/supabase/database.types";
import type { OrderLineItem } from "./types";

interface OrderCancellationEmailProps {
  customerName: string;
  orderNumber: string;
  orderId: string;
  cancellationReason?: string | null;
  items?: (OrderItem | OrderLineItem)[];
  total?: number;
  siteUrl?: string;
  supportPhone?: string;
}

export function generateOrderCancellationEmail({
  customerName,
  orderNumber,
  orderId,
  cancellationReason,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://azlanfastfood.com",
  supportPhone = "0300-0000000",
}: OrderCancellationEmailProps): string {
  const firstName = customerName.split(" ")[0] || customerName;
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const menuUrl = `${cleanSiteUrl}/#menu`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Cancelled – ${orderNumber}</title>
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
              <div style="display: inline-block; background-color: #fef2f2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px;">
                Order #${orderNumber} &bull; Cancelled
              </div>
              <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">
                Order Cancelled
              </h2>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                Salaam ${firstName}, we are writing to inform you that your order #${orderNumber} has been cancelled.
              </p>
            </td>
          </tr>

          <!-- Reason & Reassurance Box -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 18px 20px;">
                ${
                  cancellationReason
                    ? `
                  <div style="margin-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.6px; margin-bottom: 3px;">
                      Reason
                    </div>
                    <div style="font-size: 13px; color: #1f2937; font-weight: 500;">
                      ${cancellationReason}
                    </div>
                  </div>
                `
                    : ""
                }
                <div>
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.6px; margin-bottom: 3px;">
                    Payment Notice
                  </div>
                  <div style="font-size: 13px; color: #4b5563; line-height: 1.5;">
                    No payment was charged for this order (Cash on Delivery).
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <a href="${menuUrl}" target="_blank" style="display: inline-block; background-color: #00230c; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 11px 24px; border-radius: 6px; letter-spacing: 0.3px;">
                View Menu &amp; Order Again →
              </a>
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
                Order ID: ${orderId} &bull; If you have any questions, call us at ${supportPhone}
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
