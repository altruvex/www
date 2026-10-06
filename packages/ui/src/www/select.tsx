"use client";

import type * as React from "react";
import { SelectTrigger as BaseSelectTrigger } from "../components/forms/select";

/*
 * The site's Select is the one Select with the underline trigger as its default; the menu
 * itself is the system menu surface (E7), the same in every app.
 */

function SelectTrigger(props: React.ComponentProps<typeof BaseSelectTrigger>) {
  return <BaseSelectTrigger variant="line" {...props} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectValue,
} from "../components/forms/select";
export { SelectTrigger };
