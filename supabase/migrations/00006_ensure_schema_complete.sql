
-- Migration 3 (00003_create_admin_users_table.sql) may not have been applied
-- on all environments. This migration is fully idempotent and re-adds
-- everything from migration 3 that the payment flow depends on.

-- ── admin_users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'No direct access to admin_users'
  ) THEN
    CREATE POLICY "No direct access to admin_users" ON admin_users
      FOR ALL TO anon, authenticated USING (false);
  END IF;
END
$$;

-- Seed default admin if not already present (password: Admin@123)
INSERT INTO admin_users (username, password_hash, display_name)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lJWy',
  'Administrator'
) ON CONFLICT (username) DO NOTHING;

-- ── orders: order_reference column ───────────────────────────────────────────
-- Required by the create-order Edge Function to store the client-generated ref.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_reference TEXT UNIQUE;

-- ── orders: checkout_url column ──────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- ── activity_logs: admin_username column ─────────────────────────────────────
-- Required by the logActivity() helper in the frontend services layer.
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS admin_username TEXT;
