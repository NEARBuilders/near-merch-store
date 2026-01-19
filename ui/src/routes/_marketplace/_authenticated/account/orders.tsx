import { createFileRoute, useRouter, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Package } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/utils/orpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStatusLabel, getStatusColor } from '@/lib/order-status';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_marketplace/_authenticated/account/orders')({
  loader: () => apiClient.getOrders({ limit: 100, offset: 0 }),
  pendingComponent: OrdersLoading,
  errorComponent: OrdersError,
  component: OrdersPage,
});

type Order = Awaited<ReturnType<typeof apiClient.getOrders>>['orders'][0];

function OrdersLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">Loading orders...</p>
      </div>
    </div>
  );
}
function OrdersError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="text-center py-12">
      <p className="text-destructive mb-2 font-semibold">Failed to load orders</p>
      <p className="text-sm text-foreground/90 dark:text-muted-foreground mb-4">{error.message}</p>
      <button
        type="button"
        onClick={() => router.invalidate()}
        className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors mx-auto"
      >
        Try Again
      </button>
    </div>
  );
}

function OrdersPage() {
  const { orders } = Route.useLoaderData();

  const columns: ColumnDef<Order>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Order ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-foreground">
            {row.original.id.substring(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-foreground/90 dark:text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: 'items',
        header: 'Items',
        cell: ({ row }) => {
          const items = row.original.items;
          const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const productNames = items.map((item: any) => item.productName).join(', ');

          return (
            <div className="max-w-[200px]">
              <div className="text-sm font-semibold text-foreground mb-0.5">{totalQty} item{totalQty !== 1 ? 's' : ''}</div>
              <div className="text-xs text-foreground/70 dark:text-muted-foreground truncate" title={productNames}>
                {productNames}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.original.status)}>
            {getStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            ${row.original.totalAmount.toFixed(2)} {row.original.currency}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const order = row.original;
          const hasTracking = order.trackingInfo && order.trackingInfo.length > 0;

          return (
            <div className="flex items-center gap-2">
              {hasTracking && (
                  <a
                    href={order.trackingInfo![0]!.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
              >
                  Track <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
              <Link
                to="/order-confirmation"
                search={{ sessionId: order.checkoutSessionId || '' }}
                className="px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
              >
                  View Details
                </Link>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8 space-y-6">
    <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">My Orders</h2>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">View and track your order history</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-background/40 border border-border/60 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-foreground/50 dark:text-muted-foreground mb-4" />
          <p className="text-foreground/90 dark:text-muted-foreground font-medium mb-1">No orders yet</p>
          <p className="text-sm text-foreground/70 dark:text-muted-foreground">Your orders will appear here once you make a purchase</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden">
        <DataTable columns={columns} data={orders} />
        </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => {
              const hasTracking = order.trackingInfo && order.trackingInfo.length > 0;
              const items = order.items;
              const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
              const productNames = items.map((item: any) => item.productName).join(', ');

              return (
                <div key={order.id} className="rounded-lg bg-background/40 border border-border/60 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {order.id.substring(0, 8)}...
                        </span>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/70 dark:text-muted-foreground mb-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-foreground">
                        ${order.totalAmount.toFixed(2)} {order.currency}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {totalQty} item{totalQty !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-foreground/70 dark:text-muted-foreground line-clamp-2" title={productNames}>
                      {productNames}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {hasTracking && (
                      <a
                        href={order.trackingInfo![0]!.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors",
                          !order.checkoutSessionId && "w-full"
                        )}
                      >
                        Track <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                    {order.checkoutSessionId && (
                      <Link
                        to="/order-confirmation"
                        search={{ sessionId: order.checkoutSessionId }}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors",
                          !hasTracking && "w-full"
                        )}
                      >
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
