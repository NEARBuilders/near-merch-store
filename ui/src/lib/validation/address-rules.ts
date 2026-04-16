interface FieldRule {
  required?: boolean;
  maxLength?: number;
  errorMessage?: string;
}

interface ProviderRules {
  addressLine1?: FieldRule;
  addressLine2?: FieldRule;
  phone?: FieldRule;
  postcode?: FieldRule;
  city?: FieldRule;
  name?: FieldRule;
  state?: FieldRule;
}

export const PROVIDER_ADDRESS_RULES: Record<string, ProviderRules> = {
  lulu: {
    addressLine1: {
      maxLength: 30,
      errorMessage: 'Address is too long. Please use Address Line 2 for apartment/unit numbers.',
    },
    addressLine2: {
      maxLength: 30,
      errorMessage: 'Address Line 2 is too long.',
    },
    phone: {
      required: true,
      maxLength: 20,
      errorMessage: 'Phone number is required for delivery.',
    },
    postcode: {
      maxLength: 64,
      errorMessage: 'ZIP/Postal code is too long.',
    },
  },
  
  printful: {},
  
  gelato: {},
};

export type FieldName = keyof ProviderRules;
