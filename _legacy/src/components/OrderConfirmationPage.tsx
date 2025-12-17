import { CheckCircle, Mail, Package, Truck } from "lucide-react";

interface OrderConfirmationPageProps {
  orderNumber: string;
  customerEmail: string;
  onBackToStore: () => void;
}

export function OrderConfirmationPage({
  orderNumber,
  customerEmail,
  onBackToStore,
}: OrderConfirmationPageProps) {
  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <button
            onClick={onBackToStore}
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
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[672px] mx-auto px-4 py-16">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="size-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="size-12 text-green-600" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-base text-center mb-4">Order Confirmed!</h1>

        {/* Description */}
        <p className="text-lg text-[#717182] text-center mb-12 leading-7">
          Thank you for your purchase. Your order has been received and is being processed.
        </p>

        {/* Card with Order Details */}
        <div className="border border-[rgba(0,0,0,0.1)] p-6 space-y-6">
          {/* Order Number */}
          <div>
            <h3 className="text-lg font-medium mb-2">Order Number</h3>
            <p className="text-base text-[#717182] font-mono">{orderNumber}</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(0,0,0,0.1)]" />

          {/* Confirmation Email */}
          <div className="flex gap-4">
            <div className="size-10 bg-[#ececf0] rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="size-5 text-[#717182]" />
            </div>
            <div className="flex-1">
              <h4 className="text-base mb-1">Confirmation Email Sent</h4>
              <p className="text-sm text-[#717182] leading-5">
                We've sent a confirmation email to{" "}
                <span className="font-semibold text-neutral-950">{customerEmail}</span> with your
                order details and tracking information.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(0,0,0,0.1)]" />

          {/* What's Next */}
          <div>
            <h3 className="text-base mb-4">What's Next?</h3>

            <div className="space-y-4">
              {/* Processing */}
              <div className="flex gap-4">
                <div className="size-10 bg-[#ececf0] rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="size-5 text-[#717182]" />
                </div>
                <div>
                  <h4 className="text-base mb-1">Processing Your Order</h4>
                  <p className="text-sm text-[#717182] leading-5">
                    We're preparing your items for shipment. This typically takes 1-2 business days.
                  </p>
                </div>
              </div>

              {/* Shipping */}
              <div className="flex gap-4">
                <div className="size-10 bg-[#ececf0] rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck className="size-5 text-[#717182]" />
                </div>
                <div>
                  <h4 className="text-base mb-1">Shipping & Delivery</h4>
                  <p className="text-sm text-[#717182] leading-5">
                    You'll receive tracking information once your order ships. Standard delivery takes
                    5-7 business days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-sm text-[#717182] text-center mt-8">
          Need help with your order? Contact us at{" "}
          <a href="mailto:merch@near.foundation" className="underline hover:text-neutral-950 transition-colors">
            merch@near.foundation
          </a>
        </p>
      </div>
    </div>
  );
}
