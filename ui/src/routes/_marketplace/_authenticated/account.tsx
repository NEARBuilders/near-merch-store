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
import { ChevronRight, Link2, Package } from "lucide-react";
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
    <div className="bg-background min-h-screen">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8">
        <Link to="/" className="text-sm hover:underline mb-8 inline-block">
          ← Back to Store
        </Link>

        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-2xl font-medium mb-2">My Account</h1>
            <div className="flex items-center gap-2 text-[#717182] text-sm">
              <svg
                className="size-4"
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
              <span>{userEmail}</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-[rgba(0,0,0,0.1)]"
          >
            Sign Out
          </Button>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          <div className="space-y-1">
            <Link
              to="/account/orders"
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isOrdersActive ? "bg-[#ececf0]" : "hover:bg-gray-50"
              }`}
            >
              <Package className="size-4" />
              <span className="flex-1 text-sm">My Orders</span>
              <ChevronRight className="size-4" />
            </Link>

            <Link
              to="/account/connected"
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isConnectedActive ? "bg-[#ececf0]" : "hover:bg-gray-50"
              }`}
            >
              <Link2 className="size-4" />
              <span className="flex-1 text-sm">Connected Accounts</span>
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
