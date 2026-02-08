export function MarketplaceSkeletonLoader() {
  return (
    <div className="pt-28 md:pt-32 min-h-[calc(100vh-120px)] relative">
      <div className="w-full max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Left sidebar - skeleton */}
          <div className="flex-1 lg:flex-1 space-y-6">
            <div className="rounded-2xl bg-background/40 backdrop-blur-sm border border-border/40 px-6 md:px-10 py-8 md:py-10 space-y-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent w-full h-full animate-shimmer" />
              <div className="h-8 w-24 rounded-lg bg-muted/30 animate-pulse" />
              <div className="space-y-3">
                <div className="h-12 w-4/5 rounded-lg bg-muted/30 animate-pulse" />
                <div className="h-8 w-3/5 rounded-lg bg-muted/30 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-muted/30 animate-pulse delay-75" />
                <div className="h-4 w-4/5 rounded bg-muted/30 animate-pulse delay-100" />
              </div>
            </div>

            <div className="flex-1 rounded-2xl bg-background/40 backdrop-blur-sm border border-border/40 px-6 md:px-8 py-6 md:py-8 space-y-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent w-full h-full animate-shimmer" />
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="h-10 w-3/4 rounded-lg bg-muted/30 animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted/30 animate-pulse delay-100" />
                </div>
                <div className="h-10 w-40 rounded-lg bg-muted/30 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right side - carousel skeleton */}
          <div className="flex-1 lg:flex-1 rounded-2xl bg-background/40 backdrop-blur-sm border border-border/40 px-3 md:px-5 py-3 md:py-5 min-h-[400px] md:min-h-[500px] lg:min-h-[700px] relative overflow-hidden">
            {/* Gradient layers */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-background/30" />
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent w-full h-full animate-shimmer" />
            
            {/* Mobile overlay skeleton */}
            <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 rounded-2xl overflow-hidden">
              <div className="flex flex-col gap-3 p-6 md:p-8">
                <div className="h-8 w-20 rounded-md bg-black/30 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-10 w-3/4 rounded-lg bg-black/30 animate-pulse" />
                  <div className="h-8 w-1/2 rounded-lg bg-black/30 animate-pulse delay-75" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-black/30 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-black/30 animate-pulse delay-100" />
                </div>
              </div>
            </div>

            {/* Desktop view collection button skeleton */}
            <div className="hidden lg:block absolute top-4 right-4">
              <div className="h-10 w-32 rounded-lg bg-background/40 animate-pulse" />
            </div>

            {/* Slide indicators skeleton */}
            <div className="hidden lg:block absolute top-4 left-4 flex gap-2 z-10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1.5 rounded-full bg-muted/50 ${i === 1 ? 'w-6 bg-muted/80' : 'w-2.5 bg-muted/30'} animate-pulse`} />
              ))}
            </div>

            {/* Navigation buttons skeleton */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
              <div className="w-10 h-10 rounded-lg bg-background/40 animate-pulse delay-100" />
              <div className="w-10 h-10 rounded-lg bg-background/40 animate-pulse delay-150" />
            </div>

            {/* Mobile button skeleton */}
            <div className="lg:hidden absolute bottom-4 left-4 z-10">
              <div className="w-32 h-10 rounded-lg bg-background/60 animate-pulse backdrop-blur-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient bar */}
      <div className="relative w-full h-16 bg-gradient-to-b from-transparent via-background/50 to-background overflow-hidden -mt-16 z-[5]" />
    </div>
  );
}