"use client";

import { motion, useMagnetic, usePress } from "@/lib/motion";
import { Slot } from "@radix-ui/react-slot";
import { LoadingIcon } from "@repo/ui";
import React, {
  forwardRef,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "filled"
  | "accent";
type ButtonSize = "sm" | "default" | "lg";

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
      animation: ripple-expand var(--motion-fast) var(--ease-default) forwards;
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
      asChild = false,
      isLoading = false,
      onClick,
      disabled,
      ...props
    },
    forwardedRef,
  ) => {
    const magneticRef = useMagnetic<HTMLButtonElement>(motion.magneticButton());
    const pressRef = usePress<HTMLButtonElement>(motion.pressButton());
    const mergedRef = useMergedRef(magneticRef, pressRef, forwardedRef);

    const prefersReducedMotion = useSyncExternalStore(
      subscribeToReducedMotion,
      getReducedMotionPreference,
      () => false,
    );

    const [ripples, setRipples] = useState<Ripple[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!prefersReducedMotion) {
        ensureRippleKeyframes();
        const rect = e.currentTarget.getBoundingClientRect();
        const rippleId = Date.now();
        setRipples((prev) => [
          ...prev,
          { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId },
        ]);
        setTimeout(
          () => setRipples((prev) => prev.filter((r) => r.id !== rippleId)),
          420,
        );
      }
      onClick?.(e);
    };

    const variants: Record<ButtonVariant, string> = {
      primary:
        "bg-brand text-brand-foreground border border-transparent hover:bg-brand-hover",
      secondary:
        "bg-transparent text-primary/85 border border-foreground/40 hover:bg-foreground/5 hover:border-foreground/60",
      ghost:
        "bg-transparent text-primary/75 hover:bg-foreground/5 border border-transparent",
      filled:
        "bg-transparent text-foreground border border-foreground/40 hover:bg-foreground hover:text-background hover:border-foreground",
      // Consumes the section-scoped --local-accent so the same button renders
      // the active section's color world. Threshold/conversion moments only.
      accent:
        "bg-local-accent text-local-accent-fg border border-transparent hover:opacity-90",
    };

    /* Both sizes step with the viewport; the floor stays at 44px+ so the
       touch target holds on the smallest screens. */
    const sizes: Record<ButtonSize, string> = {
      // Compact bars (the header). Touch devices still get the 44px floor.
      sm: "min-h-10 px-5 text-sm pointer-coarse:min-h-11",
      default:
        "min-h-11 min-w-11 px-5 py-2 text-sm sm:min-h-12 sm:min-w-12 sm:px-6 sm:py-2.5",
      lg: "min-h-12 min-w-12 px-6 py-3 text-[15px] sm:px-7 lg:min-h-14 lg:px-8 lg:py-3.5 lg:text-base",
    };

    /* Every size is a pill. The corner used to track each size's height
       through the ctl-* tokens; buttons are now fully rounded in both apps
       (the shared Button primitive does the same). Shared with the ripple
       layer, which in the asChild path sits outside the button. */
    const radii: Record<ButtonSize, string> = {
      sm: "rounded-full",
      default: "rounded-full",
      lg: "rounded-full",
    };

    const sharedClassName = [
      "relative inline-flex items-center justify-center overflow-hidden font-medium",
      "transition-[background-color,border-color,color,opacity] duration-(--motion-drawer) ease-default will-change-transform",
      "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      variants[variant],
      sizes[size],
      radii[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

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
    // root so we never produce invalid <button><a> nesting. The magnetic/press
    // refs and styles are merged onto that element. Ripples live in a wrapper
    // sibling so Slot still receives exactly one slottable child.
    if (asChild) {
      return (
        <span className="relative inline-flex">
          <Slot
            ref={mergedRef as React.Ref<HTMLElement>}
            onClick={
              isLoading ? undefined : (handleClick as React.MouseEventHandler)
            }
            aria-busy={isLoading || undefined}
            className={sharedClassName}
            data-cursor-pointer
            data-magnetic
            {...props}
          >
            {children}
          </Slot>
          {rippleNodes && (
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 overflow-hidden ${radii[size]}`}
            >
              {rippleNodes}
            </span>
          )}
        </span>
      );
    }

    return (
      <button
        ref={mergedRef}
        onClick={isLoading ? undefined : handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={sharedClassName}
        data-cursor-pointer
        data-magnetic
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading && <LoadingIcon size="md" />}
          {children}
        </span>
        {rippleNodes}
      </button>
    );
  },
);

MagneticButton.displayName = "MagneticButton";
