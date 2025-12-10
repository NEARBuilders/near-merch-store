import { type FC, type CSSProperties } from 'react';
import { FadeIn } from './fade-in';

interface NotFoundProps {
  title?: string;
  message?: string;
  onNavigateHome?: () => void;
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
  textAlign: 'center',
  width: '100%',
  maxWidth: '28rem',
};

const numberContainerStyle: CSSProperties = {
  marginBottom: 'clamp(1rem, 4vw, 2rem)',
  animation: 'float 3s ease-in-out infinite',
};

const numberWrapperStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
};

const numberBaseStyle: CSSProperties = {
  fontSize: 'clamp(80px, 25vw, 180px)',
  fontWeight: 700,
  lineHeight: 1,
  color: 'rgba(0, 0, 0, 0.08)',
};

const numberGlowStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'pulse-glow 2s ease-in-out infinite',
};

const numberGlowTextStyle: CSSProperties = {
  fontSize: 'clamp(80px, 25vw, 180px)',
  fontWeight: 700,
  lineHeight: 1,
  color: 'rgba(0, 0, 0, 0.2)',
};

const headingStyle: CSSProperties = {
  fontSize: 'clamp(1.25rem, 4vw, 1.875rem)',
  fontWeight: 600,
  marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
  margin: 0,
};

const messageStyle: CSSProperties = {
  marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
  marginTop: 0,
  color: '#666',
  lineHeight: 1.5,
  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
  maxWidth: '24rem',
  marginLeft: 'auto',
  marginRight: 'auto',
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

export const NotFound: FC<NotFoundProps> = ({
  title = 'Page Not Found',
  message = "The page you're looking for doesn't exist or has been moved.",
  onNavigateHome,
}) => {
  return (
    <div
      style={pageStyle}
      className="flex min-h-screen flex-col items-center justify-center bg-background p-8"
    >
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}
      </style>

      <FadeIn duration={600}>
        <div style={contentStyle} className="text-center">
          <div style={numberContainerStyle} className="mb-8">
            <div style={numberWrapperStyle} className="relative inline-block">
              <span
                style={numberBaseStyle}
                className="text-[120px] font-bold leading-none text-foreground/10 sm:text-[180px]"
              >
                404
              </span>
              <div
                style={numberGlowStyle}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span
                  style={numberGlowTextStyle}
                  className="text-[120px] font-bold leading-none text-foreground/30 sm:text-[180px]"
                >
                  404
                </span>
              </div>
            </div>
          </div>

          <FadeIn delay={200} duration={500}>
            <h1
              style={headingStyle}
              className="mb-4 text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {title}
            </h1>
          </FadeIn>

          <FadeIn delay={350} duration={500}>
            <p
              style={messageStyle}
              className="mx-auto mb-8 max-w-md text-muted-foreground"
            >
              {message}
            </p>
          </FadeIn>

          <FadeIn delay={500} duration={500}>
            <div
              style={buttonContainerStyle}
              className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <button
                onClick={onNavigateHome || (() => (window.location.href = '/'))}
                style={primaryButtonStyle}
                className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
              >
                Go Home
              </button>
              <button
                onClick={() => window.history.back()}
                style={secondaryButtonStyle}
                className="rounded-lg border border-border px-6 py-2.5 font-medium transition-all hover:bg-accent active:scale-[0.98]"
              >
                Go Back
              </button>
            </div>
          </FadeIn>
        </div>
      </FadeIn>
    </div>
  );
};

export default NotFound;
