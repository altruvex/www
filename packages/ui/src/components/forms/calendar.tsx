"use client";

import { Button, buttonVariants } from "../primitives/button";
import { cn } from "../../lib/utils";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import * as React from "react";
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months,
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) rounded-ctl-sm aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) rounded-ctl-sm aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-2",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative h-8 rounded-ctl-sm border border-border bg-background transition-colors duration-[var(--duration-state)] ease-[var(--ease-standard)] hover:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring/25",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "opacity-0 absolute inset-0 w-full cursor-pointer",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "h-8 ps-2 pe-1 text-sm font-medium leading-none select-none flex items-center gap-1 [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground size-(--cell-size) font-medium text-[0.75rem] select-none flex items-center justify-center",
          defaultClassNames.weekday,
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "p-0 size-(--cell-size) text-center text-sm relative flex items-center justify-center",
          defaultClassNames.day,
        ),
        day_button: cn(
          "size-(--cell-size) p-0 font-normal tabular-nums aria-selected:opacity-100 rounded-ctl-sm transition-colors duration-[var(--duration-state)] ease-[var(--ease-standard)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          defaultClassNames.day_button,
        ),
        range_start: cn(
          "day-range-start rounded-s-ctl-sm",
          defaultClassNames.range_start,
        ),
        range_end: cn("day-range-end rounded-e-ctl-sm", defaultClassNames.range_end),
        selected: cn(
          "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
          defaultClassNames.selected,
        ),
        today: cn(
          "rounded-ctl-sm ring-1 ring-inset ring-foreground/45",
          defaultClassNames.today,
        ),
        outside: cn(
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        range_middle: cn(
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
          defaultClassNames.range_middle,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4", chevronClassName)}
                {...chevronProps}
              />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", chevronClassName)}
                {...chevronProps}
              />
            );
          }
          return (
            <ChevronDownIcon
              className={cn("size-4", chevronClassName)}
              {...chevronProps}
            />
          );
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  return (
    <DayButton
      day={day}
      modifiers={modifiers}
      className={cn(
        modifiers.selected &&
          "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
        modifiers.today && !modifiers.selected && "bg-muted text-foreground font-semibold",
      )}
      {...props}
    />
  );
}

export { Calendar };
