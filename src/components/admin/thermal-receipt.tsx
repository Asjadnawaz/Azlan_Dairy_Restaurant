"use client";

import React from "react";
import type { Order, OrderItem, Settings } from "@/lib/supabase/database.types";

interface ThermalReceiptProps {
  order: Order | null;
  items: OrderItem[];
  settings?: Settings | null;
  paperWidth?: "80mm" | "58mm";
  isModalPreview?: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function parseOrderNote(noteStr: string | null) {
  if (!noteStr) {
    return {
      orderTypeTag: null,
      paymentTag: null,
      unavailableTag: null,
      customNote: null,
    };
  }

  let remaining = noteStr;

  let orderTypeTag: string | null = null;
  const typeMatch = remaining.match(/\[(PICKUP|DELIVERY)\]/i);
  if (typeMatch) {
    orderTypeTag = typeMatch[1].toUpperCase();
    remaining = remaining.replace(typeMatch[0], "");
  }

  let paymentTag: string | null = null;
  const payMatch = remaining.match(/\[(COD|BANK_TRANSFER|ONLINE)\]/i);
  if (payMatch) {
    paymentTag = payMatch[1].toUpperCase();
    remaining = remaining.replace(payMatch[0], "");
  }

  let unavailableTag: string | null = null;
  const unavailMatch = remaining.match(
    /\[(?:If unavailable|UNAVAILABLE ITEM):\s*([^\]]+)\]/i
  );
  if (unavailMatch) {
    unavailableTag = unavailMatch[1].trim();
    remaining = remaining.replace(unavailMatch[0], "");
  }

  const customNote = remaining.trim();

  return { orderTypeTag, paymentTag, unavailableTag, customNote };
}

export function ThermalReceipt({
  order,
  items,
  settings,
  paperWidth = "80mm",
  isModalPreview = false,
}: ThermalReceiptProps) {
  if (!order) return null;

  const parsedNote = parseOrderNote(order.customer_note);
  const isPickup =
    parsedNote.orderTypeTag === "PICKUP" ||
    order.customer_address?.toLowerCase().includes("store pickup");

  const storeName = "AZLAN FAST FOOD RESTAURANT";
  const storePhone = settings?.phone || "0300-1234567";
  const storeAddress = settings?.address
    ? settings.address.replace(/Azlan Dairy/gi, "Azlan Fast Food")
    : "Azlan Fast Food Restaurant, Malir, Karachi";

  const is58mm = paperWidth === "58mm";

  return (
    <div
      id={isModalPreview ? undefined : "thermal-receipt-printable-root"}
      className={`thermal-receipt-container ${is58mm ? "paper-58mm" : "paper-80mm"}`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: is58mm ? "11px" : "12px",
        lineHeight: "1.25",
        color: "#000000",
        backgroundColor: "#ffffff",
        display: isModalPreview ? "block" : undefined,
        width: "100%",
        maxWidth: is58mm ? "58mm" : "80mm",
        margin: "0 auto",
        padding: is58mm ? "4px 2px" : "8px 6px",
        boxSizing: "border-box",
      }}
    >
      {/* Header section */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h2
          style={{
            fontSize: is58mm ? "15px" : "18px",
            fontWeight: "900",
            margin: "0 0 2px 0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {storeName}
        </h2>
        <p style={{ margin: "0 0 2px 0", fontSize: is58mm ? "10px" : "11px" }}>
          {storeAddress}
        </p>
        <p style={{ margin: "0 0 4px 0", fontSize: is58mm ? "10px" : "11px" }}>
          Tel: {storePhone}
        </p>
        <div
          style={{
            borderTop: "1px dashed #000",
            borderBottom: "1px dashed #000",
            padding: "4px 0",
            margin: "4px 0",
            fontWeight: "bold",
          }}
        >
          <div style={{ fontSize: is58mm ? "14px" : "16px", fontWeight: "900" }}>
            ORDER {order.order_number}
          </div>
          <div style={{ fontSize: is58mm ? "10px" : "11px", marginTop: "2px" }}>
            {formatDate(order.placed_at)}
          </div>
        </div>
      </div>

      {/* Order Type & Payment Tag */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          marginBottom: "6px",
          fontSize: is58mm ? "11px" : "12px",
        }}
      >
        <span>TYPE: {isPickup ? "[ PICKUP ]" : "[ DELIVERY ]"}</span>
        <span>
          {parsedNote.paymentTag === "BANK_TRANSFER" ? "PAID (BANK)" : "COD"}
        </span>
      </div>

      {/* Customer Info */}
      <div
        style={{
          borderBottom: "1px dashed #000",
          paddingBottom: "6px",
          marginBottom: "6px",
          fontSize: is58mm ? "10px" : "11px",
        }}
      >
        <div>
          <strong>Customer:</strong> {order.customer_name}
        </div>
        <div>
          <strong>Phone:</strong> {order.customer_phone}
        </div>
        {!isPickup && (
          <div style={{ marginTop: "2px" }}>
            <div>
              <strong>Address:</strong> {order.customer_address}
            </div>
            {order.delivery_coordinates && !order.customer_address?.includes("GPS:") && (
              <div style={{ fontSize: is58mm ? "9px" : "10px", marginTop: "2px", fontWeight: "bold" }}>
                GPS PIN: {order.delivery_coordinates.lat.toFixed(5)}, {order.delivery_coordinates.lng.toFixed(5)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line Items Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: is58mm ? "24px 1fr 50px" : "30px 1fr 65px",
          fontWeight: "bold",
          borderBottom: "1px dashed #000",
          paddingBottom: "3px",
          marginBottom: "4px",
          fontSize: is58mm ? "10px" : "11px",
        }}
      >
        <span>QTY</span>
        <span>ITEM</span>
        <span style={{ textAlign: "right" }}>AMOUNT</span>
      </div>

      {/* Line Items List */}
      <div style={{ marginBottom: "6px" }}>
        {items.map((item, idx) => (
          <div
            key={`${order.id}-${item.id || item.name_snapshot}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: is58mm ? "24px 1fr 50px" : "30px 1fr 65px",
              marginBottom: "4px",
              fontSize: is58mm ? "10px" : "11px",
              alignItems: "start",
            }}
          >
            <span style={{ fontWeight: "bold" }}>{item.quantity}x</span>
            <div>
              <div style={{ fontWeight: "bold", wordBreak: "break-word" }}>
                {item.name_snapshot}
              </div>
              <div style={{ fontSize: is58mm ? "9px" : "10px", color: "#333" }}>
                @ Rs. {item.price_snapshot}
              </div>
              {item.spice_level && (
                <div style={{ fontSize: "9px" }}>Spice: {item.spice_level}</div>
              )}
            </div>
            <span style={{ textAlign: "right", fontWeight: "bold" }}>
              Rs. {item.line_total}
            </span>
          </div>
        ))}
      </div>

      {/* Totals Section */}
      <div
        style={{
          borderTop: "1px dashed #000",
          paddingTop: "4px",
          marginBottom: "6px",
          fontSize: is58mm ? "10px" : "11px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal:</span>
          <span style={{ marginLeft: "auto" }}>Rs. {order.subtotal}</span>
        </div>
        {!isPickup && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Delivery Fee:</span>
            <span style={{ marginLeft: "auto" }}>Rs. {order.delivery_fee}</span>
          </div>
        )}
        {order.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Discount:</span>
            <span style={{ marginLeft: "auto" }}>-Rs. {order.discount}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: is58mm ? "13px" : "15px",
            fontWeight: "900",
            marginTop: "4px",
            borderTop: "1px solid #000",
            paddingTop: "4px",
          }}
        >
          <span>TOTAL:</span>
          <span style={{ marginLeft: "auto" }}>Rs. {order.total}</span>
        </div>
      </div>

      {/* Notes if any */}
      {parsedNote.customNote && (
        <div
          style={{
            borderTop: "1px dashed #000",
            paddingTop: "4px",
            marginBottom: "6px",
            fontSize: is58mm ? "9px" : "10px",
          }}
        >
          <strong>Note:</strong> {parsedNote.customNote}
        </div>
      )}

      {/* Footer / Cut Line */}
      <div
        style={{
          textAlign: "center",
          borderTop: "1px dashed #000",
          paddingTop: "6px",
          marginTop: "6px",
          fontSize: is58mm ? "9px" : "10px",
        }}
      >
        <p style={{ margin: "0 0 2px 0", fontWeight: "bold" }}>
          Thank you for choosing Azlan!
        </p>
        <p style={{ margin: 0, fontStyle: "italic" }}>
          *** END OF RECEIPT ***
        </p>
      </div>
    </div>
  );
}
