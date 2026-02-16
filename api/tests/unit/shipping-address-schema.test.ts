import { describe, expect, it } from 'vitest';
import { ShippingAddressSchema } from '@/schema';

describe('ShippingAddressSchema normalization', () => {
  const base = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Los Angeles',
    postCode: '90001',
    country: 'US',
    email: 'john@example.com',
  };

  it('treats empty optional fields as undefined', () => {
    const parsed = ShippingAddressSchema.parse({
      ...base,
      phone: '',
      state: '   ',
      addressLine2: '',
      companyName: ' ',
      taxId: '',
    });

    expect(parsed.phone).toBeUndefined();
    expect(parsed.state).toBeUndefined();
    expect(parsed.addressLine2).toBeUndefined();
    expect(parsed.companyName).toBeUndefined();
    expect(parsed.taxId).toBeUndefined();
  });

  it('trims required fields and email', () => {
    const parsed = ShippingAddressSchema.parse({
      ...base,
      firstName: '  John  ',
      lastName: '  Doe',
      addressLine1: '  123 Main St ',
      city: ' Los Angeles ',
      postCode: ' 90001 ',
      country: ' US ',
      email: '  john@example.com  ',
      phone: '  +1 234 567 8900  ',
    });

    expect(parsed.firstName).toBe('John');
    expect(parsed.lastName).toBe('Doe');
    expect(parsed.addressLine1).toBe('123 Main St');
    expect(parsed.city).toBe('Los Angeles');
    expect(parsed.postCode).toBe('90001');
    expect(parsed.country).toBe('US');
    expect(parsed.email).toBe('john@example.com');
    expect(parsed.phone).toBe('+1 234 567 8900');
  });

  it('rejects required fields that are only whitespace', () => {
    expect(() =>
      ShippingAddressSchema.parse({
        ...base,
        firstName: '   ',
      })
    ).toThrow();
  });
});
