# Privacy & Data Protection Policy

**Last Updated:** October 15, 2026  
**Effective Date:** October 15, 2026  
**Version:** 2.5 (Revised)  
**Entity:** Azlan Fast Food & BBQ Point (a division of Azlan Dairy)  
**Location:** Main Khokhrapar No. 2.5, Malir, Karachi, Sindh, Pakistan  
**Website:** https://azlanfastfood.com  

---

## 1. Overview & Corporate Scope

This Privacy Policy describes how **Azlan Fast Food & BBQ Point** ("we", "us", or "our"), an official food division of **Azlan Dairy**, collects, uses, stores, and safeguards personal information when customers access our online ordering website at `azlanfastfood.com`, place pickup or delivery orders, track deliveries, register user accounts, or submit customer reviews.

---

## 2. Information We Collect

### 2.1 Customer Identity & Contact Data
- **Full Name:** To address receipts, kitchen slips, and verify physical delivery handovers.
- **Phone Number:** Essential for rider coordination, delivery address clarification, and order status updates.
- **Email Address:** Used for automated order confirmation invoices, receipts, and optional password recovery.
- **Account Credentials:** Encrypted authentication credentials managed via Supabase Auth (passwords are securely hashed with Bcrypt and never stored in plain text).

### 2.2 Delivery & Geolocation Information
- **Physical Address & Landmark Notes:** Street address, building name, floor number, gate instructions.
- **Delivery Map Coordinates:** Exact latitude and longitude selected on our interactive map.

### 2.3 Order & Transaction Details
- **Order Line Items:** Food choices, pizza sizes, quantities, and preparation customizations.
- **Financial Breakdown:** Subtotal, distance-based delivery fee, discounts/coupons applied, and grand total.
- **Payment Method:** Cash on Delivery (COD) or electronic transfer verification. We do not store sensitive bank PINs or payment card CVVs.

### 2.4 Verified Customer Reviews
- **Ratings & Reviews:** 1 to 5 star scores and comments regarding food taste and delivery speed.
- **Public Attribution:** Customer names are automatically masked (e.g., "Ahmed K.") on public reviews to protect personal privacy.

---

## 3. Delivery GPS & Geolocation Policy

Our platform utilizes an interactive Leaflet and OpenStreetMap interface:
- **No Background Tracking:** We do not track user location continuously or when the browser tab is idle or closed.
- **Delivery Distance Calculation:** When a pin is selected, our server computes the exact road distance from our kitchen (Khokhrapar No. 2.5, Malir) to calculate a transparent, fair delivery fee (PKR 60 base for 2 km + PKR 25 per additional km).
- **Rider Navigation:** Once an order is marked `out_for_delivery`, coordinates are passed strictly to the assigned delivery rider to navigate to your doorstep.

---

## 4. How We Use Your Information

We process personal data strictly for genuine operational requirements:
1. **Kitchen Fulfillment:** Dispatching order tickets to kitchen display screens and thermal order printers.
2. **Delivery Dispatch:** Supplying riders with the necessary contact and address details to complete handovers.
3. **Invoicing & Receipts:** Generating printable customer invoices and dispatching confirmation emails via Resend.
4. **Account Management:** Maintaining order history and cart state across sessions.
5. **Quality Assurance:** Monitoring food preparation times and verified customer feedback.
6. **Platform Security:** Preventing fraudulent orders, spam, and unauthorized account access.

---

## 5. Data Security & Storage Architecture

- **PostgreSQL Kernel Security (RLS):** Database records in Supabase are governed by Row-Level Security policies. Customers can only read and mutate their own data.
- **TLS 1.3 Encryption:** All browser-to-server traffic is enforced via HTTPS with Strict-Transport-Security (HSTS).
- **Role-Based Isolation:** Administrative features, pricing controls, and rider shift manifests require cryptographically verified server-side tokens (`admin_auth`, `rider_auth`). Delivery riders only view orders actively assigned to them.

---

## 6. Third-Party Service Providers

| Provider | Purpose | Data Handled | Privacy Disclosures |
| :--- | :--- | :--- | :--- |
| **Supabase Inc.** | Cloud database, authentication, realtime subscriptions | User profiles, order lines, review text | https://supabase.com/privacy |
| **Resend Inc.** | Transactional order confirmation emails | Customer email, order receipt copy | https://resend.com/legal/privacy |
| **OpenStreetMap** | Interactive delivery map tiles | Delivery pin latitude & longitude | https://wiki.openstreetmap.org/wiki/Privacy_Policy |
| **Google OAuth** | Optional one-tap social sign-in | Verified email, name, avatar | https://policies.google.com/privacy |

We do not sell, rent, or trade your personal data to any third-party advertising brokers or data aggregators.

---

## 7. Cookies & Client Storage

We use strictly functional cookies and local storage items:

| Identifier | Mechanism | Purpose | Lifespan |
| :--- | :--- | :--- | :--- |
| `azlan-cart-storage` | Local Storage | Persists selected food items & quantities | Cleared upon checkout or user action |
| `azlan_recent_orders`| Local Storage | Allows guest users to track recent orders without logging in | 30 days |
| `admin_auth` | HTTP-Only Cookie | Encrypted administrative session cookie | 24 hours |
| `rider_auth` | HTTP-Only Cookie | Encrypted rider dispatch session cookie | 24 hours |

---

## 8. Customer Privacy Rights

Under applicable privacy standards, you have the right to:
- **Access & Review:** Request a summary of all orders and records tied to your phone number or email.
- **Rectification:** Correct outdated delivery notes, names, or addresses.
- **Erasure:** Request permanent deletion of your customer account and associated personal data.
- **Opt-Out:** We do not send unsolicited marketing SMS. Transactional notifications are strictly related to active food orders.

To exercise any of these rights, contact our Privacy Desk via WhatsApp or phone.

---

## 9. Data Retention Schedule

- **Active Orders:** Realtime status preserved until fulfillment.
- **Financial Invoices:** Retained for 3 to 7 years in compliance with Sindh Revenue Board (SRB) and local tax standards.
- **User Accounts:** Maintained until voluntary account termination.
- **Local Browser Cache:** Managed locally on your device; can be cleared at any time in browser settings.

---

## 10. Children's Privacy

Our services are directed to adults and authorized family members. We do not knowingly collect information from children under 13 without parental consent.

---

## 11. Official Contact & Legal Jurisdiction

**Azlan Fast Food & BBQ Point (Azlan Dairy)**  
📍 **Address:** Main Khokhrapar No. 2.5, Malir, Karachi, Sindh, Pakistan  
🕒 **Operating Hours:** Daily 7:00 PM – 3:00 AM (PST)  
🌐 **Website:** https://azlanfastfood.com  

### Governing Law
This Privacy Policy is governed by the laws of the Islamic Republic of Pakistan and the Province of Sindh. Any disputes shall be subject to the exclusive jurisdiction of the civil and consumer courts of Karachi, Pakistan.
