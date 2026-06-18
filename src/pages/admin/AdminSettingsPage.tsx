import { useEffect, useState } from 'react';
import { Save, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSettings, updateSetting, logActivity } from '@/services/api';
import { supabase } from '@/db/supabase';
import type { Settings } from '@/types/types';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Settings>({
    site_name: '', logo_url: '', whatsapp_number: '', support_email: '', footer_text: ''
  });

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setForm(s);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(form).map(([key, value]) => updateSetting(key, value))
      );
      await logActivity('update_settings', 'settings', undefined, form as unknown as Record<string, unknown>);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error('Logo must be under 1MB'); return; }

    setUploading(true);
    try {
      const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(data.path);
      setForm((f) => ({ ...f, logo_url: urlData.publicUrl }));
      await updateSetting('logo_url', urlData.publicUrl);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error('Failed to upload logo. Ensure storage bucket exists.');
    } finally {
      setUploading(false);
    }
  };

  const setField = (k: keyof Settings, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48 bg-muted" />
      <Skeleton className="h-64 rounded-xl bg-muted" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-balance">Website Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your site's appearance and contact info.</p>
      </div>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base text-balance">General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-normal">Site Name</Label>
            <Input className="mt-1" value={form.site_name} onChange={(e) => setField('site_name', e.target.value)} placeholder="Infotech Internet Services" />
          </div>

          <div>
            <Label className="text-sm font-normal">Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  <button
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    onClick={() => setField('logo_url', '')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploading ? 'Uploading…' : 'Upload Logo'}
                  </span>
                </Button>
              </label>
              <span className="text-xs text-muted-foreground">Max 1MB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base text-balance">Contact Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-normal">WhatsApp Number</Label>
            <Input className="mt-1" value={form.whatsapp_number} onChange={(e) => setField('whatsapp_number', e.target.value)} placeholder="+254700000000" />
            <p className="text-xs text-muted-foreground mt-1">Include country code, e.g. +254712345678</p>
          </div>
          <div>
            <Label className="text-sm font-normal">Support Email</Label>
            <Input className="mt-1" type="email" value={form.support_email} onChange={(e) => setField('support_email', e.target.value)} placeholder="support@example.com" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base text-balance">Footer</CardTitle></CardHeader>
        <CardContent>
          <Label className="text-sm font-normal">Footer Text</Label>
          <Textarea className="mt-1 resize-none" rows={3} value={form.footer_text} onChange={(e) => setField('footer_text', e.target.value)} placeholder="© 2024 Infotech Internet Services. All rights reserved." />
        </CardContent>
      </Card>

      <Button className="w-full md:w-auto" onClick={handleSave} disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Settings</>}
      </Button>
    </div>
  );
}
