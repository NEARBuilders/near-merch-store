import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function SheetCloseButton() {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 hover:bg-background/60 hover:text-[#00EC97] focus:outline-none disabled:pointer-events-none"
    >
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  hideCloseButton = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  hideCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-[70] flex flex-col shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-full max-w-[640px] border-l border-border/60 overflow-hidden",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 max-w-sm border-r border-border/60",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b border-border/60",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t border-border/60",
          className
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && <SheetCloseButton />}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

export { Sheet, SheetContent };
