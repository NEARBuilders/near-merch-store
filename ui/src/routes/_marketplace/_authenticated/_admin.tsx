import { createFileRoute, Link, Outlet, redirect, useMatchRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  Tags,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { collectionLoaders } from "@/integrations/api";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin")({
  loader: async ({ context }) => {
    const queryClient = context.queryClient;
    await Promise.all([
      queryClient.prefetchQuery(collectionLoaders.list()),
      queryClient.prefetchQuery(collectionLoaders.carousel()),
    ]).catch(() => {});
  },
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    const user = session?.user;
    if (user?.role !== "admin") {
      toast.error("Must be role admin to visit this page", { id: "admin-role-required" });
      throw redirect({
        to: "/",
      });
    }

    return { session };
  },
  component: AdminLayout,
  pendingComponent: () => null,
});

function AdminLayout() {
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
  const isCollectionsActive = !!matchRoute({ to: "/dashboard/collections" });

  const getActiveSectionName = () => {
    if (isOverviewActive) return "Overview";
    if (isInventoryActive) return "Inventory";
    if (isOrdersActive) return "Orders";
    if (isUsersActive) return "Users";
    if (isProvidersActive) return "Providers";
    if (isCollectionsActive) return "Collections";
    return "Overview";
  };

  const hasActiveSection = isOverviewActive || isInventoryActive || isOrdersActive || isUsersActive || isProvidersActive || isCollectionsActive;

  return (
    <div className="bg-background min-h-screen pt-32 overflow-x-hidden">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 overflow-x-hidden">
        <div className="flex flex-row gap-4 mb-8">
          <Link
            to="/"
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

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

        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-4 md:gap-6 lg:gap-8">
          <div className="flex flex-row lg:flex-col gap-2 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-4 md:-mx-0 px-4 md:px-0">
            <div className="lg:hidden w-full relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`w-full flex items-center justify-between gap-2 px-4 md:px-8 py-2 md:py-3 text-left transition-colors rounded-lg whitespace-nowrap bg-background/60 backdrop-blur-sm border border-border/60 text-foreground font-semibold text-sm md:text-base hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black ${
                      hasActiveSection
                        ? "bg-[#00EC97] border-[#00EC97] text-black"
                        : ""
                    }`}
                  >
                    <span className="text-sm md:text-base font-semibold">
                      {getActiveSectionName()}
                    </span>
                    <ChevronDown className="size-4 md:size-5 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  alignOffset={-16}
                  sideOffset={8}
                  collisionPadding={16}
                  className="!w-[calc(100vw-2rem)] md:!w-full md:!max-w-none bg-background/80 backdrop-blur-sm border border-border/60 rounded-2xl px-6 py-4 shadow-lg"
                >
                  <div className="space-y-2">
                    <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97] p-0">
                      <Link
                        to="/dashboard"
                        preload="intent"
                        preloadDelay={0}
                        className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                          isOverviewActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                        }`}
                      >
                        Overview
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97] p-0">
                      <Link
                        to="/dashboard/inventory"
                        preload="intent"
                        preloadDelay={0}
                        className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                          isInventoryActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                        }`}
                      >
                        Inventory
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97] p-0">
                      <Link
                        to="/dashboard/orders"
                        preload="intent"
                        preloadDelay={0}
                        className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                          isOrdersActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                        }`}
                      >
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97] p-0">
                      <Link
                        to="/dashboard/users"
                        preload="intent"
                        preloadDelay={0}
                        className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                          isUsersActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                        }`}
                      >
                        Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97] p-0">
                      <Link
                        to="/dashboard/providers"
                        preload="intent"
                        preloadDelay={0}
                        className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                          isProvidersActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                        }`}
                      >
                        Providers
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97] p-0">
                      <Link
                        to="/dashboard/collections"
                        preload="intent"
                        preloadDelay={0}
                        className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                          isCollectionsActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                        }`}
                      >
                        Collections
                      </Link>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden lg:flex flex-col gap-2">
              <Link
                to="/dashboard"
                preload="intent"
                preloadDelay={0}
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
                preloadDelay={0}
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
                preloadDelay={0}
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
                preloadDelay={0}
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
                preloadDelay={0}
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

              <Link
                to="/dashboard/collections"
                preload="intent"
                preloadDelay={0}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg",
                  isCollectionsActive
                    ? "bg-[#00EC97] border border-[#00EC97] text-black"
                    : "bg-background border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
              >
                <Tags className="size-4" />
                <span className="flex-1 text-sm font-semibold">Collections</span>
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8 overflow-x-hidden min-w-0 max-w-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
