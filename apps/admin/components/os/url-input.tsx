"use client";

import * as React from "react";

import { Input } from "@repo/ui";

export function UrlInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      type="url"
      onBlur={(event) => {
        const el = event.currentTarget;
        const v = el.value.trim();
        if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) el.value = `https://${v}`;
        props.onBlur?.(event);
      }}
    />
  );
}
