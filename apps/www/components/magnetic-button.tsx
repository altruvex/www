"use client";

import { motion, useMagnetic, usePress } from "@/lib/motion";
import { Slot, Slottable } from "@radix-ui/react-slot";
import React, {
  forwardRef,
  useCallback,
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

/**
 * The site's primary CTA. Communicated state: "this is the action that matters
 * here — it responds to you before you commit." Magnetic pull + tactile press +
 * click ripple, all owned by GSAP via useMagnetic/usePress (single motion
 * runtime — no parallel rAF/CSS transform path). Both hooks self-disable under
 * reduced motion / coarse pointers, and usePress mirrors Enter/Space so
 * keyboard users get the same tactile feedback.
 */
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
        "bg-brand text-brand-foreground hover:bg-brand-hover",
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

    const sizes: Record<ButtonSize, string> = {
      default: "min-h-12 min-w-12 px-6 py-2.5 text-sm",
      lg: "min-h-12 min-w-12 px-8 py-3.5 text-base",
    };

    // Transform is GSAP-owned (useMagnetic/usePress) — it must NOT appear in
    // the CSS transition list or the two systems fight over the same property.
    const sharedClassName = [
      "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium",
      "transition-[background-color,border-color,color,box-shadow,opacity] duration-300 ease-out will-change-transform",
      "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      variants[variant],
      sizes[size],
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
    // refs, styles and ripples are merged/composed onto that element.
    if (asChild) {
      return (
        <Slot
          ref={mergedRef as React.Ref<HTMLElement>}
          onClick={isLoading ? undefined : (handleClick as React.MouseEventHandler)}
          aria-busy={isLoading || undefined}
          className={sharedClassName}
          data-cursor-pointer
          data-magnetic
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
        onClick={isLoading ? undefined : handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={sharedClassName}
        data-cursor-pointer
        data-magnetic
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
