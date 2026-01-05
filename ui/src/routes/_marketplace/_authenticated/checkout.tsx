import { useCart } from '@/hooks/use-cart';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, CreditCard, Check, ChevronsUpDown } from 'lucide-react';
import pingpayLogoDark from '@/assets/pingpay/pingpay-logo-dark.png';
import pingpayLogoLight from '@/assets/pingpay/pingpay-logo-light.png';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Country, State } from 'country-state-city';
import type { IState } from 'country-state-city';
import { cn } from '@/lib/utils';

export const Route = createFileRoute("/_marketplace/_authenticated/checkout")({
  component: CheckoutPage,
});

type ShippingQuote = Awaited<ReturnType<typeof apiClient.quote>>;
type ShippingAddress = Parameters<typeof apiClient.quote>[0]['shippingAddress'];

function CheckoutPage() {
  const { cartItems, subtotal } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [availableStates, setAvailableStates] = useState<IState[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const navigate = useNavigate();

  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());
  const countries = useMemo(() => Country.getAllCountries(), []);

  useEffect(() => {
    fieldRefs.current.get('firstName')?.focus();
  }, []);

  const focusField = (fieldName: string) => {
    const field = fieldRefs.current.get(fieldName);
    field?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusField(nextField);
    }
  };

  const shippingCost = shippingQuote?.shippingCost || 0;
  const tax = shippingQuote?.tax ?? subtotal * 0.08;
  const total = shippingQuote?.total ?? subtotal + tax + shippingCost;
  const nearAmount = (total / 3.5).toFixed(2);

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      country: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postCode: '',
      taxId: '',
    } as ShippingAddress,
    onSubmit: async ({ value }) => {
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
        state?: string;
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
      setShippingError(null);
      toast.success('Shipping calculated successfully');
    },
    onError: (error: Error) => {
      setShippingError(error.message);
      setShippingQuote(null);
      toast.error('Failed to calculate shipping');
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (params: { formData: ShippingAddress; paymentProvider: 'stripe' | 'pingpay' }) => {
      if (cartItems.length === 0) throw new Error('Cart is empty');
      if (!shippingQuote) throw new Error('Please calculate shipping first');

      const selectedRates: Record<string, string> = {};
      shippingQuote.providerBreakdown.forEach(provider => {
        selectedRates[provider.provider] = provider.selectedShipping.rateId;
      });

      const result = await apiClient.createCheckout({
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddress: params.formData,
        selectedRates,
        shippingCost: shippingQuote.shippingCost,
        successUrl: `${window.location.origin}/order-confirmation`,
        cancelUrl: `${window.location.origin}/checkout`,
        paymentProvider: params.paymentProvider,
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

  const handleCalculateShipping = async (formData: ShippingAddress) => {
    setIsCalculatingShipping(true);

    try {
      await quoteMutation.mutateAsync({
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddress: {
          ...formData,
          state: formData.state || undefined,
        },
      });
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handlePayWithCard = async () => {
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

    const formData = form.state.values;

    if (!formData.firstName || !formData.lastName ||
      !formData.email || !formData.country ||
      !formData.addressLine1 || !formData.city || !formData.postCode) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (availableStates.length > 0 && !formData.state) {
      toast.error('State/Province is required for the selected country');
      return;
    }

    if (formData.country === 'BR' && !formData.taxId) {
      toast.error('Tax ID (CPF/CNPJ) is required for orders to Brazil');
      return;
    }

    if (!shippingQuote) {
      await handleCalculateShipping(formData);
      return;
    }

    checkoutMutation.mutate({ formData, paymentProvider: 'stripe' });
  };

  const handlePayWithPing = async () => {
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

    const formData = form.state.values;

    if (!formData.firstName || !formData.lastName ||
      !formData.email || !formData.country ||
      !formData.addressLine1 || !formData.city || !formData.postCode) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (availableStates.length > 0 && !formData.state) {
      toast.error('State/Province is required for the selected country');
      return;
    }

    if (formData.country === 'BR' && !formData.taxId) {
      toast.error('Tax ID (CPF/CNPJ) is required for orders to Brazil');
      return;
    }

    if (!shippingQuote) {
      await handleCalculateShipping(formData);
      return;
    }

    checkoutMutation.mutate({ formData, paymentProvider: 'pingpay' });
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
        <h1 className="text-2xl font-medium mb-16 tracking-[-0.48px]">
          Shipping Address
        </h1>

        <div className="grid mt-6 grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <form.Field
                  name="firstName"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        ref={(el) => {
                          if (el) fieldRefs.current.set('firstName', el);
                        }}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'lastName')}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                  )}
                />

                <form.Field
                  name="lastName"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        ref={(el) => {
                          if (el) fieldRefs.current.set('lastName', el);
                        }}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'email')}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  )}
                />
              </div>

              <form.Field
                name="email"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      ref={(el) => {
                        if (el) fieldRefs.current.set('email', el);
                      }}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'addressLine1')}
                      autoComplete="email"
                      required
                    />
                  </div>
                )}
              />

              <form.Field
                name="addressLine1"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">
                      Street address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="addressLine1"
                      ref={(el) => {
                        if (el) fieldRefs.current.set('addressLine1', el);
                      }}
                      placeholder="House number and street name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'addressLine2')}
                      autoComplete="address-line1"
                      required
                    />
                  </div>
                )}
              />

              <form.Field
                name="addressLine2"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">
                      Street address 2 <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="addressLine2"
                      ref={(el) => {
                        if (el) fieldRefs.current.set('addressLine2', el);
                      }}
                      placeholder="Apartment, suite, unit, etc."
                      value={field.state.value || ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'city')}
                      autoComplete="address-line2"
                    />
                  </div>
                )}
              />

              <form.Field
                name="city"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      Town / City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      ref={(el) => {
                        if (el) fieldRefs.current.set('city', el);
                      }}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'country')}
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                )}
              />

              <form.Field
                name="country"
                listeners={{
                  onChange: ({ value }) => {
                    if (value) {
                      const states = State.getStatesOfCountry(value);
                      setAvailableStates(states);
                      form.setFieldValue('state', '');
                      if (states.length > 0) {
                        setTimeout(() => focusField('state'), 100);
                      } else {
                        setTimeout(() => focusField('postCode'), 100);
                      }
                    } else {
                      setAvailableStates([]);
                      form.setFieldValue('state', '');
                    }
                  },
                }}
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="country">
                      Country / Region <span className="text-red-500">*</span>
                    </Label>
                    <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          ref={(el) => {
                            if (el) fieldRefs.current.set('country', el);
                          }}
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryOpen}
                          className="w-full justify-between font-normal"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setCountryOpen(true);
                            }
                          }}
                        >
                          {field.state.value
                            ? countries.find((c) => c.isoCode === field.state.value)?.flag + ' ' +
                            countries.find((c) => c.isoCode === field.state.value)?.name
                            : "Select a country / region..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search country..." autoFocus />
                          <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {countries.map((country) => (
                                <CommandItem
                                  key={country.isoCode}
                                  value={country.name}
                                  onSelect={() => {
                                    field.handleChange(country.isoCode);
                                    setCountryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.state.value === country.isoCode ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {country.flag} {country.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {availableStates.length > 0 && (
                  <form.Field
                    name="state"
                    listeners={{
                      onChange: () => {
                        setTimeout(() => focusField('postCode'), 100);
                      },
                    }}
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="state">
                          State / Province <span className="text-red-500">*</span>
                        </Label>
                        <Popover open={stateOpen} onOpenChange={setStateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              ref={(el) => {
                                if (el) fieldRefs.current.set('state', el);
                              }}
                              variant="outline"
                              role="combobox"
                              aria-expanded={stateOpen}
                              className="w-full justify-between font-normal"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setStateOpen(true);
                                }
                              }}
                            >
                              {field.state.value
                                ? availableStates.find((s) => s.isoCode === field.state.value)?.name
                                : "Select a state..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="bottom" align="start" className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search state..." autoFocus />
                              <CommandList>
                                <CommandEmpty>No state found.</CommandEmpty>
                                <CommandGroup>
                                  {availableStates.map((state) => (
                                    <CommandItem
                                      key={state.isoCode}
                                      value={state.name}
                                      onSelect={() => {
                                        field.handleChange(state.isoCode);
                                        setStateOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.state.value === state.isoCode ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {state.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  />
                )}

                <form.Field
                  name="postCode"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="postCode">
                        ZIP / Postal Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="postCode"
                        ref={(el) => {
                          if (el) fieldRefs.current.set('postCode', el);
                        }}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                  )}
                />
              </div>

              {form.state.values.country === 'BR' && (
                <form.Field
                  name="taxId"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="taxId">
                        Tax ID (CPF/CNPJ) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="taxId"
                        ref={(el) => {
                          if (el) fieldRefs.current.set('taxId', el);
                        }}
                        value={field.state.value || ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d]/g, '');
                          if (value.length <= 11) {
                            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                          } else if (value.length <= 14) {
                            value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                          }
                          field.handleChange(value);
                        }}
                        placeholder="000.000.000-00 or 00.000.000/0000-00"
                        maxLength={18}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        CPF (Individual): 000.000.000-00 • CNPJ (Business): 00.000.000/0000-00
                      </p>
                    </div>
                  )}
                />
              )}

              {form.state.values.country === 'CL' && (
                <form.Field
                  name="taxId"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="taxId">
                        RUT (Tax ID) <span className="text-muted-foreground text-xs">(Recommended)</span>
                      </Label>
                      <Input
                        id="taxId"
                        ref={(el) => {
                          if (el) fieldRefs.current.set('taxId', el);
                        }}
                        value={field.state.value || ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\dkK]/gi, '');
                          if (value.length > 1) {
                            value = value.slice(0, -1).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') + '-' + value.slice(-1);
                          }
                          field.handleChange(value);
                        }}
                        placeholder="12.345.678-5"
                        maxLength={12}
                      />
                      <p className="text-xs text-muted-foreground">
                        Chilean RUT format: 00.000.000-X
                      </p>
                    </div>
                  )}
                />
              )}

              {form.state.values.country === 'KR' && (
                <form.Field
                  name="taxId"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="taxId">
                        PCC (Personal Customs Code) <span className="text-muted-foreground text-xs">(Recommended)</span>
                      </Label>
                      <Input
                        id="taxId"
                        ref={(el) => {
                          if (el) fieldRefs.current.set('taxId', el);
                        }}
                        value={field.state.value || ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          let value = e.target.value.toUpperCase().replace(/[^P\d]/g, '');
                          if (value && !value.startsWith('P')) {
                            value = 'P' + value;
                          }
                          field.handleChange(value.slice(0, 13));
                        }}
                        placeholder="P000000000000"
                        maxLength={13}
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for customs clearance in South Korea
                      </p>
                    </div>
                  )}
                />
              )}

              <div className="pt-6">
                <Button
                  type="button"
                  onClick={() => handleCalculateShipping(form.state.values)}
                  disabled={isCalculatingShipping || quoteMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {isCalculatingShipping || quoteMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                      Calculating Shipping...
                    </span>
                  ) : shippingQuote ? (
                    'Recalculate Shipping'
                  ) : (
                    'Calculate Shipping'
                  )}
                </Button>
                {shippingQuote && (
                  <p className="text-sm text-green-600 mt-2 text-center">
                    ✓ Shipping calculated: ${shippingCost.toFixed(2)}
                  </p>
                )}
                {shippingError && (
                  <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded">
                    <div className="flex gap-2">
                      <span className="text-red-600 font-semibold shrink-0">⚠</span>
                      <div
                        className="text-sm text-red-800"
                        dangerouslySetInnerHTML={{ __html: shippingError }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

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
                      <span className="text-muted-foreground">Waiting for shipping quote...</span>
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

              <div className="mt-6 bg-muted border border-border p-4 flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
                <span className="text-sm">Apply Discount Code</span>
                <input
                  type="text"
                  placeholder="Enter Code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="bg-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neutral-950 transition-colors w-full sm:w-60"
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

                <div className="mt-4 space-y-6">
                  <button
                    onClick={handlePayWithPing}
                    disabled={checkoutMutation.isPending}
                    className="block w-full border border-border p-6 hover:border-neutral-950 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-auto px-3 bg-[#1E1E1E] dark:bg-[#FBFAFF] flex items-center justify-center shrink-0 rounded-sm">
                        {checkoutMutation.isPending ? (
                          <div className="animate-spin size-5 border-2 border-white/30 border-t-white dark:border-[#3D315E]/30 dark:border-t-[#3D315E] rounded-full" />
                        ) : (
                          <>
                            <img
                              src={pingpayLogoLight}
                              alt="Pingpay"
                              className="h-5 w-auto object-contain dark:hidden"
                            />
                            <img
                              src={pingpayLogoDark}
                              alt="Pingpay"
                              className="h-5 w-auto object-contain hidden dark:block"
                            />
                          </>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-1">
                          {checkoutMutation.isPending ? 'Redirecting...' : 'Pingpay'}
                        </p>
                        <p className="text-sm text-neutral-500">
                          Pay with USDC on NEAR
                        </p>
                      </div>
                    </div>
                  </button>

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
  )
}
