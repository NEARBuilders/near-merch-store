import builtOnLight from "@/assets/images/pngs/built_on.png";
import builtOnDark from "@/assets/images/pngs/built_on_rev.png";
import { useResolvedAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

interface BuiltOnNearProps {
  className?: string;
}

export function BuiltOnNear({ className }: BuiltOnNearProps) {
  const builtOnLightSrc = useResolvedAssetUrl(builtOnLight);
  const builtOnDarkSrc = useResolvedAssetUrl(builtOnDark);

  return (
    <a
      href="https://near.org"
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-block opacity-80 hover:opacity-100 transition-opacity", className)}
      aria-label="Built on NEAR"
    >
      <img
        src={builtOnLightSrc}
        alt="Built on NEAR"
        className="h-8 w-auto dark:hidden"
      />
      <img
        src={builtOnDarkSrc}
        alt="Built on NEAR"
        className="h-8 w-auto hidden dark:block"
      />
    </a>
  );
}
