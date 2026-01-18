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
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full h-full md:h-auto md:max-w-[838px] md:mx-4 flex flex-col md:block justify-center px-4 md:px-0">
        <div className="relative flex items-center justify-center gap-4 md:gap-6 h-full md:h-auto">
          {/* Image container with background block */}
          <div className="relative bg-background/60 backdrop-blur-sm border border-border/60 rounded-2xl md:aspect-square overflow-hidden md:shadow-lg w-full max-w-[calc(100vw-2rem)] md:max-w-[678px] max-h-[80vh] md:h-auto flex items-center justify-center">
            <img
              src={images[currentIndex]}
              alt={`${productName} - Image ${currentIndex + 1}`}
              className="w-full h-full object-contain md:object-cover"
            />

            {/* Close button - visible on both mobile and desktop */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5 text-foreground group-hover:text-black" />
            </button>

            {/* Bottom controls - indicator left, navigation buttons right - inside block */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4 z-20">
                {/* Indicator - bottom left */}
                <div className="px-4 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60">
                  <span className="text-sm text-foreground/90 dark:text-muted-foreground">
                    {currentIndex + 1} / {images.length}
                  </span>
                </div>

                {/* Navigation buttons - bottom right (both mobile and desktop) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevious}
                    className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 text-foreground group-hover:text-black" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 text-foreground group-hover:text-black" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
