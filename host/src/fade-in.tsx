import {
  type FC,
  type ReactNode,
  useState,
  useEffect,
  type CSSProperties,
} from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  className?: string;
}

export const FadeIn: FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 400,
  translateY = 8,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const style: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${translateY}px)`,
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};

interface StaggerProps {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  duration?: number;
  className?: string;
}

export const Stagger: FC<StaggerProps> = ({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  duration = 400,
  className = '',
}) => (
  <div className={className}>
    {children.map((child, i) => (
      <FadeIn
        key={i}
        delay={initialDelay + i * staggerDelay}
        duration={duration}
      >
        {child}
      </FadeIn>
    ))}
  </div>
);
