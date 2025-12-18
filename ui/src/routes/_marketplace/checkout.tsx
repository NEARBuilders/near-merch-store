import { useCart } from '@/hooks/use-cart';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Checkbox } from '@/components/ui/checkbox';
import { NearMark } from '@/components/near-mark';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute("/_marketplace/checkout")({
  component: CheckoutPage,
});

type AddressFormData = {
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
  shipping?: {
    firstName: string;
    lastName: string;
    country: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
};

const countryOptions = [
  { name: 'United States', code: 'US' },
  { name: 'Canada', code: 'CA' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Australia', code: 'AU' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
  { name: 'Italy', code: 'IT' },
  { name: 'Spain', code: 'ES' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Sweden', code: 'SE' },
  { name: 'Norway', code: 'NO' },
  { name: 'Finland', code: 'FI' },
  { name: 'Denmark', code: 'DK' },
  { name: 'Belgium', code: 'BE' },
  { name: 'Austria', code: 'AT' },
  { name: 'Switzerland', code: 'CH' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Ireland', code: 'IE' },
  { name: 'New Zealand', code: 'NZ' },
  { name: 'Singapore', code: 'SG' },
  { name: 'Japan', code: 'JP' },
];

const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
  'Wisconsin', 'Wyoming'
];

type ShippingQuote = {
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  providerBreakdown: Array<{
    provider: string;
    itemCount: number;
    subtotal: number;
    selectedShipping: {
      rateId: string;
      rateName: string;
      shippingCost: number;
      minDeliveryDays?: number;
      maxDeliveryDays?: number;
    };
    availableRates: Array<{
      rateId: string;
      rateName: string;
      shippingCost: number;
      currency: string;
      minDeliveryDays?: number;
      maxDeliveryDays?: number;
    }>;
  }>;
  estimatedDelivery?: {
    minDays?: number;
    maxDays?: number;
  };
};

function CheckoutPage() {
  const { cartItems, subtotal } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(false);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const navigate = useNavigate();

  const shippingCost = shippingQuote?.shippingCost || 0;
  const tax = subtotal * 0.08;
  const total = subtotal + tax + shippingCost;
  const nearAmount = (total / 3.5).toFixed(2);

  const form = useForm({
    defaultValues: {
      billing: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
      },
      shipping: undefined,
    } as AddressFormData,
    onSubmit: async ({ value }) => {
      // Calculate shipping when form is submitted
      await handleCalculateShipping(value);
    },
  });

  const quoteMutation = useMutation({
    mutationFn: async (params: {
      items: Array<{ productId: string; variantId?: string; quantity: number }>;
      shippingAddress: {
        firstName: string;
        lastName: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        postCode: string;
        country: string;
        email: string;
        phone?: string;
      };
    }) => {
      return await apiClient.quote(params);
    },
    onSuccess: (data) => {
      setShippingQuote(data);
      toast.success('Shipping calculated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to calculate shipping', {
        description: error.message || 'Please try again',
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (formData: AddressFormData) => {
      if (cartItems.length === 0) throw new Error('Cart is empty');
      if (!shippingQuote) throw new Error('Please calculate shipping first');

      // Use shipping address if provided, otherwise use billing address
      const addressData = shipToDifferentAddress && formData.shipping
        ? formData.shipping
        : formData.billing;

      // Convert country name to 2-letter code
      const countryMapping = countryOptions.find(c => c.name === addressData.country);
      const countryCode = countryMapping?.code || 'US';

      // Build selectedRates from quote
      const selectedRates: Record<string, string> = {};
      shippingQuote.providerBreakdown.forEach(provider => {
        selectedRates[provider.provider] = provider.selectedShipping.rateId;
      });

      const result = await apiClient.createCheckout({
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.size !== 'N/A' ? item.size : undefined,
          quantity: item.quantity,
        })),
        shippingAddress: {
          firstName: addressData.firstName,
          lastName: addressData.lastName,
          addressLine1: addressData.address1,
          addressLine2: addressData.address2,
          city: addressData.city,
          state: addressData.state,
          postCode: addressData.zip,
          country: countryCode,
          email: formData.billing.email,
          phone: formData.billing.phone,
        },
        selectedRates,
        shippingCost: shippingQuote.shippingCost,
        successUrl: `${window.location.origin}/order-confirmation`,
        cancelUrl: `${window.location.origin}/checkout`,
      });
      return result;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    },
    onError: (error: Error) => {
      toast.error('Checkout failed', {
        description: error.message || 'Please try again later',
      });
    },
  });

  const handleCalculateShipping = async (formData: AddressFormData) => {
    setIsCalculatingShipping(true);
    
    // Use shipping address if provided, otherwise use billing address
    const addressData = shipToDifferentAddress && formData.shipping
      ? formData.shipping
      : formData.billing;

    // Convert country name to 2-letter code
    const countryMapping = countryOptions.find(c => c.name === addressData.country);
    const countryCode = countryMapping?.code || 'US';

    try {
      await quoteMutation.mutateAsync({
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.size !== 'N/A' ? item.size : undefined,
          quantity: item.quantity,
        })),
        shippingAddress: {
          firstName: addressData.firstName,
          lastName: addressData.lastName,
          addressLine1: addressData.address1,
          addressLine2: addressData.address2,
          city: addressData.city,
          state: addressData.state,
          postCode: addressData.zip,
          country: countryCode,
          email: formData.billing.email,
          phone: formData.billing.phone,
        },
      });
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handlePayWithCard = async () => {
    // Check if user is authenticated before proceeding with checkout
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      navigate({
        to: "/login",
        search: {
          redirect: "/checkout",
        },
      });
      return;
    }

    // Get form values
    const formData = form.state.values;
    
    // Basic validation
    if (!formData.billing.firstName || !formData.billing.lastName || 
        !formData.billing.email || !formData.billing.phone ||
        !formData.billing.country || !formData.billing.address1 ||
        !formData.billing.city || !formData.billing.state || !formData.billing.zip) {
      toast.error('Please fill in all required billing fields');
      return;
    }

    if (shipToDifferentAddress) {
      if (!formData.shipping?.firstName || !formData.shipping?.lastName ||
          !formData.shipping?.country || !formData.shipping?.address1 ||
          !formData.shipping?.city || !formData.shipping?.state || !formData.shipping?.zip) {
        toast.error('Please fill in all required shipping fields');
        return;
      }
    }

    // Calculate shipping if not already done
    if (!shippingQuote) {
      await handleCalculateShipping(formData);
      // Don't proceed to checkout yet, let user review shipping cost
      return;
    }
    
    checkoutMutation.mutate(formData);
  };

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
          {/* Left Side - Billing Details Form */}
          <div>
            <h2 className="text-2xl font-medium mb-6">Billing Details</h2>
            
            <form className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <form.Field
                  name="billing.firstName"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                />
                
                <form.Field
                  name="billing.lastName"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                />
              </div>

              {/* Country/Region */}
              <form.Field
                name="billing.country"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="country">
                      Country / Region <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger id="country" className="w-full">
                        <SelectValue placeholder="Select a country / region..." />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              {/* Street address */}
              <form.Field
                name="billing.address1"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="address1">
                      Street address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address1"
                      placeholder="House number and street name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </div>
                )}
              />

              <form.Field
                name="billing.address2"
                children={(field) => (
                  <div>
                    <Input
                      placeholder="Apartment, suite, unit, etc. (optional)"
                      value={field.state.value || ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />

              {/* Town / City */}
              <form.Field
                name="billing.city"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      Town / City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </div>
                )}
              />

              {/* State */}
              <form.Field
                name="billing.state"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="state">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger id="state" className="w-full">
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              {/* ZIP Code */}
              <form.Field
                name="billing.zip"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="zip">
                      ZIP Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="zip"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </div>
                )}
              />

              {/* Email */}
              <form.Field
                name="billing.email"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </div>
                )}
              />

              {/* Phone */}
              <form.Field
                name="billing.phone"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </div>
                )}
              />

              {/* Ship to Different Address */}
              <div className="pt-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="shipToDifferent"
                    checked={shipToDifferentAddress}
                    onCheckedChange={(checked) => setShipToDifferentAddress(checked as boolean)}
                  />
                  <Label htmlFor="shipToDifferent" className="text-lg font-semibold text-blue-600 cursor-pointer">
                    Ship To A Different Address?
                  </Label>
                </div>
              </div>

              {/* Shipping Address Form (Conditional) */}
              {shipToDifferentAddress && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-xl font-medium">Shipping Address</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <form.Field
                      name="shipping.firstName"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="shippingFirstName">
                            First name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="shippingFirstName"
                            value={field.state.value || ''}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                    
                    <form.Field
                      name="shipping.lastName"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="shippingLastName">
                            Last name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="shippingLastName"
                            value={field.state.value || ''}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                  </div>

                  <form.Field
                    name="shipping.country"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="shippingCountry">
                          Country / Region <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={field.state.value || ''}
                          onValueChange={field.handleChange}
                        >
                          <SelectTrigger id="shippingCountry" className="w-full">
                            <SelectValue placeholder="Select a country / region..." />
                          </SelectTrigger>
                          <SelectContent>
                            {countryOptions.map((country) => (
                              <SelectItem key={country.code} value={country.name}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <form.Field
                    name="shipping.address1"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="shippingAddress1">
                          Street address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="shippingAddress1"
                          placeholder="House number and street name"
                          value={field.state.value || ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />

                  <form.Field
                    name="shipping.address2"
                    children={(field) => (
                      <div>
                        <Input
                          placeholder="Apartment, suite, unit, etc. (optional)"
                          value={field.state.value || ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />

                  <form.Field
                    name="shipping.city"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="shippingCity">
                          Town / City <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="shippingCity"
                          value={field.state.value || ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />

                  <form.Field
                    name="shipping.state"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="shippingState">
                          State <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={field.state.value || ''}
                          onValueChange={field.handleChange}
                        >
                          <SelectTrigger id="shippingState" className="w-full">
                            <SelectValue placeholder="Select an option..." />
                          </SelectTrigger>
                          <SelectContent>
                            {usStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <form.Field
                    name="shipping.zip"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="shippingZip">
                          ZIP Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="shippingZip"
                          value={field.state.value || ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Calculate Shipping Button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => handleCalculateShipping(form.state.values)}
                  disabled={isCalculatingShipping || quoteMutation.isPending}
                  className="w-full bg-neutral-950 text-white py-3 px-6 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isCalculatingShipping || quoteMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full" />
                      Calculating Shipping...
                    </span>
                  ) : shippingQuote ? (
                    'Recalculate Shipping'
                  ) : (
                    'Calculate Shipping'
                  )}
                </button>
                {shippingQuote && (
                  <p className="text-sm text-green-600 mt-2 text-center">
                    ✓ Shipping calculated: ${shippingCost.toFixed(2)}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Right Side - Order Summary and Payment */}
          <div>
            <div className="border border-[rgba(0,0,0,0.1)] p-8 mb-6">
              <div className="mb-6">
                <h2 className="text-base font-medium mb-6">Order Summary</h2>

                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="flex gap-4">
                      <div className="size-20 bg-[#ececf0] border border-[rgba(0,0,0,0.1)] shrink-0 overflow-hidden">
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
                    {isCalculatingShipping ? (
                      <span className="text-muted-foreground">Calculating...</span>
                    ) : shippingQuote ? (
                      `$${shippingCost.toFixed(2)}`
                    ) : (
                      <span className="text-muted-foreground">Calculated at checkout</span>
                    )}
                  </span>
                </div>
                {shippingQuote?.estimatedDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#717182]">Estimated Delivery</span>
                    <span className="text-xs">
                      {shippingQuote.estimatedDelivery.minDays}-{shippingQuote.estimatedDelivery.maxDays} business days
                    </span>
                  </div>
                )}
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

            <div className="border border-border p-6 mb-6">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms" 
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="terms" 
                  className="text-sm leading-relaxed cursor-pointer select-none"
                >
                  By checking this box, you agree to our{' '}
                  <Link 
                    to="/terms-of-service" 
                    className="underline hover:text-neutral-950 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </label>
              </div>
            </div>

            {acceptedTerms && (
              <>
                <h2 className="text-base font-medium mb-6">
                  Choose Payment Method
                </h2>

                <div className="space-y-6">
                  <div className="w-full border border-border p-6 text-left relative opacity-50 cursor-not-allowed">
                    <div className="flex items-start gap-3">
                      <div className="size-10 bg-[#00ec97] flex items-center justify-center shrink-0">
                        <NearMark className="size-6 text-black" />
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

                  <button
                    onClick={handlePayWithCard}
                    disabled={checkoutMutation.isPending}
                    className="block w-full border border-border p-6 hover:border-neutral-950 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 bg-[#d6d3ff] flex items-center justify-center shrink-0">
                        {checkoutMutation.isPending ? (
                          <div className="animate-spin size-5 border-2 border-[#635BFF]/30 border-t-[#635BFF] rounded-full" />
                        ) : (
                          <CreditCard className="size-6 text-[#635BFF]" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-base mb-1">
                          {checkoutMutation.isPending ? 'Redirecting...' : 'Pay with Card'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-[#635bff]">
                          <span>Powered by</span>
                          <span className="font-semibold">stripe</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-[#717182] mt-4">
                      {checkoutMutation.isPending 
                        ? 'Please wait...'
                        : 'Traditional checkout with credit card'
                      }
                    </p>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
