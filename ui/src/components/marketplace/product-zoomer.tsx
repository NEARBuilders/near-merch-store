import { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ProductZoomerProps {
    image: string;
    alt: string;
}

export function ProductZoomer({ image, alt }: ProductZoomerProps) {
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [modalOpen, setModalOpen] = useState(false);
    const [mobileZoomLevel, setMobileZoomLevel] = useState(1);
    const imgRef = useRef<HTMLImageElement>(null);
    const magnifierSize = 150; // Size of the square lens
    const zoomLevel = 2.5; // Zoom factor for desktop

    const isDesktop = useMediaQuery('(min-width: 768px)'); // Tailwind md breakpoint

    // Desktop Mouse Handlers
    const handleMouseEnter = () => {
        if (isDesktop) setShowMagnifier(true);
    };

    const handleMouseLeave = () => {
        setShowMagnifier(false);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imgRef.current || !isDesktop) return;

        const { left, top } = imgRef.current.getBoundingClientRect();

        // Use clientX/Y relative to the viewport, subtract element's position
        // This is robust against scrolling
        const x = e.clientX - left;
        const y = e.clientY - top;

        setCursorPosition({ x, y });
    };

    // Mobile Click Handler
    const handleImageClick = () => {
        if (!isDesktop) {
            setModalOpen(true);
            setMobileZoomLevel(1); // Reset zoom on open
        }
    };

    // Calculate lens position and background position
    let backgroundPosition = '0% 0%';
    let lensLeft = 0;
    let lensTop = 0;

    if (imgRef.current && showMagnifier) {
        const { width, height } = imgRef.current.getBoundingClientRect();

        // Clamp cursor position
        let x = cursorPosition.x;
        let y = cursorPosition.y;

        // Lens position (centered on cursor)
        lensLeft = x - magnifierSize / 2;
        lensTop = y - magnifierSize / 2;

        // Constrain lens within image
        if (lensLeft < 0) lensLeft = 0;
        if (lensTop < 0) lensTop = 0;
        if (lensLeft > width - magnifierSize) lensLeft = width - magnifierSize;
        if (lensTop > height - magnifierSize) lensTop = height - magnifierSize;

        // Calculate percentage for background position
        const xPercent = (lensLeft / (width - magnifierSize)) * 100;
        const yPercent = (lensTop / (height - magnifierSize)) * 100;

        backgroundPosition = `${xPercent}% ${yPercent}%`;
    }

    return (
        <div className="relative">
            {/* Main Image Container */}
            <div
                className={cn(
                    "relative w-full aspect-square bg-muted rounded-xl group cursor-pointer lg:cursor-crosshair",
                    !isDesktop && "active:opacity-90 transition-opacity"
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                onClick={handleImageClick}
            >
                <img
                    ref={imgRef}
                    src={image}
                    alt={alt}
                    className="w-full h-full object-cover rounded-xl"
                />

                {/* Desktop Lens overlay */}
                {showMagnifier && isDesktop && (
                    <div
                        className="absolute border border-primary/30 bg-primary/10 pointer-events-none"
                        style={{
                            left: lensLeft,
                            top: lensTop,
                            width: magnifierSize,
                            height: magnifierSize,
                        }}
                    />
                )}

                {/* Mobile: hint icon */}
                {!isDesktop && (
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm">
                        <Maximize2 className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Desktop Zoom Portal (The "Side" View) */}
            {/* Positioned absolutely relative to the container dev */}
            {showMagnifier && isDesktop && (
                <div
                    className="absolute z-50 overflow-hidden border border-border bg-background rounded-xl shadow-2xl"
                    style={{
                        /* Position to the right of the image container + 20px gap */
                        left: 'calc(100% + 20px)',
                        top: 0,
                        width: '100%', /* Match width to avoid distortion */
                        height: '100%', /* Match height */
                        backgroundImage: `url(${image})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${zoomLevel * 100}% ${zoomLevel * 100}%`,
                        backgroundPosition: backgroundPosition,
                    }}
                />
            )}

            {/* Mobile Fullscreen Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-screen h-[100dvh] w-screen p-0 border-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center">
                    <DialogTitle className="sr-only">Zoomed Product Image</DialogTitle>

                    {/* Close Button */}
                    <div className="absolute top-4 right-4 z-50">
                        <DialogClose asChild>
                            <Button variant="secondary" size="icon" className="rounded-full bg-white/20 hover:bg-white/40 text-white border-0">
                                <X className="w-6 h-6" />
                            </Button>
                        </DialogClose>
                    </div>

                    {/* Image Container with Panning */}
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                        <div
                            className="relative transition-transform duration-200 ease-out"
                            style={{
                                transform: `scale(${mobileZoomLevel})`,
                                transformOrigin: 'center center'
                            }}
                        >
                            <img
                                src={image}
                                alt={alt}
                                className="max-w-none max-h-[80vh] object-contain"
                                style={{
                                    /* Ensure at base zoom it fits, but can scale up */
                                    width: mobileZoomLevel > 1 ? 'auto' : '100%',
                                }}
                            />
                        </div>
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 rounded-full"
                            onClick={() => setMobileZoomLevel(Math.max(1, mobileZoomLevel - 0.5))}
                            disabled={mobileZoomLevel <= 1}
                        >
                            <ZoomOut className="w-6 h-6" />
                        </Button>
                        <span className="text-white font-mono text-sm min-w-[3ch] text-center">
                            {Math.round(mobileZoomLevel * 100)}%
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 rounded-full"
                            onClick={() => setMobileZoomLevel(Math.min(4, mobileZoomLevel + 0.5))}
                            disabled={mobileZoomLevel >= 4}
                        >
                            <ZoomIn className="w-6 h-6" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
