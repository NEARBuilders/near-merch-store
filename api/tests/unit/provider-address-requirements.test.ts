import { describe, expect, it } from 'vitest';
import { getProviderAddressRequirementError, getProvidersAddressRequirementError } from '@/services/checkout/provider-address-requirements';

const baseAddress = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'Los Angeles',
  postCode: '90001',
  country: 'US',
  email: 'john@example.com',
};

describe('provider address requirements', () => {
  it('requires a phone number for Lulu orders', () => {
    expect(
      getProviderAddressRequirementError('lulu', baseAddress),
    ).toBe('Phone number is required for Lulu orders');
  });

  it('does not require a phone number for manual orders', () => {
    expect(
      getProviderAddressRequirementError('manual', baseAddress),
    ).toBeUndefined();
  });

  it('returns the first provider validation failure', () => {
    expect(
      getProvidersAddressRequirementError(['manual', 'lulu'], baseAddress),
    ).toEqual({
      provider: 'lulu',
      message: 'Phone number is required for Lulu orders',
    });
  });

  it('passes when Lulu phone number is present', () => {
    expect(
      getProvidersAddressRequirementError(['lulu'], {
        ...baseAddress,
        phone: '+1 555 123 4567',
      }),
    ).toBeUndefined();
  });
});
