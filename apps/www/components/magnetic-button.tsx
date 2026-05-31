"use client";

import { Slot } from "@radix-ui/react-slot";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "default" | "lg";

interface Ripple {
  x: number;
  y: number;
  id: number;
}

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  asChild?: boolean;
}

function useMergedRef<T>(...refs: (React.Ref<T> | null | undefined)[]) {
  return useCallback(
    (node: T) => {
      refs.forEach((ref) => {
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<T>).current = node;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
    refs,
  );
}

function subscribeToReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionPreference() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Ripple keyframes injected once into the document head
const RIPPLE_STYLE_ID = "magnetic-button-ripple-keyframes";
function ensureRippleKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(RIPPLE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = RIPPLE_STYLE_ID;
  style.textContent = `
    @keyframes ripple-expand {
      0%   { transform: translate(-50%, -50%) scale(1);  opacity: 0.35; }
      100% { transform: translate(-50%, -50%) scale(28); opacity: 0; }
    }
    .magnetic-ripple {
      animation: ripple-expand 400ms ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

export const MagneticButton = forwardRef<
  HTMLButtonElement,
  MagneticButtonProps
>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "default",
      soundEnabled = false,
      hapticEnabled = true,
      asChild = false,
      onClick,
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const rectRef = useRef<DOMRect | null>(null);
    const magneticRef = useRef({ x: 0, y: 0 });
    const isPressedRef = useRef(false);
    const rafRef = useRef<number | null>(null);

    const mergedRef = useMergedRef(internalRef, forwardedRef);

    const updateRect = useCallback(() => {
      if (!internalRef.current) return;
      rectRef.current = internalRef.current.getBoundingClientRect();
    }, []);

    const prefersReducedMotion = useSyncExternalStore(
      subscribeToReducedMotion,
      getReducedMotionPreference,
      () => false,
    );

    const [isPressed, setIsPressed] = useState(false);
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const Comp = asChild ? Slot : "button";

    useEffect(() => {
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    const flushTransform = useCallback(() => {
      rafRef.current = null;
      if (!internalRef.current) return;
      const { x, y } = magneticRef.current;
      const scale = isPressedRef.current && !prefersReducedMotion ? 0.95 : 1;
      internalRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    }, [prefersReducedMotion]);

    const scheduleTransform = useCallback(() => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(flushTransform);
    }, [flushTransform]);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!internalRef.current || prefersReducedMotion) return;
      const rect =
        rectRef.current ?? internalRef.current.getBoundingClientRect();
      rectRef.current = rect;
      magneticRef.current = {
        x: (e.clientX - rect.left - rect.width / 2) * 0.15,
        y: (e.clientY - rect.top - rect.height / 2) * 0.15,
      };
      scheduleTransform();
    };

    const handleMouseLeave = () => {
      if (prefersReducedMotion) return;
      magneticRef.current = { x: 0, y: 0 };
      isPressedRef.current = false;
      setIsPressed(false);
      scheduleTransform();
    };

    const handleMouseDown = () => {
      if (!prefersReducedMotion) {
        isPressedRef.current = true;
        setIsPressed(true);
        scheduleTransform();
      }
    };
    const handleMouseUp = () => {
      isPressedRef.current = false;
      setIsPressed(false);
      scheduleTransform();
    };

    const playClickSound = () => {
      try {
        const audioContext = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.1,
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.warn("Audio playback failed:", error);
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!internalRef.current) return;

      ensureRippleKeyframes();

      const rect = internalRef.current.getBoundingClientRect();
      const rippleId = Date.now();

      setRipples((prev) => [
        ...prev,
        { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId },
      ]);
      setTimeout(
        () => setRipples((prev) => prev.filter((r) => r.id !== rippleId)),
        420,
      );

      if (hapticEnabled && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch (err) {
          console.warn("Haptic failed:", err);
        }
      }
      if (soundEnabled) playClickSound();
      onClick?.(e);
    };

    const variants: Record<ButtonVariant, string> = {
      primary:
        "bg-foreground/95 text-background hover:bg-foreground backdrop-blur-md",
      secondary:
        "bg-transparent text-primary/85 border border-foreground/40 hover:bg-foreground/5 hover:border-foreground/60",
      ghost:
        "bg-transparent text-primary/75 hover:bg-foreground/5 border border-transparent",
    };

    const sizes: Record<ButtonSize, string> = {
      default: "min-h-12 min-w-12 px-6 py-2.5 text-sm",
      lg: "min-h-12 min-w-12 px-8 py-3.5 text-base",
    };

    return (
      <Comp
        ref={mergedRef}
        onClick={handleClick}
        onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
        onMouseEnter={prefersReducedMotion ? undefined : updateRect}
        onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
        onMouseDown={prefersReducedMotion ? undefined : handleMouseDown}
        onMouseUp={prefersReducedMotion ? undefined : handleMouseUp}
        className={[
          "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium",
          "transition-[background-color,border-color,color,box-shadow] duration-300 ease-out will-change-transform",
          "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
          variants[variant],
          sizes[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          transform: `translate3d(0px, 0px, 0) scale(${isPressed && !prefersReducedMotion ? 0.95 : 1})`,
          transition: `transform 300ms ease-out, background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out, box-shadow 300ms ease-out`,
        }}
        data-cursor-pointer
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
        {!prefersReducedMotion &&
          ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="magnetic-ripple absolute pointer-events-none rounded-full bg-current opacity-30"
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: "10px",
                height: "10px",
              }}
            />
          ))}
      </Comp>
    );
  },
);

MagneticButton.displayName = "MagneticButton";
