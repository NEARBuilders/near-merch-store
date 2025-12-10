import { type FC, useState, useEffect, type CSSProperties } from 'react';

interface LoadingFallbackProps {
  message?: string;
  submessage?: string;
}

const pageStyle: CSSProperties = {
  display: 'flex',
  height: '100%',
  width: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'clamp(1rem, 4vw, 2rem)',
  overflow: 'hidden',
};

const contentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'clamp(1rem, 3vw, 1.5rem)',
  width: '100%',
  maxWidth: '24rem',
};

const spinnerContainerStyle: CSSProperties = {
  position: 'relative',
  width: 'clamp(2.5rem, 8vw, 3rem)',
  height: 'clamp(2.5rem, 8vw, 3rem)',
};

const spinnerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  border: '4px solid #e5e5e5',
  borderTopColor: '#171717',
  animation: 'spin 1s linear infinite',
};

const pulseRingStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  backgroundColor: 'rgba(23, 23, 23, 0.1)',
  animation: 'pulse-ring 1.5s ease-out infinite',
};

const spinnerCenterStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const spinnerDotStyle: CSSProperties = {
  width: '50%',
  height: '50%',
  borderRadius: '50%',
  backgroundColor: '#fff',
};

const textContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  textAlign: 'center',
};

const messageStyle: CSSProperties = {
  fontSize: 'clamp(1rem, 3vw, 1.125rem)',
  fontWeight: 500,
  margin: 0,
};

const submessageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
  color: '#888',
  margin: 0,
};

export const LoadingFallback: FC<LoadingFallbackProps> = ({
  message = 'Loading application...',
  submessage = 'Connecting to remote module...',
}) => {
  const [visible, setVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(true), 50);
    const dotsTimer = setTimeout(() => setDotsVisible(true), 300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dotsTimer);
    };
  }, []);

  const containerAnimation: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 500ms ease-out, transform 500ms ease-out',
  };

  return (
    <div
      style={pageStyle}
      className="flex min-h-screen flex-col items-center justify-center bg-background"
    >
      <style>
        {`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0; }
            50% { opacity: 0.3; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        `}
      </style>

      <div
        style={{ ...contentStyle, ...containerAnimation }}
        className="flex flex-col items-center gap-6"
      >
        <div style={spinnerContainerStyle} className="relative">
          <div
            style={pulseRingStyle}
            className="absolute inset-0 rounded-full bg-primary/20"
          />
          <div
            style={spinnerStyle}
            className="h-12 w-12 rounded-full border-4 border-muted border-t-primary"
          />
          <div
            style={spinnerCenterStyle}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              style={spinnerDotStyle}
              className="h-6 w-6 rounded-full bg-background"
            />
          </div>
        </div>

        <div
          style={textContainerStyle}
          className="flex flex-col items-center gap-2"
        >
          <p
            style={messageStyle}
            className="text-lg font-medium text-foreground"
          >
            {message}
          </p>
          <p
            style={submessageStyle}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            {submessage}
            {dotsVisible && <LoadingDots />}
          </p>
        </div>

        <LoadingSkeleton visible={visible} />
      </div>
    </div>
  );
};

interface LoadingSkeletonProps {
  visible: boolean;
}

const LoadingSkeleton: FC<LoadingSkeletonProps> = ({ visible }) => {
  const skeletonStyle: CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: 'opacity 600ms ease-out 200ms',
    marginTop: 'clamp(1rem, 3vw, 2rem)',
    width: '100%',
    maxWidth: '20rem',
    padding: '0 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const shimmerStyle: CSSProperties = {
    background:
      'linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s linear infinite',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const avatarStyle: CSSProperties = {
    position: 'relative',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '50%',
    backgroundColor: '#e5e5e5',
    overflow: 'hidden',
    flexShrink: 0,
  };

  const textBlockStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  };

  const lineStyle = (width: string): CSSProperties => ({
    position: 'relative',
    height: '0.75rem',
    width,
    borderRadius: '0.25rem',
    backgroundColor: '#e5e5e5',
    overflow: 'hidden',
  });

  const buttonRowStyle: CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.5rem',
  };

  const buttonStyle: CSSProperties = {
    position: 'relative',
    height: '2rem',
    width: '5rem',
    borderRadius: '0.5rem',
    backgroundColor: '#e5e5e5',
    overflow: 'hidden',
  };

  return (
    <div style={skeletonStyle} className="mt-8 w-full max-w-md space-y-4 px-4">
      <div style={rowStyle} className="flex items-center gap-3">
        <div
          style={avatarStyle}
          className="relative h-10 w-10 overflow-hidden rounded-full bg-muted"
        >
          <div
            style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
            className="absolute inset-0"
          />
        </div>
        <div style={textBlockStyle} className="flex-1 space-y-2">
          <div
            style={lineStyle('75%')}
            className="relative h-4 w-3/4 overflow-hidden rounded bg-muted"
          >
            <div
              style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
              className="absolute inset-0"
            />
          </div>
          <div
            style={lineStyle('50%')}
            className="relative h-3 w-1/2 overflow-hidden rounded bg-muted"
          >
            <div
              style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
              className="absolute inset-0"
            />
          </div>
        </div>
      </div>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        className="space-y-3"
      >
        <div
          style={lineStyle('100%')}
          className="relative h-3 w-full overflow-hidden rounded bg-muted"
        >
          <div
            style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
            className="absolute inset-0"
          />
        </div>
        <div
          style={lineStyle('83%')}
          className="relative h-3 w-5/6 overflow-hidden rounded bg-muted"
        >
          <div
            style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
            className="absolute inset-0"
          />
        </div>
        <div
          style={lineStyle('66%')}
          className="relative h-3 w-4/6 overflow-hidden rounded bg-muted"
        >
          <div
            style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
            className="absolute inset-0"
          />
        </div>
      </div>
      <div style={buttonRowStyle} className="flex gap-2 pt-2">
        <div
          style={buttonStyle}
          className="relative h-8 w-20 overflow-hidden rounded-lg bg-muted"
        >
          <div
            style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
            className="absolute inset-0"
          />
        </div>
        <div
          style={buttonStyle}
          className="relative h-8 w-20 overflow-hidden rounded-lg bg-muted"
        >
          <div
            style={{ ...shimmerStyle, position: 'absolute', inset: 0 }}
            className="absolute inset-0"
          />
        </div>
      </div>
    </div>
  );
};

export const LoadingDots: FC = () => (
  <span
    style={{ display: 'inline-flex', gap: '2px' }}
    className="inline-flex gap-0.5"
  >
    <span
      style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        animation: 'bounce 1s ease-in-out infinite',
        animationDelay: '-0.3s',
      }}
      className="h-1 w-1 rounded-full bg-current"
    />
    <span
      style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        animation: 'bounce 1s ease-in-out infinite',
        animationDelay: '-0.15s',
      }}
      className="h-1 w-1 rounded-full bg-current"
    />
    <span
      style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        animation: 'bounce 1s ease-in-out infinite',
      }}
      className="h-1 w-1 rounded-full bg-current"
    />
  </span>
);

export const InlineLoader: FC<{ text?: string }> = ({ text = 'Loading' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      fontSize: '0.875rem',
      color: '#888',
    }}
    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
  >
    {text}
    <LoadingDots />
  </span>
);

export default LoadingFallback;
