import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FavoriteButtonProps {
    isFavorite: boolean;
    onToggle: () => void;
    className?: string;
    variant?: "icon" | "button";
}

export function FavoriteButton({
    isFavorite,
    onToggle,
    className,
    variant = "icon",
}: FavoriteButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAnimating(true);
        onToggle();
        setTimeout(() => setIsAnimating(false), 600);
    };

    if (variant === "button") {
        return (
            <button
                onClick={handleClick}
                className={cn("p-2 bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-background/80 hover:text-[#00EC97] transition-all rounded-lg", className)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
                <Heart
                    className={cn(
                        "size-6 transition-all duration-300",
                        isFavorite ? "fill-[#00EC97] stroke-[#00EC97]" : "stroke-foreground",
                        isAnimating && "animate-heart-pop"
                    )}
                />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                "absolute top-3 right-3 p-2 bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-background/80 hover:text-[#00EC97] transition-all z-10 rounded-lg",
                className
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            <Heart
                className={cn(
                    "size-4 transition-all duration-300 cursor-pointer",
                    isFavorite ? "fill-[#00EC97] stroke-[#00EC97]" : "stroke-foreground",
                    isAnimating && "animate-heart-pop"
                )}
                aria-hidden="true"
            />
        </button>
    );
}
