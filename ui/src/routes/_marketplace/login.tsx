import {
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  
  const recipient = import.meta.env.PUBLIC_ACCOUNT_ID || "every.near";

  useEffect(() => {
    // Check if user is already connected and has session
    const checkSession = async () => {
      const { data: session } = await authClient.getSession();
    const existingAccountId = authClient.near.getAccountId();
      
      // Only disconnect if there's a wallet connected but no valid session
      if (existingAccountId && !session?.user) {
        // Wallet connected but no session - might be stale connection
        // Don't auto-disconnect, let user decide
      }
    };
    
    checkSession();
  }, []);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await authClient.requestSignIn.near(
        { recipient },
        {
          onSuccess: () => {
            const accountId = authClient.near.getAccountId();
            setConnectedAccountId(accountId);
            setStep(2);
            setIsConnecting(false);
            toast.success("Wallet connected! Now sign the message to complete login.");
          },
          onError: (error: any) => {
            setIsConnecting(false);
            console.error("Wallet connection error:", error);
            toast.error("Failed to connect wallet. Please try again.");
          },
        }
      );
    } catch (error) {
      setIsConnecting(false);
      console.error("Wallet connection error:", error);
    }
  };

  const handleSignMessage = async () => {
    setIsSigning(true);
    try {
      await authClient.signIn.near(
        { recipient },
        {
          onSuccess: async () => {
            queryClient.invalidateQueries();
            // Wait a bit for session to be saved
            await new Promise(resolve => setTimeout(resolve, 100));
            // Use router navigation instead of hard redirect
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/cart';
            window.location.href = redirectUrl;
          },
          onError: (error: any) => {
            setIsSigning(false);
            console.error("Sign in error:", error);
            
            if (error?.code === "NONCE_NOT_FOUND" || error?.message?.includes("nonce")) {
              toast.error("Session expired. Please reconnect your wallet.");
              handleDisconnect();
            } else {
              toast.error("Failed to sign in. Please try again.");
            }
          },
        }
      );
    } catch (error) {
      setIsSigning(false);
      console.error("Sign in error:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await authClient.near.disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
    setConnectedAccountId(null);
    setStep(1);
  };

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
    <div className="bg-background h-screen w-full flex items-center justify-center px-4 relative overflow-hidden">
      {/* Video background - full page including footer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://videos.near.org/BKLDE_v001_NEAR_03_master_h264_small.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better readability - only in dark mode */}
        <div className="absolute inset-0 dark:bg-background/30" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-foreground/90 dark:text-muted-foreground">
              {step === 1 
                ? "Connect your NEAR wallet to continue"
                : "Sign the message to complete authentication"}
            </p>
            {step === 1 && (
              <p className="text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground leading-relaxed">
                Don't have a NEAR wallet?{" "}
                <button
                  onClick={handleCreateWallet}
                  className="underline hover:text-[#00EC97] cursor-pointer transition-colors"
                >
                  Create one here
                </button>
              </p>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {step === 1 ? (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
              >
                <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                  <img
                    src={nearLogo}
                    alt="NEAR"
                    className="w-full h-full object-contain invert dark:invert-0"
                  />
                </div>
                <span>
                  {isConnecting ? "Connecting..." : "Connect NEAR Wallet"}
                </span>
              </button>
            ) : (
              <>
                <div className="bg-muted/50 border border-border/60 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3">
                  <p className="text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground mb-1">Connected wallet</p>
                  <p className="text-xs sm:text-sm font-medium truncate">{connectedAccountId}</p>
                </div>
                
                <button
                  onClick={handleSignMessage}
                  disabled={isSigning}
                  className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                >
                  <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                    <img
                      src={nearLogo}
                      alt="NEAR"
                      className="w-full h-full object-contain invert dark:invert-0"
                    />
                  </div>
                  <span>
                    {isSigning ? "Signing in..." : "Sign Message & Continue"}
                  </span>
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={isSigning}
                  className="w-full text-muted-foreground px-3 sm:px-4 py-2 flex items-center justify-center hover:text-[#00EC97] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-[10px] sm:text-xs underline">Use a different wallet</span>
                </button>
              </>
            )}
          </div>

          <div className="text-center text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground">
            {step === 1 ? (
              <p>Step 1 of 2</p>
            ) : (
              <p>Step 2 of 2 · Free, no transaction required</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
