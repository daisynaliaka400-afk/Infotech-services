# Infotech Internet Services

A production-ready web application for purchasing Safaricom mobile data bundles, SMS offers, and minutes offers via M-Pesa payments.

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Payments**: GiftedPay (M-Pesa STK Push)
- **Deployment**: Netlify

## Features

### Customer (No registration required)
- Browse & search data, SMS, and minutes bundles
- Buy bundles with M-Pesa STK Push
- Real-time payment confirmation
- Track order status by phone number or order ID

### Admin
- Dashboard with revenue & order statistics
- Full CRUD for bundles and categories
- Order management with CSV export
- Website settings (logo, contact info, footer)
- Analytics with daily/weekly/monthly revenue charts
- Audit logs for all admin actions

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project
- A GiftedPay account

### Installation

```bash
npm install
npm run build
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Set `GIFTEDPAY_API_KEY` as a **Supabase secret** (never expose to frontend):
```bash
supabase secrets set GIFTEDPAY_API_KEY=your_actual_key
```

## Deployment (Netlify)

1. Connect your GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The `netlify.toml` handles SPA redirects automatically.

## Admin Access

Navigate to `/admin/login` and sign in with your Supabase Auth credentials.

## GiftedPay Webhook

Set the callback URL in GiftedPay to:
```
https://<your-project>.supabase.co/functions/v1/giftedpay-webhook
```

