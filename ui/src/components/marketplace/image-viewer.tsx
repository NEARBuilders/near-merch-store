import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  productName: string;
}

export function ImageViewer({
  images,
  initialIndex,
  onClose,
  productName,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      <div className="relative w-full h-full md:h-auto md:max-w-[838px] md:mx-4 flex flex-col md:block justify-center">
        <div className="relative flex items-center justify-center gap-6 h-full md:h-auto">
          <button
            onClick={handlePrevious}
            className="absolute left-4 md:static z-20 size-12 bg-card/90 flex items-center justify-center hover:bg-card transition-colors shrink-0 rounded-full"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="relative md:bg-[#ececf0] md:aspect-square overflow-hidden md:shadow-lg max-w-[678px] w-full h-full md:h-auto flex items-center justify-center">
            <img
              src={images[currentIndex]}
              alt={`${productName} - Image ${currentIndex + 1}`}
              className="w-full h-full object-contain md:object-cover"
            />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 size-10 bg-card/90 flex items-center justify-center hover:bg-card transition-colors rounded-full"
              aria-label="Close image viewer"
            >
              <X className="size-4" />
            </button>
          </div>

          <button
            onClick={handleNext}
            className="absolute right-4 md:static z-20 size-12 bg-card/90 flex items-center justify-center hover:bg-card transition-colors shrink-0 rounded-full"
            aria-label="Next image"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="absolute bottom-8 left-0 right-0 md:static flex justify-center md:mt-6 z-20">
          <div className="bg-card/90 px-3.5 py-2 rounded-full">
            <span className="tracking-[-0.48px] text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
