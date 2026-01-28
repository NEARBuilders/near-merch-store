import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings2,
  Webhook,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient } from "@/utils/orpc";
import {
  useConfigureWebhook,
  useDisableWebhook,
  useTestProvider,
  PRINTFUL_WEBHOOK_EVENTS,
  type PrintfulWebhookEventType,
} from "@/integrations/api/providers";

function ProvidersError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="text-center py-12">
      <p className="text-destructive mb-2 font-semibold">Failed to load configuration</p>
      <p className="text-sm text-foreground/90 dark:text-muted-foreground mb-4">{error.message}</p>
      <button
        type="button"
        onClick={() => router.invalidate()}
        className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors mx-auto"
      >
        Try Again
      </button>
    </div>
  );
}

export const Route = createFileRoute(
  "/_marketplace/_authenticated/_admin/dashboard/providers"
)({
  loader: () => apiClient.getProviderConfig({ provider: "printful" }),
  errorComponent: ProvidersError,
  component: ProvidersPage,
});

function ProvidersPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();

  if (!loaderData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Provider Configuration</h2>
          <p className="text-sm text-foreground/90 dark:text-muted-foreground">
            Configure fulfillment providers and webhooks
          </p>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
              <p className="text-sm text-foreground/90 dark:text-muted-foreground">Loading provider configuration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { config } = loaderData;
  const configureWebhook = useConfigureWebhook();
  const disableWebhook = useDisableWebhook();
  const testProvider = useTestProvider();

  const [webhookUrl, setWebhookUrl] = useState(() => 
    typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/printful` : ""
  );
  const [selectedEvents, setSelectedEvents] = useState<PrintfulWebhookEventType[]>([
    "shipment_sent",
    "shipment_delivered",
    "shipment_returned",
    "shipment_canceled",
    "order_created",
    "order_canceled",
    "order_failed",
  ]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyKey = async (key: string, keyType: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(keyType);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object') {
      const error = err as { message?: string; json?: { message?: string } };
      if (error.json?.message) return error.json.message;
      if (error.message) return error.message;
    }
    return 'An unexpected error occurred';
  };

  const handleConfigure = async () => {
    try {
      await configureWebhook.mutateAsync({
        provider: "printful",
        webhookUrlOverride: webhookUrl || undefined,
        events: selectedEvents,
      });
      toast.success("Webhook configured successfully");
      setConfigDialogOpen(false);
      router.invalidate();
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error("Failed to configure webhook", { description: message });
      console.error("Failed to configure webhook:", err);
    }
  };

  const handleDisable = async () => {
    try {
      await disableWebhook.mutateAsync({ provider: "printful" });
      toast.success("Webhook disabled successfully");
      router.invalidate();
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error("Failed to disable webhook", { description: message });
      console.error("Failed to disable webhook:", err);
    }
  };

  const handleTest = async () => {
    try {
      const result = await testProvider.mutateAsync({ provider: "printful" });
      if (result.success) {
        toast.success("Connection test successful");
      } else {
        toast.error("Connection test failed", { description: result.message || "Unknown error" });
      }
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error("Connection test failed", { description: message });
      console.error("Failed to test provider:", err);
    }
  };

  const toggleEvent = (event: PrintfulWebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Provider Configuration</h2>
          <p className="text-sm text-foreground/90 dark:text-muted-foreground">
            Manage fulfillment provider settings and webhooks
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-background border border-border/60 p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#00EC97]/10 flex items-center justify-center">
                <span className="text-lg font-bold text-[#00EC97]">P</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Printful</h3>
                <p className="text-sm text-foreground/90 dark:text-muted-foreground">Print-on-demand fulfillment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config?.enabled ? (
                <div className="px-3 py-1 rounded-2xl bg-[#00EC97]/10 border border-[#00EC97]/60 text-[#00EC97] flex items-center gap-1.5 text-sm font-semibold">
                  <CheckCircle className="size-3" />
                  Active
                </div>
              ) : (
                <div className="px-3 py-1 rounded-2xl bg-background/60 border border-border/60 text-foreground/90 dark:text-muted-foreground flex items-center gap-1.5 text-sm font-semibold">
                  <XCircle className="size-3" />
                  Not Configured
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testProvider.isPending}
              className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors disabled:opacity-50"
            >
              {testProvider.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Settings2 className="size-4 mr-2" />
              )}
              Test Connection
            </button>

            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg bg-[#00EC97] text-black flex items-center justify-center font-semibold text-sm hover:bg-[#00d97f] transition-colors"
                >
                  <Webhook className="size-4 mr-2" />
                  Configure Webhooks
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-background border border-border/60">
                <DialogHeader>
                  <DialogTitle>Configure Printful Webhooks</DialogTitle>
                  <DialogDescription>
                    Set up webhook endpoints to receive real-time order updates
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL (Optional Override)</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://your-domain.com/api/webhooks/printful"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-foreground/90 dark:text-muted-foreground">
                      Leave empty to use the default webhook endpoint
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Events to Subscribe</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PRINTFUL_WEBHOOK_EVENTS.map((event) => (
                        <div
                          key={event.value}
                          className="flex items-start space-x-2 p-3 rounded-2xl bg-background/40 border border-border/60 hover:bg-background/60 transition-colors"
                        >
                          <Checkbox
                            id={event.value}
                            checked={selectedEvents.includes(event.value)}
                            onCheckedChange={() => toggleEvent(event.value)}
                          />
                          <div className="grid gap-0.5 leading-none">
                            <label
                              htmlFor={event.value}
                              className="text-sm font-medium cursor-pointer text-foreground"
                            >
                              {event.label}
                            </label>
                            <p className="text-xs text-foreground/90 dark:text-muted-foreground">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => setConfigDialogOpen(false)}
                    className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfigure}
                    disabled={configureWebhook.isPending || selectedEvents.length === 0}
                    className="px-6 py-3 rounded-lg bg-[#00EC97] text-black flex items-center justify-center font-semibold text-sm hover:bg-[#00d97f] transition-colors disabled:opacity-50"
                  >
                    {configureWebhook.isPending ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : null}
                    Save Configuration
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {config?.webhookUrl && (
              <button
                type="button"
                onClick={handleDisable}
                disabled={disableWebhook.isPending}
                className="px-6 py-3 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {disableWebhook.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="size-4 mr-2" />
                )}
                Disable Webhooks
              </button>
            )}
          </div>

          {config?.webhookUrl && (
            <div className="rounded-2xl bg-background/40 border border-border/60 p-4 space-y-4">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <Webhook className="size-4" />
                Webhook Configuration
              </h4>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-background/60 border border-border/60">
                  <span className="text-foreground/90 dark:text-muted-foreground">Webhook URL:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded border border-border/60">
                    {config.webhookUrl}
                  </code>
                </div>

                {config.enabledEvents && config.enabledEvents.length > 0 && (
                  <div className="p-3 rounded-2xl bg-background/60 border border-border/60">
                    <span className="text-foreground/90 dark:text-muted-foreground block mb-2">Enabled Events:</span>
                    <div className="flex flex-wrap gap-1">
                      {config.enabledEvents.map((event) => (
                        <div key={event} className="px-2 py-1 rounded border border-border/60 text-xs">
                          {event}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {config.publicKey && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-background/60 border border-border/60">
                    <span className="text-foreground/90 dark:text-muted-foreground">Public Key:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded border border-border/60 truncate max-w-[200px]">
                        {config.publicKey}
                      </code>
                      <button
                        type="button"
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-background/60 transition-colors"
                        onClick={() => handleCopyKey(config.publicKey!, "public")}
                      >
                        {copiedKey === "public" ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {config.lastConfiguredAt && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-background/60 border border-border/60">
                    <span className="text-foreground/90 dark:text-muted-foreground">Last Configured:</span>
                    <span className="text-xs text-foreground">
                      {new Date(config.lastConfiguredAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {config.expiresAt && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-background border border-amber-500/60">
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Expires:
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {new Date(config.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-background border border-border/60 p-4">
        <h4 className="font-semibold text-foreground mb-2">
          About Webhooks
        </h4>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">
          Webhooks allow Printful to send real-time notifications to your store when 
          order events occur (shipments, cancellations, etc.). The secret key is stored 
          securely and used to verify webhook signatures.
        </p>
      </div>
    </div>
  );
}
