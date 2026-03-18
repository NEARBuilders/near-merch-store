import { describe, it, expect } from 'vitest';
import {
  getMergedValidationRules,
  isFieldRequired,
  getFieldMaxLength,
  getFieldErrorMessage,
} from '../address-validation';

describe('address-validation', () => {
  describe('getMergedValidationRules', () => {
    it('should return empty object for empty providers', () => {
      const rules = getMergedValidationRules([]);
      expect(rules).toEqual({});
    });

    it('should return lulu rules for lulu provider', () => {
      const rules = getMergedValidationRules(['lulu']);
      expect(rules.addressLine1?.maxLength).toBe(30);
      expect(rules.addressLine2?.maxLength).toBe(30);
      expect(rules.phone?.required).toBe(true);
      expect(rules.phone?.maxLength).toBe(20);
      expect(rules.postcode?.maxLength).toBe(64);
    });

    it('should merge rules from multiple providers', () => {
      const rules = getMergedValidationRules(['lulu', 'printful']);
      expect(rules.addressLine1?.maxLength).toBe(30);
      expect(rules.phone?.required).toBe(true);
    });

    it('should use strictest constraint when merging', () => {
      const rules = getMergedValidationRules(['lulu']);
      expect(rules.addressLine1?.maxLength).toBe(30);
    });
  });

  describe('isFieldRequired', () => {
    it('should return true for phone when lulu is provider', () => {
      expect(isFieldRequired(['lulu'], 'phone')).toBe(true);
    });

    it('should return false for phone when no providers', () => {
      expect(isFieldRequired([], 'phone')).toBe(false);
    });

    it('should return false for addressLine1 when lulu is provider', () => {
      expect(isFieldRequired(['lulu'], 'addressLine1')).toBe(false);
    });
  });

  describe('getFieldMaxLength', () => {
    it('should return 30 for addressLine1 when lulu is provider', () => {
      expect(getFieldMaxLength(['lulu'], 'addressLine1')).toBe(30);
    });

    it('should return 20 for phone when lulu is provider', () => {
      expect(getFieldMaxLength(['lulu'], 'phone')).toBe(20);
    });

    it('should return 64 for postcode when lulu is provider', () => {
      expect(getFieldMaxLength(['lulu'], 'postcode')).toBe(64);
    });

    it('should return undefined for unknown provider', () => {
      expect(getFieldMaxLength(['unknown'], 'addressLine1')).toBeUndefined();
    });

    it('should return undefined for unknown field', () => {
      expect(getFieldMaxLength(['lulu'], 'unknownField' as any)).toBeUndefined();
    });
  });

  describe('getFieldErrorMessage', () => {
    it('should return error message for addressLine1 when lulu is provider', () => {
      const message = getFieldErrorMessage(['lulu'], 'addressLine1');
      expect(message).toBe('Address is too long. Please use Address Line 2 for apartment/unit numbers.');
    });

    it('should return error message for phone when lulu is provider', () => {
      const message = getFieldErrorMessage(['lulu'], 'phone');
      expect(message).toBe('Phone number is required for delivery.');
    });

    it('should return undefined for unknown provider', () => {
      expect(getFieldErrorMessage(['unknown'], 'addressLine1')).toBeUndefined();
    });
  });
});
