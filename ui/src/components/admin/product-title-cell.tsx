import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product } from "@/integrations/api";

interface ProductTitleCellProps {
  product: Product;
}

export function ProductTitleCell({ product }: ProductTitleCellProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const productUrl = `${window.location.origin}/products/${product.slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    toast.success('Product link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate({
      to: "/dashboard/inventory/$productId",
      params: { productId: product.id },
    });
  };

  return (
    <div className="flex items-center gap-1 w-full">
      <Button
        variant="ghost"
        onClick={handleEdit}
        className="flex-1 min-w-0 justify-start h-auto px-1 py-0.5 font-medium text-sm text-foreground/90 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors rounded-md"
      >
        <span className="truncate">{product.title}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEdit}
        className="h-7 w-7 shrink-0 text-foreground/50 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors"
        title="Edit product"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className={cn(
          "h-7 w-7 shrink-0 text-foreground/50 dark:text-muted-foreground hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors",
          copied && "text-[#00EC97]"
        )}
        title={copied ? "Copied!" : "Copy product link"}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}
