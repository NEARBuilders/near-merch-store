import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  type Product,
  SIZES,
  requiresSize,
} from "@/integrations/marketplace-api";

interface ProductSizeDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, size: string) => void;
}

export function ProductSizeDialog({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: ProductSizeDialogProps) {
  const [currentSize, setCurrentSize] = useState<string>("M");
  const requiresSizeSelection = product ? requiresSize(product.category) : false;
  const sizeOptions = requiresSizeSelection ? [...SIZES] : ["N/A"];

  useEffect(() => {
    if (isOpen && product) {
      setCurrentSize(requiresSizeSelection ? "M" : "N/A");
    }
  }, [isOpen, product, requiresSizeSelection]);

  if (!product) return null;

  const handleConfirmSelection = () => {
    const finalSize = requiresSizeSelection ? currentSize : "N/A";
    onAddToCart(product.id, finalSize);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] bg-white z-50 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] mx-4 p-0 border-0 rounded-none gap-0"
        showCloseButton={false}
      >
        <DialogHeader product={product} onClose={onClose} />
        <DialogBody 
          product={product}
          sizeOptions={sizeOptions}
          currentSize={currentSize}
          onSizeChange={setCurrentSize}
          onConfirm={handleConfirmSelection}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

interface DialogHeaderProps {
  product: Product;
  onClose: () => void;
}

function DialogHeader({ product, onClose }: DialogHeaderProps) {
  return (
    <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-4 flex items-start justify-between">
      <div className="flex-1">
        <h2 className="tracking-[-0.48px] text-[16px] mb-1">Select Size</h2>
        <p className="text-[#717182] text-[14px] tracking-[-0.48px]">
          Choose your size for {product.name}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="size-8 flex items-center justify-center -mr-2"
        aria-label="Close modal"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface DialogBodyProps {
  product: Product;
  sizeOptions: string[];
  currentSize: string;
  onSizeChange: (size: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function DialogBody({ 
  product, 
  sizeOptions, 
  currentSize, 
  onSizeChange,
  onConfirm,
  onCancel 
}: DialogBodyProps) {
  return (
    <div className="px-6 py-6">
      <ProductPreview product={product} />
      <SizeSelector 
        sizeOptions={sizeOptions}
        currentSize={currentSize}
        onSizeChange={onSizeChange}
      />
      <ActionButtons 
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </div>
  );
}

interface ProductPreviewProps {
  product: Product;
}

function ProductPreview({ product }: ProductPreviewProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="bg-[#ececf0] rounded size-20 shrink-0 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[16px] tracking-[-0.48px] mb-1">
          {product.name}
        </h3>
        <p className="text-[#717182] text-[14px] tracking-[-0.48px] mb-2">
          {product.category}
        </p>
        <p className="text-[16px] tracking-[-0.48px]">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

interface SizeSelectorProps {
  sizeOptions: string[];
  currentSize: string;
  onSizeChange: (size: string) => void;
}

function SizeSelector({ sizeOptions, currentSize, onSizeChange }: SizeSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-[14px] tracking-[-0.48px] mb-3">
        Size
      </label>
      <div className="grid grid-cols-5 gap-2">
        {sizeOptions.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onSizeChange(size)}
            className={`h-12 border transition-colors tracking-[-0.48px] text-[14px] ${
              currentSize === size
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-[rgba(0,0,0,0.1)] bg-white text-neutral-950 hover:border-neutral-950"
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function ActionButtons({ onConfirm, onCancel }: ActionButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 h-10 border border-[rgba(0,0,0,0.1)] bg-white text-neutral-950 tracking-[-0.48px] text-[14px] hover:bg-[#f3f3f5] transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="flex-1 h-10 bg-neutral-950 text-white tracking-[-0.48px] text-[14px] hover:bg-neutral-800 transition-colors"
      >
        Add to Cart
      </button>
    </div>
  );
}
