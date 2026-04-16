import { PROVIDER_ADDRESS_RULES, type FieldName } from './address-rules';

export function isFieldRequired(providers: string[], fieldName: FieldName): boolean {
  return providers.some(p => 
    PROVIDER_ADDRESS_RULES[p]?.[fieldName]?.required
  );
}

export function getFieldMaxLength(providers: string[], fieldName: FieldName): number | undefined {
  const lengths = providers
    .map(p => PROVIDER_ADDRESS_RULES[p]?.[fieldName]?.maxLength)
    .filter((l): l is number => typeof l === 'number');
  
  return lengths.length > 0 ? Math.min(...lengths) : undefined;
}

export function getFieldErrorMessage(providers: string[], fieldName: FieldName): string | undefined {
  for (const provider of providers) {
    const message = PROVIDER_ADDRESS_RULES[provider]?.[fieldName]?.errorMessage;
    if (message) return message;
  }
  return undefined;
}
