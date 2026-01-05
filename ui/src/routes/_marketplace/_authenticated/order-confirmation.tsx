import { useCart } from "@/hooks/use-cart";
import { useOrderByCheckoutSession } from "@/integrations/api/orders";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Package,
  Truck,
} from "lucide-react";
import { useEffect } from "react";

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
  paid: "Payment Received",
  processing: "Processing",
  printing: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const shouldPollStatus = (status?: string) => {
  return (
    status && ["pending", "paid", "processing", "printing"].includes(status)
  );
};

function OrderConfirmationPage() {
  const { session_id } = Route.useSearch();
  const { clearCart } = useCart();

  const { data: orderData, isLoading } = useOrderByCheckoutSession(session_id, {
    refetchInterval: (query) => {
      const status = query.state.data?.order?.status;
      return shouldPollStatus(status) ? 5000 : false;
    },
  });

  const order = orderData?.order;

  useEffect(() => {
    if (order && order.status !== "pending") {
      clearCart();
    }
  }, [order?.status]);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 animate-spin text-[#717182] mb-4" />
          <p className="text-[#717182]">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
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
        <div className="flex justify-center mb-6">
          <div className="size-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="size-12 text-green-600" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-base text-center mb-4">Order Confirmed!</h1>

        <p className="text-lg text-[#717182] text-center mb-12 leading-7">
          Thank you for your purchase. Your order has been received and is being
          processed.
        </p>

        <div className="border border-[rgba(0,0,0,0.1)] p-6 space-y-6">
          {order && (
            <>
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
                      className={`font-medium ${
                        order.status === "shipped" ||
                        order.status === "delivered"
                          ? "text-green-600"
                          : order.status === "cancelled"
                          ? "text-red-600"
                          : "text-neutral-900"
                      }`}
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

              <div className="h-px bg-[rgba(0,0,0,0.1)]" />
            </>
          )}

          {order?.trackingInfo && order.trackingInfo.length > 0 && (
            <>
              <div>
                <h3 className="text-base font-medium mb-3">
                  Tracking Information
                </h3>
                <div className="space-y-3">
                  {order.trackingInfo.map((tracking, index) => (
                    <div key={index} className="bg-[#f6f6f6] p-4 rounded">
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
                            className="flex items-center gap-1 text-sm text-[#00ec97] hover:underline"
                          >
                            Track <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[rgba(0,0,0,0.1)]" />
            </>
          )}

          {order?.shippingAddress && (
            <>
              <div>
                <h3 className="text-base font-medium mb-3">Shipping Address</h3>
                <div className="text-sm text-[#717182] space-y-1">
                  <p className="text-neutral-900">
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

              <div className="h-px bg-[rgba(0,0,0,0.1)]" />
            </>
          )}

          {/* <div className="flex gap-4">
            <div className="size-10 bg-[#ececf0] rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="size-5 text-[#717182]" />
            </div>
            <div className="flex-1">
              <h4 className="text-base mb-1">Confirmation Email Sent</h4>
              <p className="text-sm text-[#717182] leading-5">
                We've sent a confirmation email to <span className="font-semibold text-neutral-950">{displayEmail}</span> with your order details and tracking information.
              </p>
            </div>
          </div> */}

          <div className="h-px bg-[rgba(0,0,0,0.1)]" />

          <div>
            <h3 className="text-base mb-4">What's Next?</h3>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="size-10 bg-[#ececf0] rounded-full flex items-center justify-center flex-shrink-0">
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
                <div className="size-10 bg-[#ececf0] rounded-full flex items-center justify-center flex-shrink-0">
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
                      : "You'll receive tracking information once your order ships. Standard delivery takes 5-7 business days."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
