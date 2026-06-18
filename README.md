# Infotech Internet Services

> Fast, affordable mobile data bundles, SMS, and minutes for Safaricom users across Kenya — powered by M-Pesa via GiftedPay.

[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://app.netlify.com)

---

## 📋 Project Overview

**Infotech Internet Services** is a full-stack, production-ready web platform that lets Safaricom customers instantly purchase data bundles, SMS offers, and minutes packages using M-Pesa. No registration is required for customers. Admins manage bundles, orders, and settings through a secure dashboard.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Custom admin auth (bcrypt + admin_users table) |
| Payments | GiftedPay (M-Pesa STK Push) |
| Deployment | Netlify |

---

## ✨ Features

### 🛒 Customer (No registration required)
- Browse data, SMS, and minutes bundles grouped by category
- Color-coded bundle cards (Data=green, Buy Many Times=yellow, SMS=blue, Minutes=purple)
- Instant M-Pesa payment via GiftedPay — embedded fullscreen iframe, no redirects
- Real-time payment status polling (auto-confirms after payment)
- Track any order by phone number or order reference
- WhatsApp support button

### 🔧 Admin Dashboard (`/admin/login`)
- Revenue & order statistics cards
- Sales overview line chart (last 30 days)
- Top bundles leaderboard
- Full CRUD for bundles and categories
- Order management with search, filtering, CSV export
- Website settings (site name, logo, WhatsApp, email, footer)
- Analytics with daily/weekly/monthly breakdowns
- Activity audit logs for all admin actions

---

## 🚀 Installation

### Prerequisites
- Node.js 20+
- A Supabase project
- A GiftedPay merchant account

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/daisynaliaka400-afk/Infotech-services.git
cd Infotech-services

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in your values in .env

# 4. Run the development server
npm run dev

# 5. Build for production
npm run build
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Supabase project URL (from Supabase Dashboard → Settings → API)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase anon/public key (safe for frontend)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ **Never commit `.env` to git.** It is listed in `.gitignore`.

---

## 🗄 Supabase Setup

### 1. Run Migrations

In the Supabase SQL Editor, run each file in order from `supabase/migrations/`:

```
00001_initial_schema.sql        — tables, RLS, seed data
00002_create_storage_bucket.sql — storage bucket for images
00003_create_admin_users_table.sql — custom admin auth
00004_fix_rls_anon_write_policies.sql — RLS for custom auth
00005_fix_rls_activity_logs_anon_insert.sql — activity log RLS
```

### 2. Deploy Edge Functions

```bash
supabase functions deploy admin-auth
supabase functions deploy create-order
supabase functions deploy giftedpay-webhook
```

### 3. Set Supabase Secrets

```bash
supabase secrets set GIFTEDPAY_API_KEY=your_giftedpay_api_key
```

### 4. Default Admin Credentials

| Username | Password |
|---|---|
| `admin` | `Admin@123` |
| `boaz` | `123456789` |

> Change passwords after first login via the admin panel.

---

## 🌐 GiftedPay Integration

The payment flow is fully embedded (no redirects):

1. Customer selects a bundle → enters Safaricom number
2. An order is created in Supabase via Edge Function
3. GiftedPay payment page loads in a **fullscreen iframe** with price pre-seeded
4. App polls Supabase every 4 seconds for payment status
5. On success → order confirmed; on failure → retry option shown

Set the GiftedPay webhook callback URL to:
```
https://<your-project-ref>.supabase.co/functions/v1/giftedpay-webhook
```

---

## 📦 Netlify Deployment

### Automatic (Recommended)

1. Push this repo to GitHub
2. Go to [Netlify](https://app.netlify.com) → **New Site from Git**
3. Select your repository
4. Build settings are pre-configured in `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Add environment variables in Netlify → Site Settings → Environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

The `netlify.toml` handles SPA client-side routing redirects automatically.

---

## 📁 Project Structure

```
├── src/
│   ├── components/       # UI components (checkout modal, layouts, ui)
│   ├── contexts/         # Auth context
│   ├── db/               # Supabase client
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Route pages (home, admin/*)
│   ├── services/         # API layer (api.ts)
│   └── types/            # TypeScript types
├── supabase/
│   ├── functions/        # Edge Functions (admin-auth, create-order, webhook)
│   └── migrations/       # SQL migrations (run in order)
├── public/               # Static assets
├── netlify.toml          # Netlify deployment config
├── vite.config.ts        # Vite build config
├── tailwind.config.js    # Tailwind CSS config
└── .env.example          # Environment variable template
```

---

## 📄 License

MIT © 2025 Infotech Internet Services

