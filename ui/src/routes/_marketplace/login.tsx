import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { redirect: redirectPath } = useSearch({ from: "/_marketplace/login" });
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await authClient.signIn.near({
        onSuccess: async () => {
          queryClient.invalidateQueries();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const targetPath = redirectPath || "/account";
          navigate({ to: targetPath });
        },
        onError: (error: any) => {
          setIsSigningIn(false);
          console.error("Sign in error:", error);
          
          if (error?.code === "UNAUTHORIZED_NONCE_REPLAY") {
            toast.error("This sign-in request was already used. Please try again.");
          } else if (error?.code === "UNAUTHORIZED_INVALID_SIGNATURE") {
            toast.error("Signature verification failed. Please try again.");
          } else {
            toast.error("Failed to sign in. Please try again.");
          }
        },
      });
    } catch (error) {
      setIsSigningIn(false);
      console.error("Sign in error:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleCreateWallet = () => {
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      "https://wallet.meteorwallet.app/connect/mainnet/login?connectionUid=8Lt_7EFCO9g84frjAdAxw&",
      "Meteor Wallet",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
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
          <source
            src="https://videos.near.org/BKLDE_v001_NEAR_03_master_h264_small.mp4"
            type="video/mp4"
          />
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
              Connect your NEAR wallet to continue
            </p>
            {!isSigningIn && (
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
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
            >
              <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                <img
                  src={nearLogo}
                  alt="NEAR"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <span>{isSigningIn ? "Signing in..." : "Sign in with NEAR"}</span>
            </button>
          </div>

          <div className="text-center text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground">
            <p>Free, no transaction required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
