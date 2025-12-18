import { useCart } from '@/hooks/use-cart';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useGetShippingQuote, type ShippingAddress, type ShippingRate } from '@/integrations/marketplace-api/checkout';

export const Route = createFileRoute("/_marketplace/checkout")({
  component: CheckoutPage,
});

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
];

function CheckoutPage() {
  const { cartItems, subtotal } = useCart();
  const [discountCode, setDiscountCode] = useState("");

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postCode: '',
    country: 'US',
    email: '',
    phone: '',
  });

  // Quote state
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null);
  const [hasQuote, setHasQuote] = useState(false);

  const getQuoteMutation = useGetShippingQuote();

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
    // Reset quote when address changes
    if (hasQuote) {
      setHasQuote(false);
      setShippingRates([]);
      setSelectedShippingRate(null);
    }
  };

  const handleGetQuote = async () => {
    const items = cartItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    try {
      const result = await getQuoteMutation.mutateAsync({
        items,
        shippingAddress,
      });
      setShippingRates(result.shippingRates);
      setHasQuote(true);
      // Auto-select the first rate
      if (result.shippingRates.length > 0) {
        setSelectedShippingRate(result.shippingRates[0]);
      }
    } catch (error) {
      console.error('Failed to get shipping quote:', error);
    }
  };

  const isAddressValid =
    shippingAddress.firstName.trim() !== '' &&
    shippingAddress.lastName.trim() !== '' &&
    shippingAddress.addressLine1.trim() !== '' &&
    shippingAddress.city.trim() !== '' &&
    shippingAddress.state.trim() !== '' &&
    shippingAddress.postCode.trim() !== '' &&
    shippingAddress.country.trim() !== '' &&
    shippingAddress.email.trim() !== '';

  const shippingCost = selectedShippingRate?.rate ?? 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;
  const nearAmount = (total / 3.5).toFixed(2);

  if (cartItems.length === 0) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Your cart is empty</h1>
          <Link to="/" className="text-[#00ec97] hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/cart"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="size-4" />
            <span className="text-sm">Back to Cart</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-2xl font-medium mb-8 tracking-[-0.48px]">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Shipping Address & Order Summary */}
          <div className="space-y-8">
            {/* Shipping Address Form */}
            <div className="border border-[rgba(0,0,0,0.1)] p-8">
              <h2 className="text-base font-medium mb-6">Shipping Address</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#717182] mb-1">First Name *</label>
                    <input
                      type="text"
                      value={shippingAddress.firstName}
                      onChange={(e) => handleAddressChange('firstName', e.target.value)}
                      className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#717182] mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={shippingAddress.lastName}
                      onChange={(e) => handleAddressChange('lastName', e.target.value)}
                      className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#717182] mb-1">Email *</label>
                  <input
                    type="email"
                    value={shippingAddress.email}
                    onChange={(e) => handleAddressChange('email', e.target.value)}
                    className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#717182] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => handleAddressChange('phone', e.target.value)}
                    className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#717182] mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine1}
                    onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
                    className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#717182] mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine2}
                    onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
                    className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                    placeholder="Apt 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#717182] mb-1">City *</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#717182] mb-1">State/Province *</label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#717182] mb-1">Postal Code *</label>
                    <input
                      type="text"
                      value={shippingAddress.postCode}
                      onChange={(e) => handleAddressChange('postCode', e.target.value)}
                      className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                      placeholder="10001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#717182] mb-1">Country *</label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="w-full bg-background border border-border px-4 py-2 text-sm outline-none focus:border-neutral-950 transition-colors"
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGetQuote}
                  disabled={!isAddressValid || getQuoteMutation.isPending}
                  className="w-full bg-neutral-950 text-white py-3 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {getQuoteMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Getting Quote...
                    </>
                  ) : hasQuote ? (
                    'Update Shipping Quote'
                  ) : (
                    'Get Shipping Quote'
                  )}
                </button>

                {getQuoteMutation.isError && (
                  <p className="text-red-500 text-sm">Failed to get shipping quote. Please try again.</p>
                )}
              </div>
            </div>

            {/* Shipping Options */}
            {hasQuote && shippingRates.length > 0 && (
              <div className="border border-[rgba(0,0,0,0.1)] p-8">
                <h2 className="text-base font-medium mb-6">Shipping Options</h2>
                <div className="space-y-3">
                  {shippingRates.map((rate) => (
                    <button
                      key={rate.id}
                      onClick={() => setSelectedShippingRate(rate)}
                      className={`w-full p-4 border text-left transition-colors ${
                        selectedShippingRate?.id === rate.id
                          ? 'border-neutral-950 bg-neutral-50'
                          : 'border-border hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{rate.name}</p>
                          {rate.minDeliveryDays && rate.maxDeliveryDays && (
                            <p className="text-xs text-[#717182] mt-1">
                              {rate.minDeliveryDays}-{rate.maxDeliveryDays} business days
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-medium">${rate.rate.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="border border-[rgba(0,0,0,0.1)] p-8">
              <h2 className="text-base font-medium mb-6">Order Summary</h2>

              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex gap-4">
                    <div className="size-20 bg-[#ececf0] border border-[rgba(0,0,0,0.1)] flex-shrink-0 overflow-hidden">
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.title}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-base mb-1">{item.product.title}</p>
                      <p className="text-sm text-[#717182]">
                        {item.size !== "N/A" && `Size: ${item.size} • `}Qty:{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <div className="text-base text-right">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-[rgba(0,0,0,0.1)] my-6" />

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#717182]">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717182]">Shipping</span>
                  <span>
                    {hasQuote && selectedShippingRate
                      ? `$${selectedShippingRate.rate.toFixed(2)}`
                      : 'Enter address for quote'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717182]">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="h-px bg-[rgba(0,0,0,0.1)] mb-3" />

              <div className="flex justify-between items-start">
                <span className="text-base font-medium">Total</span>
                <div className="text-right">
                  <p className="text-base font-medium">${total.toFixed(2)}</p>
                  <p className="text-sm text-[#717182]">{nearAmount} NEAR</p>
                </div>
              </div>

              <div className="mt-6 bg-muted border border-border p-4 flex items-center justify-between gap-4">
                <span className="text-sm">Apply Discount Code</span>
                <input
                  type="text"
                  placeholder="Enter Code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="bg-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neutral-950 transition-colors w-60"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Payment Methods */}
          <div>
            <h2 className="text-base font-medium mb-6">
              Choose Payment Method
            </h2>

            <div className="space-y-6">
              <div className="w-full border border-border p-6 text-left relative opacity-50 cursor-not-allowed">
                <div className="flex items-start gap-3">
                  <div className="size-10 bg-[#00ec97] flex items-center justify-center flex-shrink-0">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base">Pay with NEAR</p>
                      <span className="bg-neutral-950 text-white text-[10px] px-2 py-0.5 uppercase tracking-wider">
                        COMING SOON
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Instant checkout with your NEAR wallet
                </p>
              </div>

              {hasQuote && selectedShippingRate ? (
                <Link
                  to="/checkout/stripe"
                  search={{
                    shippingRateId: selectedShippingRate.id,
                    shippingAddress: JSON.stringify(shippingAddress),
                  }}
                  className="block w-full border border-border p-6 hover:border-neutral-950 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 bg-[#d6d3ff] flex items-center justify-center flex-shrink-0">
                      <CreditCard className="size-6 text-[#635BFF]" />
                    </div>

                    <div className="flex-1">
                      <p className="text-base mb-1">Pay with Card</p>
                      <div className="flex items-center gap-1 text-xs text-[#635bff]">
                        <span>Powered by</span>
                        <span className="font-semibold">stripe</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#717182] mt-4">
                    Traditional checkout with credit card
                  </p>
                </Link>
              ) : (
                <div className="w-full border border-border p-6 text-left opacity-50 cursor-not-allowed">
                  <div className="flex items-start gap-3">
                    <div className="size-10 bg-[#d6d3ff] flex items-center justify-center flex-shrink-0">
                      <CreditCard className="size-6 text-[#635BFF]" />
                    </div>

                    <div className="flex-1">
                      <p className="text-base mb-1">Pay with Card</p>
                      <div className="flex items-center gap-1 text-xs text-[#635bff]">
                        <span>Powered by</span>
                        <span className="font-semibold">stripe</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#717182] mt-4">
                    Enter shipping address and get quote to continue
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
