import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, RefreshCw, Search, ShoppingBag, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/utils/orpc";
import { getStatusLabel, getStatusColor } from "@/lib/order-status";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/orders")({
  loader: () => apiClient.getAllOrders({ limit: 100, offset: 0 }),
  pendingComponent: OrdersLoading,
  errorComponent: OrdersError,
  component: AdminOrdersPage,
});

type Order = Awaited<ReturnType<typeof apiClient.getAllOrders>>["orders"][0];

function OrdersLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-2"></div>
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
      <Button onClick={() => router.invalidate()} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

function PaymentDetailsView({ paymentDetails }: { paymentDetails: Record<string, unknown> }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    request: true,
    response: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const request = paymentDetails.request as Record<string, unknown> | undefined;
  const response = paymentDetails.response as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[#717182]">Provider:</span>
          <span className="ml-2 font-medium">{String(paymentDetails.provider || 'N/A')}</span>
        </div>
        <div>
          <span className="text-[#717182]">Created:</span>
          <span className="ml-2 font-medium">
            {paymentDetails.createdAt
              ? new Date(String(paymentDetails.createdAt)).toLocaleString()
              : 'N/A'}
          </span>
        </div>
      </div>

      {request && (
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('request')}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">Request Payload</span>
            {expandedSections.request ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.request && (
            <div className="p-3 border-t bg-muted/30">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {response && (
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('response')}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">Response</span>
            {expandedSections.response ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.response && (
            <div className="p-3 border-t bg-muted/30">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminOrdersPage() {
  const router = useRouter();
  const { orders } = Route.useLoaderData();
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const term = search.toLowerCase();
    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(term) ||
        order.userId.toLowerCase().includes(term)
    );
  }, [orders, search]);

  const columns: ColumnDef<Order>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.id.substring(0, 8)}...</span>
        ),
      },
      {
        accessorKey: "userId",
        header: "Customer",
        cell: ({ row }) => (
          <span className="text-sm text-[#717182] truncate max-w-[150px] block" title={row.original.userId}>
            {row.original.userId}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-[#717182]">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "items",
        header: "Items",
        cell: ({ row }) => {
          const items = row.original.items;
          const totalQty = items.reduce((sum: number, item) => sum + item.quantity, 0);
          const productNames = items.map((item) => item.productName).join(", ");

          return (
            <div className="max-w-[200px]">
              <div className="text-sm font-medium">
                {totalQty} item{totalQty !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-[#717182] truncate" title={productNames}>
                {productNames}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.original.status)}>
            {getStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            ${row.original.totalAmount.toFixed(2)} {row.original.currency}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const order = row.original;
          const hasTracking = order.trackingInfo && order.trackingInfo.length > 0;
          const hasPaymentDetails = order.paymentDetails && Object.keys(order.paymentDetails).length > 0;

          return (
            <div className="flex items-center gap-2">
              {hasPaymentDetails && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Payment Details</DialogTitle>
                    </DialogHeader>
                    <PaymentDetailsView paymentDetails={order.paymentDetails!} />
                  </DialogContent>
                </Dialog>
              )}
              {hasTracking && (
                <Button variant="outline" size="sm" asChild className="h-8 px-2">
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
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium mb-1">Orders Management</h2>
          <p className="text-sm text-[#717182]">View and manage all customer orders</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.invalidate()}
          className="border-[rgba(0,0,0,0.1)]"
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#717182]" />
        <Input
          placeholder="Search by order ID or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#f3f3f5] border-0"
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-[#ececf0] dark:bg-muted p-8 text-center rounded">
          <ShoppingBag className="mx-auto h-12 w-12 text-[#717182] mb-4" />
          <p className="text-[#717182]">No orders found</p>
          <p className="text-sm text-[#717182] mt-1">
            {search ? "Try adjusting your search criteria" : "Orders will appear here once customers make purchases"}
          </p>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredOrders} />
      )}
    </div>
  );
}
