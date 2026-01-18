import { QueryClient } from "@tanstack/react-query";
import {
  createBrowserHistory,
  createRouter as createTanStackRouter,
  Link,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
import type { CreateRouterOptions } from "./types";

export type {
  ClientRuntimeConfig, CreateRouterOptions, RouterContext, RouterModule
} from "./types";

function NotFoundComponent() {
  return (
    <div className="bg-background h-screen w-full flex items-center justify-center px-4 relative overflow-hidden">
      {/* Video background - full page */}
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
        {/* Single Block */}
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 py-8 md:py-10 space-y-6 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground/90 dark:text-muted-foreground">
              404
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-foreground/90 dark:text-muted-foreground">
              Page Not Found
            </p>
            <p className="text-base text-foreground/90 dark:text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              to="/"
              className="w-full bg-[#00EC97] text-black px-6 py-4 flex items-center justify-center gap-3 hover:bg-[#00d97f] transition-colors rounded-lg font-semibold"
            >
              <span className="text-sm font-medium">Go Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">Oops!</h1>
        <p className="text-muted-foreground mb-4">Something went wrong</p>
        <details className="text-sm text-muted-foreground bg-muted p-4 rounded mb-8">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 whitespace-pre-wrap text-left">
            {error.message}
          </pre>
        </details>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function PendingComponent() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-border/60 border-t-[#00EC97]"></div>
    </div>
  );
}

export function createRouter(opts: CreateRouterOptions = {}) {
  const queryClient =
    opts.context?.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });

  const history = opts.history ?? createBrowserHistory();

  const router = createTanStackRouter({
    routeTree,
    history,
    context: {
      queryClient,
      assetsUrl: opts.context?.assetsUrl ?? "",
      runtimeConfig: opts.context?.runtimeConfig,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFoundComponent,
    defaultErrorComponent: ErrorComponent,
    defaultPendingComponent: PendingComponent,
    defaultPendingMinMs: 100,
  });

  return { router, queryClient };
}

export { routeTree };

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>["router"];
  }
}
