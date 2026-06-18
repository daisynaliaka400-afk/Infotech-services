import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getActivityLogs } from '@/services/api';
import type { ActivityLog } from '@/types/types';

const PAGE_SIZE = 30;

const actionColors: Record<string, string> = {
  create_bundle: 'bg-success/15 text-success border-success/30',
  update_bundle: 'bg-info/15 text-info border-info/30',
  delete_bundle: 'bg-destructive/15 text-destructive border-destructive/30',
  activate_bundle: 'bg-success/15 text-success border-success/30',
  deactivate_bundle: 'bg-warning/15 text-warning border-warning/30',
  create_category: 'bg-success/15 text-success border-success/30',
  update_category: 'bg-info/15 text-info border-info/30',
  delete_category: 'bg-destructive/15 text-destructive border-destructive/30',
  update_settings: 'bg-info/15 text-info border-info/30',
};

function ActionBadge({ action }: { action: string }) {
  const cls = actionColors[action] ?? 'bg-muted text-muted-foreground border-border';
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    getActivityLogs(page, PAGE_SIZE)
      .then(({ logs: l, total: t }) => { setLogs(l); setTotal(t); })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all admin actions.</p>
      </div>

      <Card className="border-border min-w-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-balance">{total} log{total !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 rounded bg-muted" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No audit logs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Action', 'Entity', 'Admin', 'Details', 'Date'].map((h) => (
                      <th key={h} className="py-2 px-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-xs text-muted-foreground">
                        {log.entity_type ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}` : '-'}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-xs font-mono truncate max-w-[140px]">
                        {log.admin_email ?? 'System'}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-xs text-muted-foreground max-w-[160px] truncate">
                        {log.details ? (log.details.name as string ?? JSON.stringify(log.details).slice(0, 40)) : '-'}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('en-KE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
