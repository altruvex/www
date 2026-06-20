"use client";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { motion, usePress, useMagnetic } from "@/lib/motion";
import React, {
  forwardRef,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "filled" | "accent";
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
  isLoading?: boolean;
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
      isLoading = false,
      onClick,
      disabled,
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const magneticRef = useMagnetic<HTMLButtonElement>(motion.magneticCTA());
    const pressRef = usePress<HTMLButtonElement>(motion.pressDefault());

    const mergedRef = useMergedRef(internalRef, magneticRef, pressRef, forwardedRef);

    const prefersReducedMotion = useSyncExternalStore(
      subscribeToReducedMotion,
      getReducedMotionPreference,
      () => false,
    );

    const [ripples, setRipples] = useState<Ripple[]>([]);

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
        "bg-foreground/95 text-background hover:bg-foreground",
      secondary:
        "bg-transparent text-primary/85 border border-foreground/40 hover:bg-foreground/5 hover:border-foreground/60",
      ghost:
        "bg-transparent text-primary/75 hover:bg-foreground/5 border border-transparent",
      filled:
        "bg-transparent text-foreground border border-foreground/40 hover:bg-foreground hover:text-background hover:border-foreground transition-[background-color,border-color,color] duration-300 ease-out",
      // Consumes the section-scoped --local-accent so the same button renders
      // the active section's color world. Threshold/conversion moments only.
      accent:
        "bg-local-accent text-local-accent-fg border border-transparent hover:opacity-90",
    };

    const sizes: Record<ButtonSize, string> = {
      default: "min-h-12 min-w-12 px-6 py-2.5 text-sm",
      lg: "min-h-12 min-w-12 px-8 py-3.5 text-base",
    };

    const sharedClassName = [
      "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium",
      "transition-[background-color,border-color,color,box-shadow] duration-300 ease-out will-change-transform",
      "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      variants[variant],
      sizes[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const sharedStyle: React.CSSProperties = {
      transition: `background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out, box-shadow 300ms ease-out`,
    };

    const interactionHandlers = {
      onClick: isLoading ? undefined : handleClick,
    };

    const rippleNodes =
      !prefersReducedMotion &&
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
      ));

    // asChild: render the consumer's element (e.g. <Link>) as the interactive
    // root so we never produce invalid <button><a> nesting. The magnetic
    // handlers, styles and ripples are merged/composed onto that element.
    if (asChild) {
      return (
        <Slot
          ref={mergedRef as React.Ref<HTMLElement>}
          {...interactionHandlers}
          aria-busy={isLoading || undefined}
          className={sharedClassName}
          style={sharedStyle}
          data-cursor-pointer
          {...props}
        >
          <Slottable>{children}</Slottable>
          {rippleNodes}
        </Slot>
      );
    }

    return (
      <button
        ref={mergedRef}
        {...interactionHandlers}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={sharedClassName}
        style={sharedStyle}
        data-cursor-pointer
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading && (
            <svg
              className="animate-spin h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {children}
        </span>
        {rippleNodes}
      </button>
    );
  },
);

MagneticButton.displayName = "MagneticButton";
