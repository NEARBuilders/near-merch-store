import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [isSigningInWithGitHub, setIsSigningInWithGitHub] = useState(false);

  const accountId = authClient.near.getAccountId();

  const handleWalletConnect = async () => {
    setIsConnectingWallet(true);
    try {
      await authClient.requestSignIn.near(
        { recipient: "marketplace-demo.near" },
        {
          onSuccess: () => {
            setIsConnectingWallet(false);
            toast.success("Wallet connected");
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
        { recipient: "marketplace-demo.near" },
        {
          onSuccess: () => {
            setIsSigningInWithNear(false);
            queryClient.invalidateQueries();
            navigate({ to: redirect ?? "/account", replace: true });
            toast.success(`Signed in as: ${accountId}`);
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

  // TODO: Add Google API key (Elliot)
  // The Google OAuth client ID should be configured in the auth client configuration
  const handleSignInWithGoogle = async () => {
    setIsSigningInWithGoogle(true);
    try {
      const finalRedirect = redirect || "/account";
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/login?redirect=${encodeURIComponent(finalRedirect)}`,
      });
    } catch (error) {
      setIsSigningInWithGoogle(false);
      console.error("Google sign in error:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  // TODO: Add GitHub API key (Elliot)
  // The GitHub OAuth client ID should be configured in the auth client configuration
  const handleSignInWithGithub = async () => {
    setIsSigningInWithGitHub(true);
    try {
      const finalRedirect = redirect || "/account";
      await authClient.signIn.social({
        provider: "github",
        callbackURL: `${window.location.origin}/login?redirect=${encodeURIComponent(finalRedirect)}`,
      });
    } catch (error) {
      setIsSigningInWithGitHub(false);
      console.error("GitHub sign in error:", error);
      toast.error("Failed to sign in with GitHub");
    }
  };

  const isLoading =
    isConnectingWallet ||
    isSigningInWithNear ||
    isDisconnectingWallet ||
    isSigningInWithGoogle ||
    isSigningInWithGitHub;

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
                  className="w-full h-full object-contain"
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
                <div className="size-6 flex items-center justify-center">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L2 7v10l10 5 10-5V7L12 2z"
                      fill="currentColor"
                    />
                  </svg>
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

        <div className="mb-4 space-y-3">
          <button
            onClick={handleSignInWithGoogle}
            disabled={isLoading}
            className="w-full bg-card border-2 border-border px-6 py-5 flex items-center justify-center gap-3 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <svg className="size-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm">
              {isSigningInWithGoogle ? "Redirecting..." : "Sign in with Google"}
            </span>
          </button>

          <button
            onClick={handleSignInWithGithub}
            disabled={isLoading}
            className="w-full bg-card border-2 border-border px-6 py-5 flex items-center justify-center gap-3 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="text-sm">
              {isSigningInWithGitHub ? "Redirecting..." : "Sign in with GitHub"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
