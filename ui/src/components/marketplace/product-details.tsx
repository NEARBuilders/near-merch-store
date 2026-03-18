import { useProviderFieldConfigs, type ProviderFieldConfigs } from "@/integrations/api";
import type { ProviderDetails } from "@/integrations/api";
import { cn } from "@/lib/utils";

interface ProductDetailsProps {
  provider: string;
  providerDetails: ProviderDetails | undefined;
  className?: string;
}

interface FieldConfig {
  label: string;
  order: number;
  format?: (value: unknown) => string;
}

function renderField(
  _key: string,
  config: FieldConfig,
  value: unknown
): { label: string; value: string } | null {
  if (value === undefined || value === null) return null;

  const displayValue = config.format ? config.format(value) : String(value);
  if (!displayValue) return null;

  return {
    label: config.label,
    value: displayValue,
  };
}

function getProviderFields(
  provider: string,
  fieldConfigs: ProviderFieldConfigs | undefined
): Record<string, FieldConfig> | undefined {
  if (!fieldConfigs) return undefined;
  return fieldConfigs[provider as keyof ProviderFieldConfigs] as Record<string, FieldConfig> | undefined;
}

export function ProductDetails({
  provider,
  providerDetails,
  className,
}: ProductDetailsProps) {
  const { data: fieldConfigs } = useProviderFieldConfigs();

  const providerKey = provider as keyof ProviderDetails;
  const details = providerDetails?.[providerKey];

  if (!details || Object.keys(details).length === 0) {
    return null;
  }

  const fields = getProviderFields(provider, fieldConfigs);
  if (!fields) return null;

  const renderedFields: Array<{ label: string; value: string; order: number }> = [];

  for (const [key, config] of Object.entries(fields)) {
    const value = (details as Record<string, unknown>)[key];
    const rendered = renderField(key, config, value);
    if (rendered) {
      renderedFields.push({
        ...rendered,
        order: config.order,
      });
    }
  }

  if (renderedFields.length === 0) return null;

  renderedFields.sort((a, b) => a.order - b.order);

  return (
    <div className={cn("rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8", className)}>
      <h3 className="text-sm font-semibold tracking-[-0.48px] text-foreground/90 dark:text-muted-foreground uppercase mb-4">
        Product Details
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {renderedFields.map((field) => (
          <div key={field.label} className="space-y-1">
            <p className="text-xs text-foreground/60 dark:text-muted-foreground/60 uppercase tracking-wider">
              {field.label}
            </p>
            <p className="text-sm font-medium text-foreground/90 dark:text-foreground/80">
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
