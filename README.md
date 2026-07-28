# Azlan Dairy Restaurant

A full-featured restaurant ordering web application for **Azlan Dairy Restaurant** in Malir, Karachi. Browse the menu, place orders, track deliveries, and manage the restaurant — all from a modern, responsive web interface.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

### Customer
- **Dynamic Menu** — Browse items by category (Signature Dishes, Broast, Burgers, Rolls & Wraps, BBQ, Sides, Beverages)
- **Smart Cart** — Add/remove items with quantity controls; persists across sessions via localStorage
- **Checkout with Map** — Select delivery location on an interactive map; delivery fee calculated dynamically based on distance (PKR 60 base for 2km, PKR 25 per additional km)
- **Order Tracking** — Real-time status updates from pending to completed
- **User Accounts** — Sign up, log in, and view order history
- **Responsive Design** — Optimized for mobile, tablet, and desktop

### Admin
- **Dashboard** — View and manage all orders
- **Order Status Updates** — Update orders through the fulfillment pipeline
- **Store Toggle** — Open/close the store for ordering
- **Protected Routes** — Admin-only access with authentication

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| Maps | Leaflet + react-leaflet |
| Icons | Lucide React |
| Notifications | Sonner |

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Supabase project
- Environment variables configured (see below)

### Setup

```bash
# Install dependencies
npm install

# Create .env.local in the project root
# Add your Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Other Commands

```bash
npm run build    # Production build
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── admin/               # Admin dashboard
│   ├── api/                 # API routes
│   ├── auth/                # Authentication pages
│   ├── cart/                # Cart page
│   ├── checkout/            # Checkout & delivery
│   ├── menu/                # Menu browsing
│   ├── orders/              # Order tracking
│   └── page.tsx             # Homepage
├── components/
│   ├── admin/               # Admin components
│   └── azlan/               # Shared UI components
├── lib/
│   ├── supabase/            # Database clients
│   ├── cart-store.ts        # Cart state (Zustand)
│   └── delivery.ts          # Delivery calculations
└── hooks/                   # Custom React hooks
```

## Database Schema

Key tables: `items` (menu), `orders`, `order_items`, `settings` (store config), `reviews`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |

## Design

Built with a "Farm-to-Table Premium" design system using deep greens, royal purples, and soft mint tones. Typography via Plus Jakarta Sans.
