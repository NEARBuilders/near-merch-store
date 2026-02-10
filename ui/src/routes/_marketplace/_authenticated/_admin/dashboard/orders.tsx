import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, RefreshCw, Search, ShoppingBag, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/utils/orpc";
import { getStatusLabel, getStatusColor } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/orders")({
  loader: () => apiClient.getAllOrders({ limit: 100, offset: 0 }),
  errorComponent: OrdersError,
  component: AdminOrdersPage,
});

type Order = Awaited<ReturnType<typeof apiClient.getAllOrders>>["orders"][0];

function OrdersError({ error }: { error: Error }) {
  const router = useRouter();

  const isDatabaseError = error.message?.includes('relation') || 
                         error.message?.includes('table') ||
                         error.message?.includes('column');

  return (
    <div className="text-center py-12">
      <p className="text-destructive mb-2 font-semibold">Failed to load orders</p>
      <p className="text-sm text-foreground/90 dark:text-muted-foreground mb-4">{error.message}</p>
      {isDatabaseError && (
        <p className="text-xs text-foreground/60 dark:text-muted-foreground mb-4">
          Database may not be initialized. Run <code className="bg-background px-1.5 py-0.5 rounded text-[#00EC97]">bun db:migrate</code> in your terminal.
        </p>
      )}
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
          <span className="text-foreground/90 dark:text-muted-foreground">Provider:</span>
          <span className="ml-2 font-medium text-foreground">{String(paymentDetails.provider || 'N/A')}</span>
        </div>
        <div>
          <span className="text-foreground/90 dark:text-muted-foreground">Created:</span>
          <span className="ml-2 font-medium text-foreground">
            {paymentDetails.createdAt
              ? new Date(String(paymentDetails.createdAt)).toLocaleString()
              : 'N/A'}
          </span>
        </div>
      </div>

      {request && (
        <div className="rounded-2xl bg-background border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('request')}
            className="w-full flex items-center justify-between p-4 hover:bg-background/60 transition-colors"
          >
            <span className="font-semibold">Request Payload</span>
            {expandedSections.request ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.request && (
            <div className="p-4 border-t border-border/60 bg-background/40">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {response && (
        <div className="rounded-2xl bg-background border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('response')}
            className="w-full flex items-center justify-between p-4 hover:bg-background/60 transition-colors"
          >
            <span className="font-semibold">Response</span>
            {expandedSections.response ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.response && (
            <div className="p-4 border-t border-border/60 bg-background/40">
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
  const loaderData = Route.useLoaderData();
  const [search, setSearch] = useState("");

  if (!loaderData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Orders Management</h2>
            <p className="text-sm text-foreground/90 dark:text-muted-foreground">View and manage all customer orders</p>
          </div>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
              <p className="text-sm text-foreground/90 dark:text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { orders } = loaderData;

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
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Payment
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-background border border-border/60">
                    <DialogHeader>
                      <DialogTitle>Payment Details</DialogTitle>
                    </DialogHeader>
                    <PaymentDetailsView paymentDetails={order.paymentDetails!} />
                  </DialogContent>
                </Dialog>
              )}
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
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Orders Management</h2>
          <p className="text-sm text-foreground/90 dark:text-muted-foreground">View and manage all customer orders</p>
        </div>
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-background border border-border/60 px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/50 dark:text-muted-foreground" />
          <Input
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00EC97] hover:border-border/60 text-sm"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl bg-background border border-border/60 p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-foreground/50 dark:text-muted-foreground mb-4" />
          <p className="text-foreground/90 dark:text-muted-foreground font-medium">No orders found</p>
          <p className="text-sm text-foreground/70 dark:text-muted-foreground mt-1">
            {search ? "Try adjusting your search criteria" : "Orders will appear here once customers make purchases"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl bg-background border border-border/60 overflow-hidden">
            <DataTable columns={columns} data={filteredOrders} />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((order) => {
              const hasTracking = order.trackingInfo && order.trackingInfo.length > 0;
              const hasPaymentDetails = order.paymentDetails && Object.keys(order.paymentDetails).length > 0;
              const items = order.items;
              const totalQty = items.reduce((sum: number, item) => sum + item.quantity, 0);
              const productNames = items.map((item) => item.productName).join(", ");

              return (
                <div key={order.id} className="rounded-2xl bg-background border border-border/60 p-4 space-y-3">
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
                      <p className="text-xs text-foreground/70 dark:text-muted-foreground truncate mb-1" title={order.userId}>
                        {order.userId}
                      </p>
                      <p className="text-xs text-foreground/70 dark:text-muted-foreground">
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
                      {totalQty} item{totalQty !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-foreground/70 dark:text-muted-foreground line-clamp-2" title={productNames}>
                      {productNames}
                    </p>
                  </div>

                  {(hasPaymentDetails || hasTracking) && (
                    <div className="flex items-center gap-2 pt-2">
                      {hasPaymentDetails && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="flex-1 px-3 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Payment
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-background border border-border/60">
                            <DialogHeader>
                              <DialogTitle>Payment Details</DialogTitle>
                            </DialogHeader>
                            <PaymentDetailsView paymentDetails={order.paymentDetails!} />
                          </DialogContent>
                        </Dialog>
                      )}
                      {hasTracking && (
                        <a
                          href={order.trackingInfo![0]!.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center text-xs font-semibold hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors",
                            !hasPaymentDetails && "w-full"
                          )}
                        >
                          Track <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
