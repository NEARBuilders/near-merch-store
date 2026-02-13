interface VideoBackgroundProps {
  src?: string;
  overlay?: boolean;
  position?: "fixed" | "absolute";
  className?: string;
  height?: string;
}

export function VideoBackground({ 
  src = "https://videos.near.org/BKLDE_v001_NEAR_03_master_h264_small.mp4",
  overlay = true,
  position = "fixed",
  className = "",
  height,
}: VideoBackgroundProps) {
  const positionClasses = position === "fixed" 
    ? "fixed inset-0" 
    : "absolute top-0 left-0 w-full";

  return (
    <div 
      className={`${positionClasses} z-0 pointer-events-none ${className}`}
      style={height ? { height } : undefined}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      {overlay && (
        <div className="absolute inset-0 dark:bg-background/30" />
      )}
    </div>
  );
}
