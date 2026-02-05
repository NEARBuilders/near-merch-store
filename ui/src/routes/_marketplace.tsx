import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { MarketplaceFooter } from "@/components/marketplace-footer";
import { VideoBackground } from "@/components/video-background";

export const Route = createFileRoute("/_marketplace")({
  component: MarketplaceLayout,
  errorComponent: MarketplaceErrorComponent,
  notFoundComponent: MarketplaceNotFoundComponent,
});

function MarketplaceLayout() {
  return (
    <div className="min-h-screen w-full relative bg-background">
      <MarketplaceHeader />

      <main className="border-0 relative bg-background">
        <Outlet />
      </main>

      <MarketplaceFooter />
    </div>
  );
}

function MarketplaceErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen w-full relative bg-background">
      <MarketplaceHeader />

      <main className="border-0 relative bg-background min-h-screen pt-32 pb-16 flex items-center justify-center px-4">
        <VideoBackground />
        
        <div className="w-full max-w-md relative z-10">
          <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 py-8 md:py-10 space-y-6 text-center">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground/90 dark:text-muted-foreground">
                Oops!
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-foreground/90 dark:text-muted-foreground">
                Something went wrong
              </p>
              <details className="text-sm text-foreground/90 dark:text-muted-foreground bg-muted/30 p-4 rounded-lg text-left">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {error.message}
                </pre>
              </details>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full bg-[#00EC97] text-black px-6 py-4 flex items-center justify-center gap-3 hover:bg-[#00d97f] transition-colors rounded-lg font-semibold"
              >
                <span className="text-sm font-medium">Reload Page</span>
              </button>
              <Link
                to="/"
                className="w-full bg-background/60 backdrop-blur-sm border border-border/60 text-foreground px-6 py-4 flex items-center justify-center gap-3 hover:border-[#00EC97] hover:text-[#00EC97] transition-colors rounded-lg font-semibold"
              >
                <span className="text-sm font-medium">Go Home</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}

function MarketplaceNotFoundComponent() {
  return (
    <div className="min-h-screen pt-32 pb-16 relative flex items-center justify-center px-4">
      <VideoBackground />
      
      <div className="w-full max-w-md relative z-10">
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
