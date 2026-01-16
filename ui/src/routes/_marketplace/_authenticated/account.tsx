import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import { ChevronRight, Link2, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_marketplace/_authenticated/account")({
  component: MyAccountPage,
});

function MyAccountPage() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      await authClient.near.disconnect();
      queryClient.invalidateQueries();
      toast.success("Signed out successfully");
      navigate({ to: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

  const userEmail = session?.user?.email || "No email";
  const isOrdersActive = !!matchRoute({ to: "/account/orders" });
  const isConnectedActive = !!matchRoute({ to: "/account/connected" });

  return (
    <div className="bg-background min-h-screen pt-32">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Back and Account Header Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Button */}
          <Link
            to="/"
            className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
        </Link>

          {/* Account Header Block */}
          <div className="flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">My Account</h1>
                <div className="flex items-center gap-2 text-foreground/90 dark:text-muted-foreground text-sm">
              <svg
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.33"
                  d="M13.333 14v-1.333A2.667 2.667 0 0010.666 10H5.333a2.667 2.667 0 00-2.666 2.667V14M8 7.333A2.667 2.667 0 108 2a2.667 2.667 0 000 5.333z"
                />
              </svg>
              <span className="truncate max-w-[200px] md:max-w-none">{userEmail}</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
                className="border-border/60 hover:border-[#00EC97] hover:text-[#00EC97] transition-colors"
          >
            Sign Out
          </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            <Link
              to="/account/orders"
              preload="intent"
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg ${
                isOrdersActive
                  ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                  : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                }`}
            >
              <Package className="size-4" />
              <span className="flex-1 text-sm font-medium">My Orders</span>
              <ChevronRight className="size-4" />
            </Link>

            <Link
              to="/account/connected"
              preload="intent"
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg ${
                isConnectedActive
                  ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                  : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                }`}
            >
              <Link2 className="size-4" />
              <span className="flex-1 text-sm font-medium">Connected Accounts</span>
              <ChevronRight className="size-4" />
            </Link>
          </div>

          {/* Content Area */}
          <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
