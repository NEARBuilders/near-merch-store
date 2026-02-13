export function PageLoader({ variant = 'full' }: { variant?: 'full' | 'inline' }) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-border/60 border-t-[#00EC97]"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-border/60 border-t-[#00EC97]"></div>
    </div>
  );
}
