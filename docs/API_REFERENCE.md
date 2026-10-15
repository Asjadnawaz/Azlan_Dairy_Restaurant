# API Reference & Endpoints Specification

**Base URL:** `https://azlanfastfood.com` (or `http://localhost:3000` locally)  
**Protocol:** HTTPS / JSON REST  

---

## Table of Contents
1. [Store Status & Configuration](#1-store-status--configuration)
2. [Order Management](#2-order-management)
3. [Reviews & Feedback](#3-reviews--feedback)
4. [Admin Management](#4-admin-management)
5. [Rider Dispatch](#5-rider-dispatch)
6. [Authentication & Profiles](#6-authentication--profiles)

---

## 1. Store Status & Configuration

### `GET /api/store-status`
Retrieves the restaurant's live operating status, scheduled hours, and delivery settings.

- **Auth Required:** None (Public)
- **Response `200 OK`:**
  ```json
  {
    "isOpen": true,
    "currentSchedule": {
      "openHour": 19,
      "closeHour": 3,
      "timezone": "Asia/Karachi"
    },
    "forceOpen": false,
    "forceClosed": false,
    "deliverySettings": {
      "baseFee": 60,
      "baseDistanceKm": 2.0,
      "perKmFee": 25,
      "maxDistanceKm": 15.0
    }
  }
  ```

---

## 2. Order Management

### `POST /api/orders`
Submits a new customer food order. Can be invoked by authenticated users or guest checkouts.

- **Auth Required:** None (Supports guest & authenticated users)
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "customer_name": "Hamza Ali",
    "customer_phone": "03001234567",
    "delivery_address": "House 12, Street 4, Khokhrapar",
    "delivery_lat": 24.8934,
    "delivery_lng": 67.1952,
    "special_instructions": "Extra chili garlic sauce please",
    "payment_method": "cod",
    "items": [
      {
        "id": "pz-1s",
        "name": "Vegetable Pizza (Small)",
        "price": 300,
        "quantity": 2
      },
      {
        "id": "bg-1",
        "name": "Crispy Zinger Burger",
        "price": 350,
        "quantity": 1
      }
    ],
    "subtotal": 950,
    "delivery_fee": 60,
    "discount_amount": 0,
    "total": 1010
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "orderId": "d3b07384-d113-4a11-82d2-841f3e7b25e1",
    "orderNumber": "AZ-8921",
    "message": "Order successfully received"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing required customer phone, address, or empty item list.
  - `403 Forbidden`: Store is currently closed and not accepting orders.

---

### `GET /api/orders/[id]`
Retrieves current tracking status, line items, and receipt metadata for a specific order.

- **Auth Required:** Order ID or active customer session.
- **Path Parameters:** `id` (UUID or Order Number)
- **Response `200 OK`:**
  ```json
  {
    "id": "d3b07384-d113-4a11-82d2-841f3e7b25e1",
    "order_number": "AZ-8921",
    "status": "preparing",
    "customer_name": "Hamza Ali",
    "customer_phone": "03001234567",
    "delivery_address": "House 12, Street 4, Khokhrapar",
    "subtotal": 950,
    "delivery_fee": 60,
    "total": 1010,
    "created_at": "2026-10-15T14:30:00Z",
    "items": [
      {
        "name_snapshot": "Vegetable Pizza (Small)",
        "price_snapshot": 300,
        "quantity": 2
      }
    ]
  }
  ```

---

### `PATCH /api/orders/[id]`
Updates an order's lifecycle status. Used by kitchen staff and riders.

- **Auth Required:** `admin_auth` or `rider_auth` session.
- **Request Body:**
  ```json
  {
    "status": "out_for_delivery",
    "rider_id": "r-04",
    "cancellation_reason": null
  }
  ```
- **Allowed Status Transitions:**
  - `pending` → `confirmed`
  - `confirmed` → `preparing`
  - `preparing` → `out_for_delivery`
  - `out_for_delivery` → `completed`
  - Any state → `cancelled`

---

## 3. Reviews & Feedback

### `GET /api/reviews`
Fetches approved product reviews. Automatically sanitizes and truncates customer surnames to protect privacy.

- **Auth Required:** None (Public)
- **Query Parameters:** `item_id` (e.g. `?item_id=pz-1s`)
- **Response `200 OK`:**
  ```json
  {
    "reviews": [
      {
        "id": "rev-101",
        "name": "Ahmed K.",
        "rating": 5,
        "comment": "Cheesy and piping hot crust!",
        "created_at": "2026-10-14T19:22:00Z",
        "is_verified": true
      }
    ],
    "average": 5.0,
    "count": 1
  }
  ```

---

### `POST /api/reviews`
Submits a customer rating against an order. Enforces verified purchase verification.

- **Auth Required:** Service-role verified completed order ID.
- **Request Body:**
  ```json
  {
    "order_id": "d3b07384-d113-4a11-82d2-841f3e7b25e1",
    "item_id": "pz-1s",
    "rating": 5,
    "comment": "Authentic taste!",
    "customer_name": "Ahmed Khan"
  }
  ```
- **Validation Rules:**
  - Order must exist and have status `completed`.
  - Item must actually have been a line item in that specific order.
  - Exactly one review permitted per item per order.

---

## 4. Admin Management

### `GET /api/admin/orders`
Retrieves live kitchen feed of orders with filter by status (`active`, `completed`, `cancelled`).

- **Auth Required:** `admin_auth` cookie.
- **Response `200 OK`:** Array of enriched order objects.

---

### `PATCH /api/admin/items`
Updates pricing or in-stock availability for any menu item.

- **Auth Required:** `admin_auth` cookie.
- **Request Body:**
  ```json
  {
    "id": "pz-1s",
    "price": 320,
    "is_available": true
  }
  ```
- **Response `200 OK`:** `{ "success": true, "updatedItem": { ... } }`

---

### `GET /api/admin/stats`
Returns aggregated business metrics calculated via PostgreSQL RPC.

- **Auth Required:** `admin_auth` cookie.
- **Response `200 OK`:**
  ```json
  {
    "todayRevenue": 48500,
    "todayOrders": 64,
    "activeCustomers": 120,
    "popularDishes": [
      { "name": "Vegetable Pizza", "count": 28 },
      { "name": "Crispy Zinger Burger", "count": 24 }
    ]
  }
  ```

---

### `POST /api/admin/toggle-store`
Overrides store hours to force open or close in emergencies.

- **Auth Required:** `admin_auth` cookie.
- **Request Body:**
  ```json
  {
    "force_state": "closed",
    "reason": "Heavy monsoon rains in Malir"
  }
  ```

---

## 5. Rider Dispatch

### `GET /api/rider/orders`
Returns active orders assigned to the logged-in rider.

- **Auth Required:** `rider_auth` cookie.
- **Response `200 OK`:** List of orders with customer delivery address, phone, and coordinates.

---

## 6. Authentication & Profiles

### `POST /api/auth/sync-profile`
Synchronizes newly authenticated Supabase Auth users into the `profiles` table.

- **Auth Required:** Supabase Bearer token.
- **Request Body:** `{ "user_id": "uuid", "email": "user@example.com", "name": "User Name" }`
