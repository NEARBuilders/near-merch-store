import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { VideoBackground } from "@/components/video-background";

export const Route = createFileRoute("/_marketplace/exclusives")({
  component: ExclusivesComingSoon,
});

function ExclusivesComingSoon() {
  return (
    <div className="min-h-screen pt-32 pb-16 relative flex items-center justify-center px-4">
      <VideoBackground />
      
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 py-8 md:py-10 space-y-6 text-center">
          <div className="space-y-4">
            <Lock className="mx-auto h-16 w-16 text-[#00EC97]" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground/90 dark:text-muted-foreground">
              Coming Soon
            </h1>
            <p className="text-base text-foreground/90 dark:text-muted-foreground">
              We're working on something special. The exclusive collection will be available soon.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              to="/products"
              search={{ category: "all", categoryId: undefined, collection: undefined }}
              className="w-full bg-[#00EC97] text-black px-6 py-4 flex items-center justify-center gap-3 hover:bg-[#00d97f] transition-colors rounded-lg font-semibold"
            >
              <span className="text-sm font-medium">Browse Shop Merch</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}