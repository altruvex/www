"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useLocale } from "next-intl";
import { createContext, useContext } from "react";

import { cn } from "@/lib/utils/utils";

type LocaleType = "ar" | "en" | string;

const ScrollAreaLocaleContext = createContext<LocaleType>("en");
const useScrollAreaLocale = () => useContext(ScrollAreaLocaleContext);

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> {
  viewportHeight?: string | number;
  autoHide?: boolean;
  scrollbarSize?: number;
  scrollbarColor?: string;
  scrollbarRadius?: string | number;
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      viewportHeight = "100%",
      autoHide = true,
      scrollbarSize = 10,
      scrollbarColor,
      scrollbarRadius = "9999px",
      ...props
    },
    ref,
  ) => {
    const locale = useLocale();

    return (
      <ScrollAreaLocaleContext.Provider value={locale}>
        <ScrollAreaPrimitive.Root
          ref={ref}
          dir={locale === "ar" ? "rtl" : "ltr"}
          className={cn("relative overflow-hidden", className)}
          {...props}
        >
          <ScrollAreaPrimitive.Viewport
            className="h-full w-full rounded-[inherit]"
            style={{ height: viewportHeight }}
          >
            {children}
          </ScrollAreaPrimitive.Viewport>
          <ScrollBar
            orientation="vertical"
            autoHide={autoHide}
            size={scrollbarSize}
            color={scrollbarColor}
            radius={scrollbarRadius}
          />
          <ScrollBar
            orientation="horizontal"
            autoHide={autoHide}
            size={scrollbarSize}
            color={scrollbarColor}
            radius={scrollbarRadius}
          />
          <ScrollAreaPrimitive.Corner className="bg-muted" />
        </ScrollAreaPrimitive.Root>
      </ScrollAreaLocaleContext.Provider>
    );
  },
);
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

interface ScrollBarProps extends React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.ScrollAreaScrollbar
> {
  autoHide?: boolean;
  size?: number;
  color?: string;
  radius?: string | number;
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(
  (
    {
      className,
      orientation = "vertical",
      autoHide = true,
      size = 10,
      color,
      radius = "9999px",
      ...props
    },
    ref,
  ) => {
    const locale = useScrollAreaLocale();
    const isRTL = locale === "ar";
    const isVertical = orientation === "vertical";
    const thumbColor = color || "rgba(155, 155, 155, 0.5)";

    return (
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        ref={ref}
        orientation={orientation}
        data-auto-hide={autoHide ? "true" : "false"}
        className={cn(
          "flex touch-none select-none transition-all duration-150 ease-out",
          autoHide &&
            "opacity-0 hover:opacity-100 data-[state=visible]:opacity-100",
          isVertical
            ? [
                "h-full w-2.5 p-[1px] hover:w-3",
                isRTL
                  ? "border-r border-r-transparent"
                  : "border-l border-l-transparent",
              ]
            : "w-full h-2.5 border-t border-t-transparent p-[1px] hover:h-3",
          className,
        )}
        style={isVertical ? { width: size } : { height: size }}
        {...props}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb
          className={cn(
            "relative flex-1 transition-colors duration-150 ease-out rounded-full",
            "bg-border hover:bg-border/80",
          )}
          style={{
            backgroundColor: thumbColor,
            borderRadius: radius,
          }}
        />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
  },
);
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
