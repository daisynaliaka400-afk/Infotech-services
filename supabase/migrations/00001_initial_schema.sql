
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (admins)
-- ============================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- BUNDLE CATEGORIES TABLE
-- ============================================================
CREATE TABLE bundle_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bundle_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON bundle_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON bundle_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- BUNDLES TABLE
-- ============================================================
CREATE TABLE bundles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid NOT NULL REFERENCES bundle_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  validity text NOT NULL,
  data_amount text,
  sms_amount text,
  minutes_amount text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles" ON bundles
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can view all bundles" ON bundles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage bundles" ON bundles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE RESTRICT,
  bundle_name text NOT NULL,
  bundle_price numeric(10,2) NOT NULL,
  phone_number text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  giftedpay_transaction_id text,
  checkout_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending','processing','success','failed','cancelled'))
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view own orders by phone" ON orders
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PAYMENT LOGS TABLE
-- ============================================================
CREATE TABLE payment_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert payment logs" ON payment_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view payment logs" ON payment_logs
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs" ON activity_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert activity logs" ON activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- AUTO ORDER NUMBER TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bundle_categories_updated_at BEFORE UPDATE ON bundle_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bundles_updated_at BEFORE UPDATE ON bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROFILE AUTO-CREATE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DEFAULT SETTINGS
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('site_name', 'Infotech Internet Services'),
  ('logo_url', ''),
  ('whatsapp_number', '+254700000000'),
  ('support_email', 'support@infotech.co.ke'),
  ('footer_text', '© 2024 Infotech Internet Services. All rights reserved.');

-- ============================================================
-- SEED DEFAULT CATEGORIES
-- ============================================================
INSERT INTO bundle_categories (name, description, sort_order) VALUES
  ('Data Bundles', 'Mobile internet data bundles', 1),
  ('Buy Many Times', 'Flexible bundles you can purchase multiple times', 2),
  ('SMS Offers', 'Text message bundles', 3),
  ('Minutes Offers', 'Voice call minute bundles', 4);

-- ============================================================
-- SEED DEFAULT BUNDLES
-- ============================================================
-- Data Bundles
INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 20 - 250MB (24 Hours)', 20.00, '24 Hours', '250MB', 1
FROM bundle_categories c WHERE c.name = 'Data Bundles';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 19 - 1GB (1 Hour)', 19.00, '1 Hour', '1GB', 2
FROM bundle_categories c WHERE c.name = 'Data Bundles';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 50 - 1.5GB (3 Hours)', 50.00, '3 Hours', '1.5GB', 3
FROM bundle_categories c WHERE c.name = 'Data Bundles';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 55 - 1.25GB (Till Midnight)', 55.00, 'Till Midnight', '1.25GB', 4
FROM bundle_categories c WHERE c.name = 'Data Bundles';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 99 - 1GB (24 Hours)', 99.00, '24 Hours', '1GB', 5
FROM bundle_categories c WHERE c.name = 'Data Bundles';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 49 - 350MB (7 Days)', 49.00, '7 Days', '350MB', 6
FROM bundle_categories c WHERE c.name = 'Data Bundles';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 300 - 2.5GB (7 Days)', 300.00, '7 Days', '2.5GB', 7
FROM bundle_categories c WHERE c.name = 'Data Bundles';

-- Buy Many Times
INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 110 - 2GB (24 Hours)', 110.00, '24 Hours', '2GB', 1
FROM bundle_categories c WHERE c.name = 'Buy Many Times';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 22 - 1GB (1 Hour)', 22.00, '1 Hour', '1GB', 2
FROM bundle_categories c WHERE c.name = 'Buy Many Times';

INSERT INTO bundles (category_id, name, price, validity, data_amount, sort_order)
SELECT c.id, 'KES 52 - 1.5GB (3 Hours)', 52.00, '3 Hours', '1.5GB', 3
FROM bundle_categories c WHERE c.name = 'Buy Many Times';

-- SMS Offers
INSERT INTO bundles (category_id, name, price, validity, sms_amount, sort_order)
SELECT c.id, 'KES 5 - 20 SMS', 5.00, '1 Day', '20 SMS', 1
FROM bundle_categories c WHERE c.name = 'SMS Offers';

INSERT INTO bundles (category_id, name, price, validity, sms_amount, sort_order)
SELECT c.id, 'KES 10 - 200 SMS', 10.00, '7 Days', '200 SMS', 2
FROM bundle_categories c WHERE c.name = 'SMS Offers';

INSERT INTO bundles (category_id, name, price, validity, sms_amount, sort_order)
SELECT c.id, 'KES 30 - 1000 SMS', 30.00, '30 Days', '1000 SMS', 3
FROM bundle_categories c WHERE c.name = 'SMS Offers';

-- Minutes Offers
INSERT INTO bundles (category_id, name, price, validity, minutes_amount, sort_order)
SELECT c.id, 'KES 21 - 45 Minutes', 21.00, '1 Day', '45 Minutes', 1
FROM bundle_categories c WHERE c.name = 'Minutes Offers';

INSERT INTO bundles (category_id, name, price, validity, minutes_amount, sort_order)
SELECT c.id, 'KES 51 - 50 Minutes', 51.00, '3 Days', '50 Minutes', 2
FROM bundle_categories c WHERE c.name = 'Minutes Offers';

INSERT INTO bundles (category_id, name, price, validity, minutes_amount, sort_order)
SELECT c.id, 'KES 54 - Credo 200', 54.00, '7 Days', 'Credo 200', 3
FROM bundle_categories c WHERE c.name = 'Minutes Offers';

INSERT INTO bundles (category_id, name, price, validity, minutes_amount, sort_order)
SELECT c.id, 'KES 200 - 250 Minutes', 200.00, '30 Days', '250 Minutes', 4
FROM bundle_categories c WHERE c.name = 'Minutes Offers';

-- ============================================================
-- ANALYTICS HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_revenue_summary()
RETURNS TABLE(period text, total_revenue numeric, order_count bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 'daily'::text, COALESCE(SUM(bundle_price),0), COUNT(*)
  FROM orders
  WHERE payment_status = 'success' AND created_at >= CURRENT_DATE
  UNION ALL
  SELECT 'weekly'::text, COALESCE(SUM(bundle_price),0), COUNT(*)
  FROM orders
  WHERE payment_status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  UNION ALL
  SELECT 'monthly'::text, COALESCE(SUM(bundle_price),0), COUNT(*)
  FROM orders
  WHERE payment_status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$;
