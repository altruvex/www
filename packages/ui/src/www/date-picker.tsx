"use client";

import type * as React from "react";
import { DatePicker as BaseDatePicker } from "../components/forms/date-picker";

/** The site's DatePicker is the one DatePicker with the underline trigger, like the site Input. */
export function DatePicker(props: React.ComponentProps<typeof BaseDatePicker>) {
  return <BaseDatePicker variant="line" {...props} />;
}
