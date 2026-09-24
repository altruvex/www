"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { LoadingIcon } from "./loading-icon";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[18px]" />,
        info: <InfoIcon className="size-[18px]" />,
        warning: <TriangleAlertIcon className="size-[18px]" />,
        error: <OctagonXIcon className="size-[18px]" />,
        loading: <LoadingIcon size="md" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "liquid-glass-panel glass-highlight rounded-lg flex w-full items-start gap-3 p-4 text-popover-foreground",
          title: "text-[0.9rem] font-medium leading-snug",
          description: "text-sm leading-snug text-muted-foreground",
          icon: "mt-0.5 shrink-0",
          content: "flex flex-col gap-0.5",
          actionButton:
            "ms-auto shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton:
            "ms-auto shrink-0 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
          closeButton:
            "!liquid-glass !border-border-strong !text-foreground !start-auto !end-0 !-translate-x-1/3",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-danger",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
