import {
  type FC,
  type ReactNode,
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from 'react';

interface TransitionLoaderProps {
  loading: boolean;
  loader: ReactNode;
  children: ReactNode;
  duration?: number;
  minLoadTime?: number;
}

export const TransitionLoader: FC<TransitionLoaderProps> = ({
  loading,
  loader,
  children,
  duration = 300,
  minLoadTime = 400,
}) => {
  const [showLoader, setShowLoader] = useState(loading);
  const [showContent, setShowContent] = useState(!loading);
  const loadStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (loading) {
      loadStartRef.current = Date.now();
      setShowLoader(true);
      setShowContent(false);
    } else {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadTime - elapsed);

      setTimeout(() => {
        setShowLoader(false);
        setTimeout(() => setShowContent(true), 50);
      }, remaining);
    }
  }, [loading, minLoadTime]);

  const loaderStyle: CSSProperties = {
    opacity: showLoader ? 1 : 0,
    transition: `opacity ${duration}ms ease-out`,
    position: showLoader ? 'relative' : 'absolute',
    pointerEvents: showLoader ? 'auto' : 'none',
  };

  const contentStyle: CSSProperties = {
    opacity: showContent ? 1 : 0,
    transition: `opacity ${duration}ms ease-out`,
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={loaderStyle}>{loader}</div>
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

interface SuspenseTransitionProps {
  children: ReactNode;
  fallback: ReactNode;
  duration?: number;
}

export const SuspenseTransition: FC<SuspenseTransitionProps> = ({
  children,
  fallback,
  duration = 400,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const style: CSSProperties = {
    opacity: mounted ? 1 : 0,
    transition: `opacity ${duration}ms ease-out`,
  };

  return <div style={style}>{mounted ? children : fallback}</div>;
};

interface CrossfadeProps {
  show: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
}

export const Crossfade: FC<CrossfadeProps> = ({
  show,
  children,
  duration = 300,
  className = '',
}) => {
  const style: CSSProperties = {
    opacity: show ? 1 : 0,
    transform: show ? 'scale(1)' : 'scale(0.98)',
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};
