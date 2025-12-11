import {
  Suspense,
  lazy,
  type FC,
  useState,
  useEffect,
  type CSSProperties,
  type ReactNode,
  useCallback,
} from 'react';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { ErrorBoundary } from './error-boundary';
import { LoadingFallback } from './loading-fallback';
import { loadBosConfig } from './config';
import { getRuntimeConfig } from './federation';

const RemoteApp = lazy(async () => {
  const config = getRuntimeConfig();
  const module = await loadRemote<{ default: FC }>(`${config.ui.name}/App`);
  if (!module) throw new Error(`Failed to load ${config.ui.name}/App`);
  return module;
});

interface SmoothSuspenseProps {
  children: ReactNode;
  fallback: ReactNode;
}

const SmoothSuspense: FC<SmoothSuspenseProps> = ({ children, fallback }) => {
  const [loaded, setLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  const contentStyle: CSSProperties = {
    opacity: showContent ? 1 : 0,
    transition: 'opacity 400ms ease-out',
    height: '100%',
  };

  return (
    <Suspense
      fallback={<div onAnimationEnd={() => setLoaded(true)}>{fallback}</div>}
    >
      <LoadedMarker onLoad={() => setLoaded(true)} />
      <div style={contentStyle}>{children}</div>
    </Suspense>
  );
};

const LoadedMarker: FC<{ onLoad: () => void }> = ({ onLoad }) => {
  useEffect(() => {
    onLoad();
  }, [onLoad]);
  return null;
};

export const Main: FC = () => {
  const [ready, setReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

    useEffect(() => {
    loadBosConfig().then((config) => {
      document.title = config.title;
    });

    const handleTitleChange = (event: CustomEvent<{ title: string }>) => {
      const remoteTitle = event.detail?.title;
      const config = getRuntimeConfig();
      const hostTitle = config.title;
      
      if (remoteTitle && hostTitle) {
        document.title = `${hostTitle} | ${remoteTitle}`;
      }
    };

    window.addEventListener(
      'near:title-change',
      handleTitleChange as EventListener
    );
    return () => {
      window.removeEventListener(
        'near:title-change',
        handleTitleChange as EventListener
      );
    };
  }, []);

  const handleRetry = useCallback(() => {
    console.log('[Host] Retrying remote app load...');
    setRetryKey((prev) => prev + 1);
  }, []);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    opacity: ready ? 1 : 0,
    transition: 'opacity 300ms ease-out',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <ErrorBoundary
          onError={(error) => {
            console.error('[Host] Failed to load remote app:', error.message);
          }}
          onRetry={handleRetry}
        >
          <SmoothSuspense key={retryKey} fallback={<LoadingFallback />}>
            <RemoteApp />
          </SmoothSuspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Main;
