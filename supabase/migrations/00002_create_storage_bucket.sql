
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view site assets" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "Admins can update site assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can delete site assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'site-assets');
