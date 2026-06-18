import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, Loader2, Tag } from 'lucide-react';
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
import { getCategories, createCategory, updateCategory, deleteCategory, logActivity } from '@/services/api';
import type { BundleCategory } from '@/types/types';
import { toast } from 'sonner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<BundleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BundleCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BundleCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    getCategories(false).then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditTarget(null); setFormName(''); setFormDesc(''); setDialogOpen(true); };
  const openEdit = (c: BundleCategory) => { setEditTarget(c); setFormName(c.name); setFormDesc(c.description ?? ''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, { name: formName.trim(), description: formDesc.trim() || null });
        await logActivity('update_category', 'category', editTarget.id, { name: formName });
        toast.success('Category updated');
      } else {
        await createCategory(formName.trim(), formDesc.trim() || undefined);
        await logActivity('create_category', 'category', undefined, { name: formName });
        toast.success('Category created');
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      toast.error(msg.includes('duplicate') ? 'Category name already exists' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: BundleCategory) => {
    try {
      await updateCategory(c.id, { is_active: !c.is_active });
      await logActivity(c.is_active ? 'deactivate_category' : 'activate_category', 'category', c.id, { name: c.name });
      toast.success(`Category ${c.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch {
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      await logActivity('delete_category', 'category', deleteTarget.id, { name: deleteTarget.name });
      toast.success('Category deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      toast.error(msg.includes('foreign') ? 'Cannot delete — bundles are assigned to this category.' : 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage bundle categories.</p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-balance">All Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded bg-muted" />)}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No categories yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs">
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(c)}>
                      {c.is_active ? <PowerOff className="h-4 w-4 text-warning" /> : <Power className="h-4 w-4 text-success" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">{editTarget ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cat-name" className="text-sm font-normal">Name</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Data Bundles"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-sm font-normal">Description (optional)</Label>
              <Input
                id="cat-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Short description"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This cannot be undone.
              Categories with bundles cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
