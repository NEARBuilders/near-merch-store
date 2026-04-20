import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product } from "@/integrations/api";

interface ProductTitleCellProps {
  product: Product;
}

export function ProductTitleCell({ product }: ProductTitleCellProps) {
  const [copied, setCopied] = useState(false);
  const productUrl = `${window.location.origin}/products/${product.slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    toast.success('Product link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <Link
        to="/dashboard/inventory/$productId"
        params={{ productId: product.id }}
        className="flex-1 min-w-0"
      >
        <p className="font-medium text-sm text-foreground/90 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors truncate">{product.title}</p>
      </Link>
      <Link
        to="/dashboard/inventory/$productId"
        params={{ productId: product.id }}
        className="text-foreground/50 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors shrink-0"
        title="Edit product"
      >
        <Pencil className="size-3.5" />
      </Link>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "text-foreground/50 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors shrink-0",
          copied && "text-[#00EC97]"
        )}
        title={copied ? "Copied!" : "Copy product link"}
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}