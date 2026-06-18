
-- Same root cause as bundles/settings fix: custom auth uses anon role.
-- The existing INSERT policy on activity_logs is scoped to `authenticated` only.
-- Fix: allow anon to insert activity log entries.
CREATE POLICY "Anon can insert activity logs" ON activity_logs
  FOR INSERT TO anon WITH CHECK (true);
