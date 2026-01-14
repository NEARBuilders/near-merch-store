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

function ProvidersLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-2"></div>
        <p className="text-sm text-[#717182]">Loading provider configuration...</p>
      </div>
    </div>
  );
}

function ProvidersError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="text-center py-8">
      <p className="text-red-600 mb-2">Failed to load configuration</p>
      <p className="text-sm text-[#717182] mb-4">{error.message}</p>
      <Button onClick={() => router.invalidate()} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

export const Route = createFileRoute(
  "/_marketplace/_authenticated/_admin/dashboard/providers"
)({
  loader: () => apiClient.getProviderConfig({ provider: "printful" }),
  pendingComponent: ProvidersLoading,
  errorComponent: ProvidersError,
  component: ProvidersPage,
});

function ProvidersPage() {
  const router = useRouter();
  const { config } = Route.useLoaderData();
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium mb-1">Provider Configuration</h2>
          <p className="text-sm text-[#717182]">
            Manage fulfillment provider settings and webhooks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.invalidate()}
          className="border-[rgba(0,0,0,0.1)]"
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#00a86b]/10 flex items-center justify-center">
                <span className="text-lg font-bold text-[#00a86b]">P</span>
              </div>
              <div>
                <CardTitle className="text-base">Printful</CardTitle>
                <CardDescription>Print-on-demand fulfillment</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config?.enabled ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="size-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="size-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testProvider.isPending}
            >
              {testProvider.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Settings2 className="size-4 mr-2" />
              )}
              Test Connection
            </Button>

            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Webhook className="size-4 mr-2" />
                  Configure Webhooks
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                    <p className="text-xs text-[#717182]">
                      Leave empty to use the default webhook endpoint
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Events to Subscribe</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PRINTFUL_WEBHOOK_EVENTS.map((event) => (
                        <div
                          key={event.value}
                          className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            id={event.value}
                            checked={selectedEvents.includes(event.value)}
                            onCheckedChange={() => toggleEvent(event.value)}
                          />
                          <div className="grid gap-0.5 leading-none">
                            <label
                              htmlFor={event.value}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {event.label}
                            </label>
                            <p className="text-xs text-[#717182]">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConfigDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfigure}
                    disabled={configureWebhook.isPending || selectedEvents.length === 0}
                  >
                    {configureWebhook.isPending ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : null}
                    Save Configuration
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {config?.webhookUrl && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisable}
                disabled={disableWebhook.isPending}
              >
                {disableWebhook.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="size-4 mr-2" />
                )}
                Disable Webhooks
              </Button>
            )}
          </div>

          {config?.webhookUrl && (
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Webhook className="size-4" />
                Webhook Configuration
              </h4>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-[#717182]">Webhook URL:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {config.webhookUrl}
                  </code>
                </div>

                {config.enabledEvents && config.enabledEvents.length > 0 && (
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-[#717182] block mb-2">Enabled Events:</span>
                    <div className="flex flex-wrap gap-1">
                      {config.enabledEvents.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {config.publicKey && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-[#717182]">Public Key:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded truncate max-w-[200px]">
                        {config.publicKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyKey(config.publicKey!, "public")}
                      >
                        {copiedKey === "public" ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {config.lastConfiguredAt && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-[#717182]">Last Configured:</span>
                    <span className="text-xs">
                      {new Date(config.lastConfiguredAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {config.expiresAt && (
                  <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                    <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Expires:
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {new Date(config.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
          About Webhooks
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Webhooks allow Printful to send real-time notifications to your store when 
          order events occur (shipments, cancellations, etc.). The secret key is stored 
          securely and used to verify webhook signatures.
        </p>
      </div>
    </div>
  );
}
