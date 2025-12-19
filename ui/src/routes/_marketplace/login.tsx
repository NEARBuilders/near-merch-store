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

  // Check if wallet is already connected on mount
  const accountId = authClient.near.getAccountId();

  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      await authClient.requestSignIn.near(
        { 
          recipient: process.env.PUBLIC_ACCOUNT_ID || "near-merch-store.near",
        },
        {
          onSuccess: () => {
            setIsConnectingWallet(false);
            setWalletConnected(true);
            toast.success("Wallet connected! Now sign the message to complete login.");
          },
          onError: (error: any) => {
            setIsConnectingWallet(false);
            console.error("Wallet connection error:", error);

            // Handle specific error cases
            if (error?.code === "SIGNER_NOT_AVAILABLE" || error?.message?.includes("not available")) {
              toast.error("NEAR wallet not available. Please install Meteor Wallet or MyNEARWallet.");
              return;
            }

            if (error?.code === "USER_REJECTED") {
              toast.error("Wallet connection was cancelled.");
              return;
            }

            const errorMessage = error instanceof Error 
              ? error.message 
              : "Failed to connect wallet";
            toast.error(errorMessage);
          },
        }
      );
    } catch (error) {
      setIsConnectingWallet(false);
      console.error("Wallet connection error:", error);
      toast.error("An unexpected error occurred while connecting wallet");
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await authClient.signIn.near(
        { 
          recipient: process.env.PUBLIC_ACCOUNT_ID || "near-merch-store.near",
        },
        {
          onSuccess: () => {
            setIsSigningIn(false);
            queryClient.invalidateQueries();
            
            const userName = accountId || "User";
            toast.success(`Welcome back, ${userName}!`);
            
            // Always redirect to cart after successful sign-in
            // Use window.location for full page reload to ensure session is loaded
            setTimeout(() => {
              window.location.href = "/cart";
            }, 500);
          },
          onError: (error: any) => {
            setIsSigningIn(false);
            console.error("Sign in error:", error);

            if (error?.code === "USER_REJECTED") {
              toast.error("Sign in was cancelled.");
              return;
            }

            const errorMessage = error instanceof Error 
              ? error.message 
              : "Failed to sign in";
            toast.error(errorMessage);
          },
        }
      );
    } catch (error) {
      setIsSigningIn(false);
      console.error("Sign in error:", error);
      toast.error("An unexpected error occurred during sign in");
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

  return (
    <div className="bg-background min-h-screen w-full flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Sign In</h1>
          <p className="text-sm text-muted-foreground mb-2">
            {!isWalletConnected 
              ? "Connect your NEAR wallet to continue"
              : "Sign the message to complete authentication"}
          </p>
          <p className="text-xs text-muted-foreground">
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

        <div className="space-y-3 mb-4">
          {!isWalletConnected ? (
            // Step 1: Connect Wallet
            <button
              onClick={handleConnectWallet}
              disabled={isConnectingWallet}
              className="w-full bg-primary text-primary-foreground border-2 border-primary px-6 py-5 flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="size-6 overflow-hidden flex items-center justify-center">
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
            // Step 2: Sign In
            <>
              <div className="bg-muted/50 border border-border px-4 py-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Connected wallet:</p>
                <p className="text-sm font-medium">{accountId || "Wallet connected"}</p>
              </div>
              
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full bg-primary text-primary-foreground border-2 border-primary px-6 py-5 flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="size-6 overflow-hidden flex items-center justify-center">
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
                className="w-full bg-muted text-muted-foreground border-2 border-border px-4 py-2 flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs">Disconnect & use different wallet</span>
              </button>
            </>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {!isWalletConnected ? (
            <>
              <p>Step 1: Connect your wallet</p>
              <p className="mt-1">Step 2: Sign a message to authenticate</p>
            </>
          ) : (
            <>
              <p>Click "Sign Message" to complete authentication.</p>
              <p className="mt-1">This is free and doesn't require any transaction.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
