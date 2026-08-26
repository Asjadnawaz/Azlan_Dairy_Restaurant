import { NextResponse } from "next/server";
import { readStoreStatusFresh } from "@/lib/settings.server";
import { toStoreStatusPayload } from "@/lib/store-hours";

/**
 * The one authoritative answer to "is the shop open right now?".
 *
 * Also the enforcement point for the 30-minute force-open lapse: reading the
 * status is what retires an expired override (see readStoreStatusFresh). The
 * customer site polls this rarely — the `settings` realtime channel does the
 * heavy lifting — but that poll is what guarantees the shop closes itself even
 * if nobody with admin rights is around.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { settings, status } = await readStoreStatusFresh();

    return NextResponse.json(
      {
        status: toStoreStatusPayload(status),
        // The raw schedule goes with it so the browser can re-derive the answer
        // from its own clock every half minute, instead of polling this route.
        schedule: {
          open_mode: settings?.open_mode ?? null,
          force_open_until: settings?.force_open_until ?? null,
          open_hour: settings?.open_hour ?? null,
          close_hour: settings?.close_hour ?? null,
          is_active: settings?.is_active ?? true,
        },
        // Small, public bits the closed banner and hero show alongside the
        // status, so they never need a second round trip.
        shop: {
          phone: settings?.phone ?? null,
          whatsapp: settings?.whatsapp_number ?? null,
          hours: status.operatingHoursText,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Store status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
