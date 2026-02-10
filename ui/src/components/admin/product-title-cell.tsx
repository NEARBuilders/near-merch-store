import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product } from "@/integrations/api";

interface ProductTitleCellProps {
  product: Product;
}

export function ProductTitleCell({ product }: ProductTitleCellProps) {
  const [copied, setCopied] = useState(false);
  const productUrl = `${window.location.origin}/products/${product.id}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    toast.success('Product link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="flex items-center gap-2 w-full"
    >
      <p className="font-medium text-sm text-foreground/90 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors flex-1">{product.title}</p>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "text-foreground/50 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors",
          copied && "text-[#00EC97]"
        )}
        title={copied ? "Copied!" : "Copy product link"}
      >
        <Copy className="size-3.5" />
      </button>
    </Link>
  );
}