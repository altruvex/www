"use client";

import type { ComponentProps } from "react";
import { ThemeToggle } from "../base/theme-toggle-base";

export function ThemeChanger(props: ComponentProps<typeof ThemeToggle>) {
  return <ThemeToggle {...props} />;
}
