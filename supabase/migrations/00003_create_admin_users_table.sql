
-- Admin users table (custom auth, NOT Supabase Auth)
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

-- RLS: table is fully locked down; reads go through Edge Function only
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated user can read/write directly
CREATE POLICY "No direct access to admin_users" ON admin_users
  FOR ALL TO anon, authenticated USING (false);

-- Service role (used by Edge Functions) bypasses RLS by default.

-- Seed default admin: username=admin, password=Admin@123
-- bcrypt hash of "Admin@123" with 10 rounds
INSERT INTO admin_users (username, password_hash, display_name)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lJWy',
  'Administrator'
) ON CONFLICT (username) DO NOTHING;

-- Update orders table to add order_reference column if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_reference TEXT UNIQUE;

-- Update the orders table: add gifted_pay_checkout_url
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- Update activity_logs to accept admin_username instead of requiring admin_id
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS admin_username TEXT;
