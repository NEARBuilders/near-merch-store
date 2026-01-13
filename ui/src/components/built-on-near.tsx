import builtOnLight from "@/assets/images/pngs/built_on.png";
import builtOnDark from "@/assets/images/pngs/built_on_rev.png";
import { cn } from "@/lib/utils";

interface BuiltOnNearProps {
  className?: string;
}

export function BuiltOnNear({ className }: BuiltOnNearProps) {
  return (
    <a
      href="https://near.org"
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-block opacity-80 hover:opacity-100 transition-opacity", className)}
      aria-label="Built on NEAR"
    >
      <img
        src={builtOnLight}
        alt="Built on NEAR"
        className="h-8 w-auto dark:hidden"
      />
      <img
        src={builtOnDark}
        alt="Built on NEAR"
        className="h-8 w-auto hidden dark:block"
      />
    </a>
  );
}
