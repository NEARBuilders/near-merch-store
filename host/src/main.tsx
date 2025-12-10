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
import { loadRemote } from '@module-federation/runtime';
import { ErrorBoundary } from './error-boundary';
import { LoadingFallback } from './loading-fallback';
import remotesConfig from '../remotes.json';

const [primaryRemoteName] = Object.keys(remotesConfig.remotes);

const RemoteApp = lazy(async () => {
  const module = await loadRemote<{ default: FC }>(`${primaryRemoteName}/App`);
  if (!module) throw new Error(`Failed to load ${primaryRemoteName}/App`);
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

const HOST_TITLE = remotesConfig.title || 'App';

export const Main: FC = () => {
  const [ready, setReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.title = HOST_TITLE;

    const handleTitleChange = (event: CustomEvent<{ title: string }>) => {
      const remoteTitle = event.detail?.title;
      if (remoteTitle) {
        document.title = `${HOST_TITLE} | ${remoteTitle}`;
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
