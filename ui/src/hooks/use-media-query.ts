import { useState, useEffect } from "react";

export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== "undefined") {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia(query);

        // Update state if it changed
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

        // Modern browsers support addEventListener on MediaQueryList
        // Fallback or safety could be added but this is standard now
        media.addEventListener("change", listener);

        return () => media.removeEventListener("change", listener);
    }, [query]);

    return matches;
}
