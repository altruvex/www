"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "../../lib/utils";

const labelVariants = {
  /** The tool's field label. */
  field: "text-sm font-medium leading-none text-foreground",
  /** The site's: an eyebrow above an underline field. `.eyebrow` is defined by the www styles. */
  eyebrow: "flex items-center gap-2 eyebrow text-xs text-primary/60",
} as const;

function Label({
  className,
  variant = "field",
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { variant?: keyof typeof labelVariants }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      data-variant={variant}
      className={cn(
        labelVariants[variant],
        "select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
