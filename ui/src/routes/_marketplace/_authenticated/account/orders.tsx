import { createFileRoute, useRouter, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Package } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/utils/orpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStatusLabel, getStatusColor } from '@/lib/order-status';

export const Route = createFileRoute('/_marketplace/_authenticated/account/orders')({
  loader: () => apiClient.getOrders({ limit: 100, offset: 0 }),
  pendingComponent: OrdersLoading,
  errorComponent: OrdersError,
  component: OrdersPage,
});

type Order = Awaited<ReturnType<typeof apiClient.getOrders>>['orders'][0];

function OrdersLoading() {
  return (
    <div className="flex items-center justify-center py-8">
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
    <div className="text-center py-8">
      <p className="text-red-600 mb-2">Failed to load orders</p>
      <p className="text-sm text-foreground/90 dark:text-muted-foreground mb-4">{error.message}</p>
      <Button
        onClick={() => router.invalidate()}
        variant="outline"
        className="border-border/60 hover:border-[#00EC97] hover:text-[#00EC97] transition-colors"
      >
        Try Again
      </Button>
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
          <span className="font-mono text-sm">
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
              <div className="text-sm font-medium">{totalQty} item{totalQty !== 1 ? 's' : ''}</div>
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
          <span className="font-medium">
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
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 px-2 border-border/60 hover:border-[#00EC97] hover:text-[#00EC97] transition-colors"
                >
                  <a
                    href={order.trackingInfo![0]!.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    Track <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-2 hover:text-[#00EC97] transition-colors"
              >
                <Link to="/order-confirmation" search={{ sessionId: order.checkoutSessionId || '' }}>
                  View Details
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">My Orders</h2>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">View and track your order history</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-foreground/50 dark:text-muted-foreground mb-4" />
          <p className="text-foreground/90 dark:text-muted-foreground font-medium mb-1">No orders yet</p>
          <p className="text-sm text-foreground/70 dark:text-muted-foreground">Your orders will appear here once you make a purchase</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 overflow-hidden">
        <DataTable columns={columns} data={orders} />
        </div>
      )}
    </div>
  );
}
