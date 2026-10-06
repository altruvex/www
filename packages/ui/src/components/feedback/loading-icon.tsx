import { cn } from "../../lib/utils";

const SIZES = { xs: 12, sm: 14, md: 16, lg: 24, xl: 32 } as const;

export type LoadingIconSize = keyof typeof SIZES;

const BARS = 8;

const OUTER = 0.485;
const INNER = 0.19;
const THICKNESS = 0.1;
const CYCLE = 1.2;

export const LoadingIcon = ({
  size = "md",
  bars,
  color = "currentColor",
  className,
  label,
}: {
  size?: LoadingIconSize | number;
  bars?: number;
  color?: string;
  className?: string;
  label?: string;
}) => {
  const px = typeof size === "number" ? size : SIZES[size];
  const count = Math.max(3, Math.round(bars ?? BARS));
  const angleStep = 360 / count;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 align-middle",
        className,
      )}
      style={{ width: `${px}px`, height: `${px}px` }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-full opacity-20 animate-pulse motion-reduce:animate-none motion-reduce:opacity-60"
          style={{
            width: `${px * THICKNESS}px`,
            height: `${px * (OUTER - INNER)}px`,
            backgroundColor: color,
            top: "50%",
            left: "50%",
            margin: `-${px * (OUTER - INNER)}px 0 0 -${(px * THICKNESS) / 2}px`,
            transformOrigin: "center bottom",
            transform: `rotate(${i * angleStep}deg) translateY(-${px * INNER}px)`,
            animationDelay: `${((i * CYCLE) / count).toFixed(3)}s`,
            animationDuration: `${CYCLE}s`,
          }}
        />
      ))}
    </span>
  );
};
