import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Package } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/utils/orpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_marketplace/_authenticated/account/orders')({
  loader: () => apiClient.getOrders({ limit: 100, offset: 0 }),
  pendingComponent: OrdersLoading,
  errorComponent: OrdersError,
  component: OrdersPage,
});

type Order = Awaited<ReturnType<typeof apiClient.getOrders>>['orders'][0];

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  paid: 'Payment Received',
  processing: 'Processing',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  printing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function OrdersLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
        <p className="text-sm text-[#717182]">Loading orders...</p>
      </div>
    </div>
  );
}

function OrdersError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="text-center py-8">
      <p className="text-red-600 mb-2">Failed to load orders</p>
      <p className="text-sm text-[#717182] mb-4">{error.message}</p>
      <Button
        onClick={() => router.invalidate()}
        variant="outline"
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
          <span className="text-sm text-[#717182]">
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
              <div className="text-xs text-[#717182] truncate" title={productNames}>
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
          <Badge className={`${statusColors[row.original.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[row.original.status] || row.original.status}
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
                  className="h-8 px-2"
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
                className="h-8 px-2"
              >
                <Link to="/order-confirmation" search={{ session_id: order.checkoutSessionId || '' }}>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium mb-1">My Orders</h2>
          <p className="text-sm text-[#717182]">View and track your order history</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#ececf0] p-8 text-center rounded">
          <Package className="mx-auto h-12 w-12 text-[#717182] mb-4" />
          <p className="text-[#717182]">No orders yet</p>
          <p className="text-sm text-[#717182] mt-1">Your orders will appear here once you make a purchase</p>
        </div>
      ) : (
        <DataTable columns={columns} data={orders} />
      )}
    </div>
  );
}
