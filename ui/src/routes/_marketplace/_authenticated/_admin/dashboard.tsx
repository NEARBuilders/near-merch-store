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
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const matchRoute = useMatchRoute();
  const { data: session } = authClient.useSession();

  const isOverviewActive = !!matchRoute({ to: "/dashboard", fuzzy: false });
  const isInventoryActive = !!matchRoute({ to: "/dashboard/inventory" });
  const isOrdersActive = !!matchRoute({ to: "/dashboard/orders" });
  const isUsersActive = !!matchRoute({ to: "/dashboard/users" });
  const isProvidersActive = !!matchRoute({ to: "/dashboard/providers" });

  return (
    <div className="bg-background min-h-screen pt-20 md:pt-32">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Back and Header Blocks */}
        <div className="flex flex-row gap-2 md:gap-4 mb-4 md:mb-8">
          {/* Back Button */}
          <Link
            to="/"
            className="rounded-lg md:rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-3 md:px-4 lg:px-8 py-3 md:py-4 lg:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-4 md:size-5" />
          </Link>

          {/* Header Block */}
          <div className="flex-1 rounded-lg md:rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-6 lg:px-10 py-4 md:py-6 lg:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
              <div>
                <h1 className="text-xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-1 md:mb-2">Admin Dashboard</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-foreground/90 dark:text-muted-foreground text-xs sm:text-sm">
                  <Badge variant="outline" className="bg-[#00EC97]/10 text-[#00EC97] border-[#00EC97] w-fit">
                    Admin
                  </Badge>
                  <span className="truncate">{session?.user?.email || "Admin User"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4 md:gap-8">
          {/* Sidebar Navigation */}
          <div className="space-y-2 overflow-x-auto lg:overflow-visible">
            <div className="flex lg:flex-col gap-2 lg:gap-0 min-w-0 lg:min-w-[280px]">
              <Link
                to="/dashboard"
                preload="intent"
                className={cn(
                  "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-left transition-colors rounded-lg whitespace-nowrap shrink-0",
                  isOverviewActive
                    ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                    : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                )}
              >
                <LayoutDashboard className="size-4 shrink-0" />
                <span className="text-xs md:text-sm font-medium">Overview</span>
                <ChevronRight className="size-3 md:size-4 shrink-0 hidden lg:block" />
              </Link>

              <Link
                to="/dashboard/inventory"
                preload="intent"
                className={cn(
                  "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-left transition-colors rounded-lg whitespace-nowrap shrink-0",
                  isInventoryActive
                    ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                    : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                )}
              >
                <Package className="size-4 shrink-0" />
                <span className="text-xs md:text-sm font-medium">Inventory</span>
                <ChevronRight className="size-3 md:size-4 shrink-0 hidden lg:block" />
              </Link>

              <Link
                to="/dashboard/orders"
                preload="intent"
                className={cn(
                  "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-left transition-colors rounded-lg whitespace-nowrap shrink-0",
                  isOrdersActive
                    ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                    : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                )}
              >
                <ShoppingBag className="size-4 shrink-0" />
                <span className="text-xs md:text-sm font-medium">Orders</span>
                <ChevronRight className="size-3 md:size-4 shrink-0 hidden lg:block" />
              </Link>

              <Link
                to="/dashboard/users"
                preload="intent"
                className={cn(
                  "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-left transition-colors rounded-lg whitespace-nowrap shrink-0",
                  isUsersActive
                    ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                    : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                )}
              >
                <Users className="size-4 shrink-0" />
                <span className="text-xs md:text-sm font-medium">Users</span>
                <ChevronRight className="size-3 md:size-4 shrink-0 hidden lg:block" />
              </Link>

              <Link
                to="/dashboard/providers"
                preload="intent"
                className={cn(
                  "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-left transition-colors rounded-lg whitespace-nowrap shrink-0",
                  isProvidersActive
                    ? "bg-[#00EC97]/10 dark:bg-[#00EC97]/20 border border-[#00EC97]/60 text-[#00EC97]"
                    : "hover:bg-background/60 border border-border/60 hover:border-[#00EC97]/40"
                )}
              >
                <Settings className="size-4 shrink-0" />
                <span className="text-xs md:text-sm font-medium">Providers</span>
                <ChevronRight className="size-3 md:size-4 shrink-0 hidden lg:block" />
              </Link>
            </div>
          </div>

          {/* Content Area */}
          <div className="rounded-lg md:rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-6 lg:px-10 py-4 md:py-6 lg:py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
