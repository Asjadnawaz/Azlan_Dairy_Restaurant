import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

interface OrderLineItem {
  id: string;
  name: string;
  price: number;
  image_path?: string;
  quantity: number;
}

interface CreateOrderBody {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_note?: string;
  items: OrderLineItem[];
  subtotal: number;
  delivery_fee: number;
  delivery_distance_km?: number;
  delivery_coordinates?: { lat: number; lng: number };
  total: number;
  user_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    // Server-side validation
    const name = body.customer_name?.trim();
    const phone = body.customer_phone?.trim();
    const address = body.customer_address?.trim();

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, address" },
        { status: 400 }
      );
    }
    if (phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Verify store is active (kill-switch)
    const { data: settings } = await supabase
      .from("settings")
      .select("is_active")
      .single();
    if (settings && !settings.is_active) {
      return NextResponse.json(
        { error: "Store is currently closed" },
        { status: 403 }
      );
    }

    // Delegate order + line items creation to the SECURITY DEFINER RPC.
    // The RPC runs as the table owner (bypassing RLS), performs server-side
    // validation, and inserts the order + items atomically in one transaction.
    const { data: result, error: rpcError } = await supabase.rpc(
      "create_order",
      {
        p_customer_name: name,
        p_customer_phone: phone,
        p_customer_address: address,
        p_customer_note: body.customer_note?.trim() || null,
        p_subtotal: body.subtotal,
        p_total: body.total,
        p_items: body.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      }
    );

    if (rpcError) {
      console.error("create_order RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to create order", detail: rpcError.message },
        { status: 500 }
      );
    }

    // RPC returns { success, order_id, order_number } or { success, error }
    const rpcResult = result as
      | { success: boolean; order_id?: string; order_number?: string; error?: string };

    if (!rpcResult?.success) {
      console.error("create_order RPC returned failure:", rpcResult?.error);
      return NextResponse.json(
        { error: "Failed to create order", detail: rpcResult?.error },
        { status: 400 }
      );
    }

    // Update order with delivery and user information
    const orderId = rpcResult.order_id;

    // Update with delivery and auth information
    const updateData: any = {
      delivery_distance_km: body.delivery_distance_km,
      delivery_coordinates: body.delivery_coordinates,
    };

    if (user?.id) {
      updateData.user_id = user.id;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order with delivery info:", updateError);
      // Don't fail the order, just log the error
    }

    return NextResponse.json({
      success: true,
      order_id: rpcResult.order_id,
      order_number: rpcResult.order_number,
    });
  } catch (err) {
    console.error("Create order exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
