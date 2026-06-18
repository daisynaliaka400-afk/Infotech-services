import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Power, PowerOff, Loader2, Package, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  getBundles, getCategories, createBundle, updateBundle, deleteBundle, logActivity
} from '@/services/api';
import type { Bundle, BundleCategory } from '@/types/types';
import { toast } from 'sonner';

interface BundleForm {
  category_id: string; name: string; description: string;
  price: string; validity: string; data_amount: string;
  sms_amount: string; minutes_amount: string; is_active: boolean;
}

const emptyForm: BundleForm = {
  category_id: '', name: '', description: '', price: '', validity: '',
  data_amount: '', sms_amount: '', minutes_amount: '', is_active: true,
};

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [categories, setCategories] = useState<BundleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bundle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);
  const [form, setForm] = useState<BundleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getBundles(false), getCategories(false)])
      .then(([b, c]) => { setBundles(b); setCategories(c); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setField = (k: keyof BundleForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (b: Bundle) => {
    setEditTarget(b);
    setForm({
      category_id: b.category_id, name: b.name, description: b.description ?? '',
      price: String(b.price), validity: b.validity, data_amount: b.data_amount ?? '',
      sms_amount: b.sms_amount ?? '', minutes_amount: b.minutes_amount ?? '', is_active: b.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.validity || !form.category_id) {
      toast.error('Name, price, validity and category are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category_id: form.category_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        validity: form.validity.trim(),
        data_amount: form.data_amount.trim() || null,
        sms_amount: form.sms_amount.trim() || null,
        minutes_amount: form.minutes_amount.trim() || null,
        is_active: form.is_active,
        sort_order: 0,
      };
      if (editTarget) {
        await updateBundle(editTarget.id, payload);
        await logActivity('update_bundle', 'bundle', editTarget.id, { name: form.name });
        toast.success('Bundle updated');
      } else {
        await createBundle(payload);
        await logActivity('create_bundle', 'bundle', undefined, { name: form.name });
        toast.success('Bundle created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save bundle');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (b: Bundle) => {
    try {
      await updateBundle(b.id, { is_active: !b.is_active });
      await logActivity(b.is_active ? 'deactivate_bundle' : 'activate_bundle', 'bundle', b.id, { name: b.name });
      toast.success(`Bundle ${b.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch { toast.error('Failed to update bundle'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBundle(deleteTarget.id);
      await logActivity('delete_bundle', 'bundle', deleteTarget.id, { name: deleteTarget.name });
      toast.success('Bundle deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Failed to delete bundle'); }
    finally { setDeleting(false); }
  };

  const filtered = bundles.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    String(b.price).includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance">Bundles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all available bundles.</p>
        </div>
        <Button onClick={openAdd} className="shrink-0"><Plus className="h-4 w-4 mr-1" /> Add Bundle</Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle className="text-base text-balance">All Bundles ({bundles.length})</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search bundles…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded bg-muted" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bundles found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Name', 'Category', 'Price', 'Validity', 'Amount', 'Status', 'Actions'].map((h) => (
                      <th key={h} className={`py-2 px-2 font-medium text-muted-foreground whitespace-nowrap ${h === 'Actions' || h === 'Price' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 font-medium whitespace-nowrap max-w-[200px] truncate">{b.name}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-muted-foreground">{b.bundle_categories?.name ?? '-'}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-primary whitespace-nowrap">KES {b.price}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">{b.validity}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-muted-foreground">{b.data_amount ?? b.sms_amount ?? b.minutes_amount ?? '-'}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-xs">
                          {b.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(b)}>
                            {b.is_active ? <PowerOff className="h-4 w-4 text-warning" /> : <Power className="h-4 w-4 text-success" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(b)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-balance">{editTarget ? 'Edit Bundle' : 'New Bundle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-normal">Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setField('category_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-normal">Name</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. KES 20 - 250MB (24 Hours)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-normal">Price (KES)</Label>
                <Input className="mt-1" type="number" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="20" />
              </div>
              <div>
                <Label className="text-sm font-normal">Validity</Label>
                <Input className="mt-1" value={form.validity} onChange={(e) => setField('validity', e.target.value)} placeholder="24 Hours" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm font-normal">Data</Label>
                <Input className="mt-1" value={form.data_amount} onChange={(e) => setField('data_amount', e.target.value)} placeholder="250MB" />
              </div>
              <div>
                <Label className="text-sm font-normal">SMS</Label>
                <Input className="mt-1" value={form.sms_amount} onChange={(e) => setField('sms_amount', e.target.value)} placeholder="200 SMS" />
              </div>
              <div>
                <Label className="text-sm font-normal">Minutes</Label>
                <Input className="mt-1" value={form.minutes_amount} onChange={(e) => setField('minutes_amount', e.target.value)} placeholder="45 Mins" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-normal">Description (optional)</Label>
              <Input className="mt-1" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Brief description" />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setField('is_active', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_active" className="text-sm font-normal cursor-pointer">Active (visible to customers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Bundle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone and will affect associated orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
