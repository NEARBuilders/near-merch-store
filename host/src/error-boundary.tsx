import {
  Component,
  type ReactNode,
  type ErrorInfo,
  type CSSProperties,
} from 'react';
import { FadeIn } from './fade-in';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  animateIn: boolean;
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
  maxWidth: '24rem',
  width: '100%',
  textAlign: 'center',
};

const emojiStyle: CSSProperties = {
  fontSize: 'clamp(3rem, 10vw, 4rem)',
  marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
  lineHeight: 1,
};

const headingStyle: CSSProperties = {
  fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
  fontWeight: 600,
  marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
  margin: 0,
};

const messageStyle: CSSProperties = {
  marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
  marginTop: 0,
  color: '#666',
  lineHeight: 1.5,
  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
};

const detailsStyle: CSSProperties = {
  marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
  padding: 'clamp(0.75rem, 2vw, 1rem)',
  border: '1px solid #e5e5e5',
  borderRadius: '0.5rem',
  textAlign: 'left',
};

const buttonContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const primaryButtonStyle: CSSProperties = {
  padding: 'clamp(0.5rem, 1.5vw, 0.625rem) clamp(1rem, 3vw, 1.5rem)',
  borderRadius: '0.5rem',
  fontWeight: 500,
  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
  cursor: 'pointer',
  border: 'none',
  backgroundColor: '#171717',
  color: '#fff',
};

const secondaryButtonStyle: CSSProperties = {
  padding: 'clamp(0.5rem, 1.5vw, 0.625rem) clamp(1rem, 3vw, 1.5rem)',
  borderRadius: '0.5rem',
  fontWeight: 500,
  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
  cursor: 'pointer',
  border: '1px solid #e5e5e5',
  backgroundColor: 'transparent',
};

const retryCountStyle: CSSProperties = {
  marginTop: '1rem',
  fontSize: '0.875rem',
  color: '#888',
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      animateIn: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, animateIn: false };
  }

  componentDidUpdate(_: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      requestAnimationFrame(() => {
        this.setState({ animateIn: true });
      });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Module Federation] Remote load error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      animateIn: false,
    }));
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError =
        this.state.error?.message?.includes('fetch') ||
        this.state.error?.message?.includes('network') ||
        this.state.error?.message?.includes('Failed to load');

      const containerAnimation: CSSProperties = {
        opacity: this.state.animateIn ? 1 : 0,
        transform: this.state.animateIn ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 500ms ease-out, transform 500ms ease-out',
      };

      return (
        <div
          style={pageStyle}
          className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground"
        >
          <style>
            {`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-4px); }
                75% { transform: translateX(4px); }
              }
              @keyframes pulse-soft {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
              }
            `}
          </style>

          <div
            style={{ ...contentStyle, ...containerAnimation }}
            className="max-w-md text-center"
          >
            <FadeIn delay={100} duration={400}>
              <div
                style={{
                  ...emojiStyle,
                  animation: isNetworkError
                    ? 'shake 0.5s ease-in-out'
                    : 'pulse-soft 2s ease-in-out infinite',
                }}
                className="mb-6 text-6xl"
              >
                {isNetworkError ? '🔌' : '⚠️'}
              </div>
            </FadeIn>

            <FadeIn delay={200} duration={400}>
              <h1 style={headingStyle} className="mb-4 text-2xl font-semibold">
                {isNetworkError ? 'Connection Error' : 'Something went wrong'}
              </h1>
            </FadeIn>

            <FadeIn delay={300} duration={400}>
              <p style={messageStyle} className="mb-6 text-muted-foreground">
                {isNetworkError
                  ? 'Unable to load the remote application. Please check your connection and try again.'
                  : 'The application encountered an unexpected error. Our team has been notified.'}
              </p>
            </FadeIn>

            {this.state.error && (
              <FadeIn delay={400} duration={400}>
                <details
                  style={detailsStyle}
                  className="mb-6 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted/70"
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                    }}
                    className="cursor-pointer text-sm font-medium"
                  >
                    Technical Details
                  </summary>
                  <pre
                    style={{
                      marginTop: '0.5rem',
                      overflow: 'auto',
                      fontSize: '0.75rem',
                      color: '#888',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                    className="mt-2 overflow-auto text-xs text-muted-foreground"
                  >
                    {this.state.error.message}
                  </pre>
                </details>
              </FadeIn>
            )}

            <FadeIn delay={500} duration={400}>
              <div
                style={buttonContainerStyle}
                className="flex flex-col gap-3 sm:flex-row sm:justify-center"
              >
                <button
                  onClick={this.handleRetry}
                  style={primaryButtonStyle}
                  className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={secondaryButtonStyle}
                  className="rounded-lg border border-border px-6 py-2.5 font-medium transition-all hover:bg-accent active:scale-[0.98]"
                >
                  Reload Page
                </button>
              </div>
            </FadeIn>

            {this.state.retryCount > 0 && (
              <FadeIn delay={600} duration={400}>
                <p
                  style={retryCountStyle}
                  className="mt-4 text-sm text-muted-foreground"
                >
                  Retry attempts: {this.state.retryCount}
                </p>
              </FadeIn>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
