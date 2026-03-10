import { useState, useEffect } from 'react';
import { ExternalLink, History, Check, Trash2 } from 'lucide-react';
import { apiClient } from '@/utils/orpc';
import { getStatusLabel } from '@/lib/order-status';

type AuditLog = Awaited<ReturnType<typeof apiClient.getOrderAuditLog>>['logs'][0];

interface AuditLogViewerProps {
  orderId: string;
  variant?: 'admin' | 'customer';
  className?: string;
}

function formatActor(actor: string): string {
  if (actor.startsWith('service:')) {
    return actor.replace('service:', '').charAt(0).toUpperCase() + actor.replace('service:', '').slice(1);
  }
  if (actor.startsWith('admin:')) {
    return actor.replace('admin:', '');
  }
  return actor;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'status_change':
      return <Check className="h-4 w-4 text-[#00EC97]" />;
    case 'tracking_update':
      return <ExternalLink className="h-4 w-4 text-blue-500" />;
    case 'delete':
      return <Trash2 className="h-4 w-4 text-destructive" />;
    default:
      return <History className="h-4 w-4 text-foreground/50" />;
  }
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'status_change':
      return 'Status changed';
    case 'tracking_update':
      return 'Tracking updated';
    case 'fulfillment_update':
      return 'Fulfillment updated';
    case 'admin_edit':
      return 'Admin edit';
    case 'delete':
      return 'Order deleted';
    default:
      return action;
  }
}

export function AuditLogViewer({ orderId, variant = 'admin', className = '' }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orderId) return;

    setIsLoading(true);
    setError(null);
    
    apiClient.getOrderAuditLog({ id: orderId })
      .then(result => {
        // Filter logs for customer view
        const filteredLogs = variant === 'customer' 
          ? result.logs.filter(log => log.action === 'status_change' || log.action === 'tracking_update')
          : result.logs;
        setLogs(filteredLogs);
      })
      .catch(err => {
        console.error('Failed to fetch audit log:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setIsLoading(false));
  }, [orderId, variant]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00EC97]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-destructive py-8">
        Failed to load order history. Please try again.
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-center text-foreground/70 py-8">
        No history available for this order.
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {logs.map((log) => (
        <div 
          key={log.id} 
          className="flex gap-3 p-3 rounded-lg bg-background/60 border border-border/60"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActionIcon(log.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">
                {getActionLabel(log.action)}
              </span>
              {variant === 'admin' && (
                <span className="text-xs text-foreground/50">
                  by {formatActor(log.actor)}
                </span>
              )}
            </div>
            
            {log.oldValue && log.newValue && (
              <div className="text-xs text-foreground/70 mb-1">
                {log.action === 'status_change' ? (
                  <>
                    <span className="line-through text-foreground/50">
                      {getStatusLabel(log.oldValue as any)}
                    </span>
                    {' → '}
                    <span className="text-foreground font-medium">
                      {getStatusLabel(log.newValue as any)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="line-through text-foreground/50">{log.oldValue}</span>
                    {' → '}
                    <span className="text-foreground">{log.newValue}</span>
                  </>
                )}
              </div>
            )}
            
            {log.metadata && typeof log.metadata.reason === 'string' && (
              <p className="text-xs text-foreground/60 italic">
                Reason: {log.metadata.reason}
              </p>
            )}
            
            <p className="text-xs text-foreground/50 mt-1">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Timeline variant for compact display
interface AuditLogTimelineProps {
  orderId: string;
  className?: string;
}

export function AuditLogTimeline({ orderId, className = '' }: AuditLogTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    setIsLoading(true);
    apiClient.getOrderAuditLog({ id: orderId })
      .then(result => {
        const filteredLogs = result.logs.filter(log => 
          log.action === 'status_change' || log.action === 'tracking_update'
        );
        setLogs(filteredLogs);
      })
      .catch(error => console.error('Failed to fetch audit log:', error))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00EC97]"></div>
      </div>
    );
  }

  if (logs.length === 0) return null;

  return (
    <div className={`space-y-0 ${className}`}>
      <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
        <History className="h-5 w-5" />
        Order History
      </h3>
      <div className="space-y-0">
        {logs.map((log, index) => (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-[#00EC97]' : 'bg-border/60'}`} />
              {index < logs.length - 1 && <div className="w-0.5 flex-1 bg-border/30 my-1" />}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-foreground">
                {getActionLabel(log.action)}
              </p>
              {log.oldValue && log.newValue && log.action === 'status_change' && (
                <p className="text-xs text-foreground/70 mt-1">
                  {getStatusLabel(log.oldValue as any)}
                  {' → '}
                  <span className="text-foreground font-medium">
                    {getStatusLabel(log.newValue as any)}
                  </span>
                </p>
              )}
              <p className="text-xs text-foreground/50 mt-1">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
