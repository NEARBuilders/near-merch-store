import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const matchRoute = useMatchRoute();
  const { data: session } = authClient.useSession();
  const accountId = authClient.near.getAccountId();
  const userEmail = session?.user?.email;
  const displayName = accountId || (userEmail && !userEmail.includes("http") ? userEmail : null) || "Admin User";

  const isOverviewActive = !!matchRoute({ to: "/dashboard", fuzzy: false });
  const isInventoryActive = !!matchRoute({ to: "/dashboard/inventory" });
  const isOrdersActive = !!matchRoute({ to: "/dashboard/orders" });
  const isUsersActive = !!matchRoute({ to: "/dashboard/users" });
  const isProvidersActive = !!matchRoute({ to: "/dashboard/providers" });

  return (
    <div className="bg-background min-h-screen pt-32 overflow-x-hidden">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 overflow-x-hidden">
        {/* Back and Header Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Button */}
          <Link
            to="/"
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Header Block */}
          <div className="flex-1 rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
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
                  <span className="truncate max-w-[200px] md:max-w-none">{displayName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8 overflow-x-hidden min-w-0">
          {/* Sidebar Navigation */}
          <div className="space-y-2 min-w-0">
              <Link
                to="/dashboard"
                preload="intent"
                className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg",
                  isOverviewActive
                  ? "bg-[#00EC97] border border-[#00EC97] text-black"
                  : "bg-background border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
              >
              <LayoutDashboard className="size-4" />
              <span className="flex-1 text-sm font-semibold">Overview</span>
              <ChevronRight className="size-4" />
              </Link>

              <Link
                to="/dashboard/inventory"
                preload="intent"
                className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg",
                  isInventoryActive
                  ? "bg-[#00EC97] border border-[#00EC97] text-black"
                  : "bg-background border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
              >
              <Package className="size-4" />
              <span className="flex-1 text-sm font-semibold">Inventory</span>
              <ChevronRight className="size-4" />
              </Link>

              <Link
                to="/dashboard/orders"
                preload="intent"
                className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg",
                  isOrdersActive
                  ? "bg-[#00EC97] border border-[#00EC97] text-black"
                  : "bg-background border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
              >
              <ShoppingBag className="size-4" />
              <span className="flex-1 text-sm font-semibold">Orders</span>
              <ChevronRight className="size-4" />
              </Link>

              <Link
                to="/dashboard/users"
                preload="intent"
                className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg",
                  isUsersActive
                  ? "bg-[#00EC97] border border-[#00EC97] text-black"
                  : "bg-background border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
              >
              <Users className="size-4" />
              <span className="flex-1 text-sm font-semibold">Users</span>
              <ChevronRight className="size-4" />
              </Link>

              <Link
                to="/dashboard/providers"
                preload="intent"
                className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg",
                  isProvidersActive
                  ? "bg-[#00EC97] border border-[#00EC97] text-black"
                  : "bg-background border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
              >
              <Settings className="size-4" />
              <span className="flex-1 text-sm font-semibold">Providers</span>
              <ChevronRight className="size-4" />
              </Link>
          </div>

          {/* Content Area */}
          <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8 overflow-x-hidden min-w-0 max-w-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
