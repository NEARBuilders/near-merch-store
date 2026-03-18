import { PROVIDER_ADDRESS_RULES, type FieldRule, type FieldName } from './address-rules';

export function getMergedValidationRules(providers: string[]): Partial<Record<string, FieldRule>> {
  const merged: Record<string, FieldRule> = {};
  
  for (const provider of providers) {
    const rules = PROVIDER_ADDRESS_RULES[provider];
    if (!rules) continue;
    
    for (const [field, rule] of Object.entries(rules)) {
      if (!rule) continue;
      
      if (!merged[field]) {
        merged[field] = { ...rule };
      } else {
        if (rule.required) merged[field].required = true;
        if (rule.maxLength && (!merged[field].maxLength || rule.maxLength < merged[field].maxLength!)) {
          merged[field].maxLength = rule.maxLength;
        }
        if (!merged[field].errorMessage && rule.errorMessage) {
          merged[field].errorMessage = rule.errorMessage;
        }
      }
    }
  }
  
  return merged;
}

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
