import { supabase } from '@/db/supabase';
import type {
  Bundle,
  BundleCategory,
  Order,
  Settings,
  ActivityLog,
  DashboardStats,
} from '@/types/types';

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .order('key');

  if (error) throw error;
  const map: Record<string, string> = {};
  (Array.isArray(data) ? data : []).forEach((row) => {
    map[row.key] = row.value ?? '';
  });
  return {
    site_name: map.site_name ?? 'Infotech Internet Services',
    logo_url: map.logo_url ?? '',
    whatsapp_number: map.whatsapp_number ?? '',
    support_email: map.support_email ?? '',
    footer_text: map.footer_text ?? '',
  };
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(activeOnly = true): Promise<BundleCategory[]> {
  let query = supabase.from('bundle_categories').select('*').order('sort_order');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createCategory(
  name: string,
  description?: string
): Promise<void> {
  const { error } = await supabase
    .from('bundle_categories')
    .insert({ name, description: description || null });
  if (error) throw error;
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<BundleCategory, 'name' | 'description' | 'is_active' | 'sort_order'>>
): Promise<void> {
  const { error } = await supabase.from('bundle_categories').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('bundle_categories').delete().eq('id', id);
  if (error) throw error;
}

// ── Bundles ───────────────────────────────────────────────────────────────────

export async function getBundles(activeOnly = true): Promise<Bundle[]> {
  let query = supabase
    .from('bundles')
    .select('*, bundle_categories!category_id(id, name)')
    .order('sort_order');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? (data as Bundle[]) : [];
}

export async function getBundlesByCategory(): Promise<Map<string, Bundle[]>> {
  const bundles = await getBundles(true);
  const map = new Map<string, Bundle[]>();
  for (const bundle of bundles) {
    const catName = bundle.bundle_categories?.name ?? 'Other';
    const list = map.get(catName) ?? [];
    list.push(bundle);
    map.set(catName, list);
  }
  return map;
}

export async function getBundleById(id: string): Promise<Bundle | null> {
  const { data, error } = await supabase
    .from('bundles')
    .select('*, bundle_categories!category_id(id, name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Bundle | null;
}

export async function createBundle(
  bundle: Omit<Bundle, 'id' | 'created_at' | 'updated_at' | 'bundle_categories'>
): Promise<void> {
  const { error } = await supabase.from('bundles').insert(bundle);
  if (error) throw error;
}

export async function updateBundle(
  id: string,
  updates: Partial<Omit<Bundle, 'id' | 'created_at' | 'updated_at' | 'bundle_categories'>>
): Promise<void> {
  const { error } = await supabase.from('bundles').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteBundle(id: string): Promise<void> {
  const { error } = await supabase.from('bundles').delete().eq('id', id);
  if (error) throw error;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface OrdersFilter {
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export async function getOrders(
  filter: OrdersFilter = {}
): Promise<{ orders: Order[]; total: number }> {
  const { search, status, from_date, to_date, page = 1, page_size = 20 } = filter;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,phone_number.ilike.%${search}%,bundle_name.ilike.%${search}%`
    );
  }
  if (status && status !== 'all') query = query.eq('payment_status', status);
  if (from_date) query = query.gte('created_at', from_date);
  if (to_date) query = query.lte('created_at', to_date);

  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: Array.isArray(data) ? data : [], total: count ?? 0 };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.from('orders').select('payment_status, bundle_price');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return {
    total_orders: rows.length,
    total_revenue: rows
      .filter((r) => r.payment_status === 'success')
      .reduce((s, r) => s + Number(r.bundle_price), 0),
    pending_orders: rows.filter((r) => r.payment_status === 'pending' || r.payment_status === 'processing').length,
    success_orders: rows.filter((r) => r.payment_status === 'success').length,
    failed_orders: rows.filter((r) => r.payment_status === 'failed').length,
  };
}

export async function getRevenueByDay(days = 30): Promise<{ date: string; revenue: number }[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from('orders')
    .select('bundle_price, created_at')
    .eq('payment_status', 'success')
    .gte('created_at', from.toISOString())
    .order('created_at');
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of Array.isArray(data) ? data : []) {
    const d = row.created_at.slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + Number(row.bundle_price));
  }
  return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
}

export async function getTopBundles(
  limit = 5
): Promise<{ bundle_name: string; count: number; revenue: number }[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('bundle_name, bundle_price')
    .eq('payment_status', 'success')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const map = new Map<string, { count: number; revenue: number }>();
  for (const row of Array.isArray(data) ? data : []) {
    const cur = map.get(row.bundle_name) ?? { count: 0, revenue: 0 };
    map.set(row.bundle_name, { count: cur.count + 1, revenue: cur.revenue + Number(row.bundle_price) });
  }
  return Array.from(map.entries())
    .map(([bundle_name, v]) => ({ bundle_name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── Activity Logs ─────────────────────────────────────────────────────────────

export async function getActivityLogs(page = 1, page_size = 30): Promise<{ logs: ActivityLog[]; total: number }> {
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  const { data, error, count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { logs: Array.isArray(data) ? data : [], total: count ?? 0 };
}

export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  details?: Record<string, unknown>
): Promise<void> {
  // Read admin from sessionStorage (custom auth)
  let adminUsername: string | null = null;
  try {
    const stored = sessionStorage.getItem('infotech_admin_session');
    if (stored) adminUsername = JSON.parse(stored)?.username ?? null;
  } catch (_) {}
  await supabase.from('activity_logs').insert({
    admin_id: null,
    admin_email: adminUsername,
    admin_username: adminUsername,
    action,
    entity_type: entity_type ?? null,
    entity_id: entity_id ?? null,
    details: details ?? null,
  });
}
