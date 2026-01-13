import {
  createFileRoute,
  redirect,
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

  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  const accountId = authClient.near.getAccountId();

  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      await authClient.requestSignIn.near(
        { recipient: import.meta.env.PUBLIC_ACCOUNT_ID || "every.near" },
        {
          onSuccess: () => {
            setIsConnectingWallet(false);
            setWalletConnected(true);
            toast.success("Wallet connected! Now sign the message to complete login.");
          },
          onError: (error: any) => {
            setIsConnectingWallet(false);
            console.error("Wallet connection error:", error);
          },
        }
      );
    } catch (error) {
      setIsConnectingWallet(false);
      console.error("Wallet connection error:", error);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await authClient.signIn.near(
        { 
          recipient: import.meta.env.PUBLIC_ACCOUNT_ID || "near-merch-store.near",
        },
        {
          onSuccess: () => {
            setIsSigningIn(false);
            queryClient.invalidateQueries();
            window.location.href = "/cart";
          },
          onError: (error: any) => {
            setIsSigningIn(false);
            console.error("Sign in error:", error);
          },
        }
      );
    } catch (error) {
      setIsSigningIn(false);
      console.error("Sign in error:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await authClient.near.disconnect();
      setWalletConnected(false);
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  const isWalletConnected = walletConnected || accountId;

  const handleCreateWallet = () => {
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      'https://wallet.meteorwallet.app/connect/mainnet/login?connectionUid=8Lt_7EFCO9g84frjAdAxw&',
      'Meteor Wallet',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  return (
    <div className="bg-background min-h-screen w-full flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="text-base text-muted-foreground">
            {!isWalletConnected 
              ? "Connect your NEAR wallet to continue"
              : "Sign the message to complete authentication"}
          </p>
          <p className="text-sm text-muted-foreground">
            Don't have a NEAR wallet?{" "}
            <button
              onClick={handleCreateWallet}
              className="underline hover:text-foreground cursor-pointer"
            >
              Create one here
            </button>
          </p>
        </div>

        <div className="space-y-4">
          {!isWalletConnected ? (
            <button
              onClick={handleConnectWallet}
              disabled={isConnectingWallet}
              className="w-full bg-foreground text-background px-6 py-4 flex items-center justify-center gap-3 hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="size-5 overflow-hidden flex items-center justify-center">
                <img
                  src={nearLogo}
                  alt="NEAR"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <span className="text-sm font-medium">
                {isConnectingWallet ? "Connecting..." : "Connect NEAR Wallet"}
              </span>
            </button>
          ) : (
            <>
              <div className="bg-muted/50 border border-border px-4 py-4">
                <p className="text-xs text-muted-foreground mb-1">Connected wallet</p>
                <p className="text-sm font-medium truncate">{accountId || "Wallet connected"}</p>
              </div>
              
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full bg-foreground text-background px-6 py-4 flex items-center justify-center gap-3 hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="size-5 overflow-hidden flex items-center justify-center">
                  <img
                    src={nearLogo}
                    alt="NEAR"
                    className="w-full h-full object-contain invert dark:invert-0"
                  />
                </div>
                <span className="text-sm font-medium">
                  {isSigningIn ? "Signing in..." : "Sign Message & Continue"}
                </span>
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isSigningIn}
                className="w-full text-muted-foreground px-4 py-2 flex items-center justify-center hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs underline">Use a different wallet</span>
              </button>
            </>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {!isWalletConnected ? (
            <p>Step 1 of 2</p>
          ) : (
            <p>Step 2 of 2 · Free, no transaction required</p>
          )}
        </div>
      </div>
    </div>
  );
}
