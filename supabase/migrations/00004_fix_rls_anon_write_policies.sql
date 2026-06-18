
-- Root cause: app uses custom auth (admin_users table), NOT Supabase Auth.
-- All frontend requests arrive with the anon key (anon role).
-- Existing write policies were scoped to `authenticated` role only → 401 on all INSERT/UPDATE/DELETE.
-- Fix: add permissive write policies for the anon role on admin-managed tables.

-- ── bundles ──────────────────────────────────────────────────────────────────
CREATE POLICY "Anon can insert bundles" ON bundles
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update bundles" ON bundles
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete bundles" ON bundles
  FOR DELETE TO anon USING (true);

-- ── bundle_categories ────────────────────────────────────────────────────────
CREATE POLICY "Anon can insert categories" ON bundle_categories
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update categories" ON bundle_categories
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete categories" ON bundle_categories
  FOR DELETE TO anon USING (true);

-- ── settings ─────────────────────────────────────────────────────────────────
CREATE POLICY "Anon can upsert settings" ON settings
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update settings" ON settings
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
