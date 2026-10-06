"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

import { useDirection } from "../../lib/direction";
import { cn } from "../../lib/utils";

function Accordion(props: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} dir={useDirection(props.dir)} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border-subtle last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-start justify-between gap-4 rounded-ctl-xl py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-45",
          className,
        )}
        {...props}
      >
        {children}
        <Plus className="pointer-events-none size-4.5 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-(--dur-panel)" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      forceMount
      className="group/accordion-content text-sm"
      {...props}
    >
      <div className="grid transition-[grid-template-rows,visibility] duration-(--dur-panel) ease-(--ease-standard) motion-reduce:transition-none group-data-[state=closed]/accordion-content:invisible group-data-[state=closed]/accordion-content:grid-rows-[0fr] group-data-[state=open]/accordion-content:visible group-data-[state=open]/accordion-content:grid-rows-[1fr]">
        <div className="min-h-0 overflow-hidden">
          <div className={cn("pt-0 pb-4", className)}>{children}</div>
        </div>
      </div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
