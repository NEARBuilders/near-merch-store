import { useCart } from "@/hooks/use-cart";
import { useOrderByCheckoutSession } from "@/integrations/api/orders";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Package,
  Truck,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type SearchParams = {
  orderNumber?: string;
  email?: string;
  session_id?: string;
};

export const Route = createFileRoute("/_marketplace/_authenticated/order-confirmation")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    orderNumber:
      typeof search.orderNumber === "string" ? search.orderNumber : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    session_id:
      typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: OrderConfirmationPage,
});

const statusLabels: Record<string, string> = {
  pending: "Pending",
  draft_created: "Awaiting Payment",
  payment_pending: "Payment Processing",
  paid: "Payment Received",
  paid_pending_fulfillment: "Processing Order",
  processing: "Order Placed",
  printing: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment Failed",
  expired: "Session Expired",
};

type OrderStep = 'payment' | 'processing' | 'shipped';

interface StepConfig {
  label: string;
  icon: React.ReactNode;
  activeStatuses: string[];
  completedStatuses: string[];
  errorStatuses: string[];
}

const steps: Record<OrderStep, StepConfig> = {
  payment: {
    label: 'Payment',
    icon: <CheckCircle className="size-5" />,
    activeStatuses: ['pending', 'draft_created', 'payment_pending'],
    completedStatuses: ['paid', 'paid_pending_fulfillment', 'processing', 'printing', 'shipped', 'delivered'],
    errorStatuses: ['payment_failed', 'expired', 'cancelled'],
  },
  processing: {
    label: 'Processing',
    icon: <Package className="size-5" />,
    activeStatuses: ['paid', 'paid_pending_fulfillment'],
    completedStatuses: ['processing', 'printing', 'shipped', 'delivered'],
    errorStatuses: [],
  },
  shipped: {
    label: 'Shipped',
    icon: <Truck className="size-5" />,
    activeStatuses: ['processing', 'printing'],
    completedStatuses: ['shipped', 'delivered'],
    errorStatuses: [],
  },
};

function getStepStatus(step: OrderStep, orderStatus?: string): 'pending' | 'active' | 'completed' | 'error' {
  if (!orderStatus) return 'pending';
  
  const config = steps[step];
  
  if (config.errorStatuses.includes(orderStatus)) return 'error';
  if (config.completedStatuses.includes(orderStatus)) return 'completed';
  if (config.activeStatuses.includes(orderStatus)) return 'active';
  
  return 'pending';
}

function OrderProgressIndicator({ status }: { status?: string }) {
  const stepOrder: OrderStep[] = ['payment', 'processing', 'shipped'];
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {stepOrder.map((step, index) => {
          const stepStatus = getStepStatus(step, status);
          const config = steps[step];
          
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "size-10 rounded-full flex items-center justify-center transition-colors",
                    stepStatus === 'completed' && "bg-green-100 text-green-600",
                    stepStatus === 'active' && "bg-yellow-100 text-yellow-600 animate-pulse",
                    stepStatus === 'pending' && "bg-gray-100 text-gray-400",
                    stepStatus === 'error' && "bg-red-100 text-red-600"
                  )}
                >
                  {stepStatus === 'active' ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : stepStatus === 'error' ? (
                    <XCircle className="size-5" />
                  ) : stepStatus === 'completed' ? (
                    <CheckCircle className="size-5" />
                  ) : (
                    config.icon
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 font-medium",
                    stepStatus === 'completed' && "text-green-600",
                    stepStatus === 'active' && "text-yellow-600",
                    stepStatus === 'pending' && "text-gray-400",
                    stepStatus === 'error' && "text-red-600"
                  )}
                >
                  {config.label}
                </span>
              </div>
              
              {index < stepOrder.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-0.5 mx-2 mt-[-1rem]",
                    getStepStatus(stepOrder[index + 1], status) !== 'pending'
                      ? "bg-green-300"
                      : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status?: string }) {
  const messages: Record<string, { icon: React.ReactNode; title: string; description: string; color: string }> = {
    pending: {
      icon: <Clock className="size-12 text-gray-400" />,
      title: "Waiting for payment...",
      description: "Please complete your payment to proceed with your order.",
      color: "gray",
    },
    draft_created: {
      icon: <Clock className="size-12 text-yellow-500 animate-pulse" />,
      title: "Waiting for payment confirmation...",
      description: "Your order is ready. Complete the payment to proceed.",
      color: "yellow",
    },
    payment_pending: {
      icon: <Loader2 className="size-12 text-yellow-500 animate-spin" />,
      title: "Payment is being processed...",
      description: "Please wait while we confirm your payment. This may take a moment.",
      color: "yellow",
    },
    paid: {
      icon: <CheckCircle className="size-12 text-green-500" />,
      title: "Payment confirmed!",
      description: "Your payment was successful. We're now processing your order.",
      color: "green",
    },
    paid_pending_fulfillment: {
      icon: <Package className="size-12 text-blue-500 animate-pulse" />,
      title: "Payment confirmed!",
      description: "Your payment was successful. We're finalizing your order with our fulfillment partners.",
      color: "blue",
    },
    processing: {
      icon: <CheckCircle className="size-12 text-green-500" />,
      title: "Order placed successfully!",
      description: "Your order has been confirmed and is being prepared for shipment.",
      color: "green",
    },
    printing: {
      icon: <Package className="size-12 text-purple-500" />,
      title: "Your order is being printed!",
      description: "Our fulfillment partners are creating your custom items.",
      color: "purple",
    },
    shipped: {
      icon: <Truck className="size-12 text-blue-500" />,
      title: "Your order has shipped!",
      description: "Your package is on its way. Check below for tracking information.",
      color: "blue",
    },
    delivered: {
      icon: <CheckCircle className="size-12 text-green-500" />,
      title: "Order delivered!",
      description: "Your order has been delivered. Enjoy your purchase!",
      color: "green",
    },
    payment_failed: {
      icon: <XCircle className="size-12 text-red-500" />,
      title: "Payment failed",
      description: "Unfortunately, your payment could not be processed. Please try again.",
      color: "red",
    },
    expired: {
      icon: <AlertTriangle className="size-12 text-orange-500" />,
      title: "Session expired",
      description: "Your payment session has expired. Please create a new checkout.",
      color: "orange",
    },
    cancelled: {
      icon: <XCircle className="size-12 text-red-500" />,
      title: "Order cancelled",
      description: "This order has been cancelled.",
      color: "red",
    },
  };

  const message = messages[status || 'pending'] || messages.pending;

  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">{message.icon}</div>
      <h1 className="text-xl font-medium mb-2">{message.title}</h1>
      <p className="text-[#717182]">{message.description}</p>
    </div>
  );
}

const shouldPollStatus = (status?: string) => {
  return (
    status && ["pending", "draft_created", "payment_pending", "paid", "paid_pending_fulfillment", "processing", "printing"].includes(status)
  );
};

function OrderConfirmationPage() {
  const { session_id } = Route.useSearch();
  const { clearCart } = useCart();

  const { data: orderData, isLoading, error } = useOrderByCheckoutSession(session_id, {
    refetchInterval: (query) => {
      const status = query.state.data?.order?.status;
      return shouldPollStatus(status) ? 3000 : false;
    },
  });

  const order = orderData?.order;

  useEffect(() => {
    if (order && ['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      clearCart();
    }
  }, [order?.status]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 animate-spin text-[#717182] mb-4" />
          <p className="text-[#717182]">Loading order details...</p>
        </div>
      </div>
    );
  }

  const isErrorState = order?.status === 'payment_failed' || order?.status === 'expired' || order?.status === 'cancelled';
  const isSuccessState = order?.status === 'processing' || order?.status === 'shipped' || order?.status === 'delivered';

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <svg className="size-4" fill="none" viewBox="0 0 16 16">
              <path
                d="M8 12.6667L3.33333 8L8 3.33333"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.33333"
              />
              <path
                d="M12.6667 8H3.33333"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.33333"
              />
            </svg>
            <span className="text-sm">Back to Store</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[672px] mx-auto px-4 py-16">
        <OrderProgressIndicator status={order?.status} />
        <StatusMessage status={order?.status} />

        {isErrorState && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center px-6 py-3 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Try Again
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        )}

        {order && !isErrorState && (
          <div className="border border-border p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#717182]">Order ID</span>
                  <span className="font-mono">
                    {order.id.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#717182]">Status</span>
                  <span
                    className={cn(
                      "font-medium",
                      (order.status === "shipped" || order.status === "delivered") && "text-green-600",
                      order.status === "cancelled" && "text-red-600",
                      order.status === "payment_failed" && "text-red-600",
                      order.status === "payment_pending" && "text-yellow-600"
                    )}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#717182]">Items</span>
                  <span>
                    {order.items.length} item
                    {order.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#717182]">Total Quantity</span>
                  <span>
                    {order.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#717182]">Total</span>
                  <span className="font-medium">
                    ${order.totalAmount.toFixed(2)} {order.currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {order?.trackingInfo && order.trackingInfo.length > 0 && (
              <>
                <div>
                  <h3 className="text-base font-medium mb-3">
                    Tracking Information
                  </h3>
                  <div className="space-y-3">
                    {order.trackingInfo.map((tracking, index) => (
                      <div key={index} className="bg-muted p-4 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">
                              {tracking.shipmentMethodName}
                            </p>
                            <p className="text-sm text-[#717182] font-mono">
                              {tracking.trackingCode}
                            </p>
                          </div>
                          {tracking.trackingUrl && (
                            <a
                              href={tracking.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              Track <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />
              </>
            )}

            {order?.shippingAddress && (
              <>
                <div>
                  <h3 className="text-base font-medium mb-3">Shipping Address</h3>
                  <div className="text-sm text-[#717182] space-y-1">
                    <p className="text-foreground">
                      {order.shippingAddress.firstName}{" "}
                      {order.shippingAddress.lastName}
                    </p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                      {order.shippingAddress.postCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>

                <div className="h-px bg-border" />
              </>
            )}

            <div>
              <h3 className="text-base mb-4">What's Next?</h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="size-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Package className="size-5 text-[#717182]" />
                  </div>
                  <div>
                    <h4 className="text-base mb-1">Processing Your Order</h4>
                    <p className="text-sm text-[#717182] leading-5">
                      We're preparing your items for shipment. This typically
                      takes 1-2 business days.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="size-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="size-5 text-[#717182]" />
                  </div>
                  <div>
                    <h4 className="text-base mb-1">Shipping & Delivery</h4>
                    <p className="text-sm text-[#717182] leading-5">
                      {order?.deliveryEstimate
                        ? `Expected delivery: ${new Date(
                            order.deliveryEstimate.minDeliveryDate
                          ).toLocaleDateString()} - ${new Date(
                            order.deliveryEstimate.maxDeliveryDate
                          ).toLocaleDateString()}`
                        : "You'll receive tracking information once your order ships."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSuccessState && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/account"
              className="inline-flex items-center justify-center px-6 py-3 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              View Your Orders
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        )}

        <p className="text-sm text-[#717182] text-center mt-8">
          Need help with your order? Contact us at{" "}
          <a
            href="mailto:merch@near.foundation"
            className="underline hover:text-neutral-950 transition-colors"
          >
            merch@near.foundation
          </a>
        </p>
      </div>
    </div>
  );
}
