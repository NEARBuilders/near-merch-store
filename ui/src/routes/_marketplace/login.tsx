import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { queryClient } from "@/utils/orpc";
import nearLogo from "@/assets/images/pngs/logo_sq.png";

type SearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/_marketplace/login")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();
    if (session?.user) {
      throw redirect({ to: search.redirect || "/account" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isSigningInWithNear, setIsSigningInWithNear] = useState(false);
  const [isDisconnectingWallet, setIsDisconnectingWallet] = useState(false);

  const accountId = authClient.near.getAccountId();

  const handleWalletConnect = async () => {
    setIsConnectingWallet(true);
    try {
      await authClient.requestSignIn.near(
        { recipient: process.env.PUBLIC_ACCOUNT_ID || "every.near" },
        {
          onSuccess: () => {
            setIsConnectingWallet(false);
            toast.success("Wallet connected! Click 'Sign in' to continue.");
          },
          onError: (error: any) => {
            setIsConnectingWallet(false);
            console.error("Wallet connection failed:", error);
            const errorMessage =
              error.code === "SIGNER_NOT_AVAILABLE"
                ? "NEAR wallet not available"
                : error.message || "Failed to connect wallet";
            toast.error(errorMessage);
          },
        }
      );
    } catch (error) {
      setIsConnectingWallet(false);
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect to NEAR wallet");
    }
  };

  const handleNearSignIn = async () => {
    setIsSigningInWithNear(true);
    try {
      await authClient.signIn.near(
        { recipient: process.env.PUBLIC_ACCOUNT_ID || "every.near", },
        {
          onSuccess: async () => {
            setIsSigningInWithNear(false);
            queryClient.invalidateQueries();
            navigate({ to: redirect ?? "/account", replace: true });
            toast.success(`Signed in as: ${accountId}`);
            window.location.href = "/account";
          },
          onError: (error: any) => {
            setIsSigningInWithNear(false);
            console.error("NEAR sign in error:", error);

            if ((error as any)?.code === "NONCE_NOT_FOUND") {
              toast.error("Session expired. Please reconnect your wallet.");
              handleWalletDisconnect();
              return;
            }

            toast.error(
              error instanceof Error ? error.message : "Authentication failed"
            );
          },
        }
      );
    } catch (error) {
      setIsSigningInWithNear(false);
      console.error("NEAR sign in error:", error);

      if ((error as any)?.code === "NONCE_NOT_FOUND") {
        toast.error("Session expired. Please reconnect your wallet.");
        handleWalletDisconnect();
        return;
      }

      toast.error("Authentication failed");
    }
  };

  const handleWalletDisconnect = async () => {
    setIsDisconnectingWallet(true);
    try {
      await authClient.signOut();
      await authClient.near.disconnect();
      queryClient.invalidateQueries();
      setIsDisconnectingWallet(false);
      toast.success("Wallet disconnected successfully");
    } catch (error) {
      setIsDisconnectingWallet(false);
      console.error("Wallet disconnect error:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  const isLoading =
    isConnectingWallet || isSigningInWithNear || isDisconnectingWallet;

  return (
    <div className="bg-background min-h-screen w-full flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="text-sm text-muted-foreground">
            Don't have a NEAR wallet?{" "}
            <a
              href="https://wallet.near.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Create one here
            </a>
          </p>
        </div>

        <div className="mb-4">
          {!accountId ? (
            <button
              onClick={handleWalletConnect}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground border-2 border-primary px-6 py-5 flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <div className="size-6 overflow-hidden flex items-center justify-center">
                <img
                  src={nearLogo}
                  alt="NEAR"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <span className="text-sm">
                {isConnectingWallet
                  ? "Connecting Wallet..."
                  : "Connect NEAR Wallet"}
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleNearSignIn}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground border-2 border-primary px-6 py-5 flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <div className="size-6 overflow-hidden flex items-center justify-center">
                  <img
                    src={nearLogo}
                    alt="NEAR"
                    className="w-full h-full object-contain invert dark:invert-0"
                  />
                </div>
                <span className="text-sm">
                  {isSigningInWithNear
                    ? "Signing in..."
                    : `Sign in with NEAR (${accountId})`}
                </span>
              </button>
              <button
                onClick={handleWalletDisconnect}
                disabled={isLoading}
                className="w-full bg-card border-2 border-border px-6 py-3 flex items-center justify-center gap-3 hover:bg-accent transition-colors disabled:opacity-50"
              >
                <span className="text-sm text-muted-foreground">
                  {isDisconnectingWallet
                    ? "Disconnecting..."
                    : "Disconnect Wallet"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
