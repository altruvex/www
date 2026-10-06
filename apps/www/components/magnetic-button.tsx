"use client";

import { motion, useMagnetic, usePress } from "@/lib/motion";
import { Slot } from "@radix-ui/react-slot";
import { LoadingIcon } from "@repo/ui";
import {
  magneticButtonRadii as radii,
  magneticButtonSizes as sizes,
  magneticButtonVariants as variants,
  type MagneticButtonSize,
  type MagneticButtonVariant,
} from "@repo/ui/www";
import React, {
  forwardRef,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";

type ButtonVariant = MagneticButtonVariant;
type ButtonSize = MagneticButtonSize;

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
  hapticEnabled?: boolean;
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

const HAPTIC_TAP_MS = 10;

// iOS Safari has no navigator.vibrate. Since 17.4 it fires a system haptic when
// a `switch` checkbox is toggled, so a hidden one is clicked inside the tap.
let iosHapticLabel: HTMLLabelElement | null = null;

function iosHaptic() {
  if (!iosHapticLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "ios-haptic-switch";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    label.append(input);
    document.body.append(label);
    iosHapticLabel = label;
  }
  iosHapticLabel.click();
}

function tapHaptic() {
  if (typeof navigator === "undefined") return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(HAPTIC_TAP_MS);
    else iosHaptic();
  } catch {
    // haptics can be blocked by policy; a tap must never fail on it
  }
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
      hapticEnabled = true,
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
      if (hapticEnabled && !prefersReducedMotion) tapHaptic();
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

    if (asChild && React.isValidElement(children)) {
      return (
        <span className="relative inline-flex">
          <Slot
            ref={mergedRef as React.Ref<HTMLElement>}
            onClick={
              isLoading ? undefined : (handleClick as React.MouseEventHandler)
            }
            aria-busy={isLoading || undefined}
            className={sharedClassName}
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
