import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const routerState = useRouterState();
  const isPending = routerState.isLoading;

  return (
    <div 
      className={`transition-opacity duration-300 ${
        isPending ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  );
}
