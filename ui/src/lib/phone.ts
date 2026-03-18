import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  isValidPhoneNumber as isValidPhoneNumberLib,
  AsYouType,
} from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
export type { CountryCode } from 'libphonenumber-js';

export function formatPhoneNumberInput(value: string, countryCode?: CountryCode): string {
  const digits = value.replace(/[^\d+]/g, '');

  if (!digits) return '';

  if (countryCode) {
    const formatter = new AsYouType(countryCode);
    return formatter.input(digits.startsWith('+') ? digits : '+' + digits);
  }

  return digits;
}

export function isValidPhoneNumber(phone: string, countryCode?: CountryCode): boolean {
  if (!phone) return false;

  if (countryCode) {
    return isValidPhoneNumberLib(phone, countryCode);
  }

  const parsed = parsePhoneNumberFromString(phone);
  return parsed ? parsed.isValid() : false;
}

export function getPhoneValidationError(phone: string, countryCode?: CountryCode): string | undefined {
  if (!phone) return undefined;

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) {
    return 'Please enter a valid phone number';
  }

  if (!isValidPhoneNumber(phone, countryCode)) {
    return 'Please enter a valid phone number';
  }

  return undefined;
}

export function toE164(phone: string, countryCode?: CountryCode): string | undefined {
  if (!phone) return undefined;

  const parsed = countryCode
    ? parsePhoneNumberFromString(phone, countryCode)
    : parsePhoneNumberFromString(phone);

  return parsed?.isValid() ? parsed.format('E.164') : undefined;
}

export function getExampleNumber(countryCode: CountryCode): string | undefined {
  try {
    const callingCode = getCountryCallingCode(countryCode);
    return `+${callingCode}`;
  } catch {
    return '+1';
  }
}

export function getPhonePlaceholder(countryCode?: CountryCode): string {
  if (!countryCode) return '+1 234 567 8900';

  try {
    const callingCode = getCountryCallingCode(countryCode);
    switch (countryCode) {
      case 'US':
      case 'CA':
        return `+${callingCode} (234) 567-8900`;
      case 'GB':
        return `+${callingCode} 20 1234 5678`;
      case 'BR':
        return `+${callingCode} 11 98765-4321`;
      case 'DE':
        return `+${callingCode} 30 12345678`;
      case 'FR':
        return `+${callingCode} 1 23 45 67 89`;
      case 'AU':
        return `+${callingCode} 2 1234 5678`;
      case 'JP':
        return `+${callingCode} 3-1234-5678`;
      case 'KR':
        return `+${callingCode} 2-1234-5678`;
      default:
        return `+${callingCode} 1234567890`;
    }
  } catch {
    return '+1 234 567 8900';
  }
}
