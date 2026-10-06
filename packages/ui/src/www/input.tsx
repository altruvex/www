"use client";

import type * as React from "react";
import {
  Input as BaseInput,
  SelectField as BaseSelectField,
  Textarea as BaseTextarea,
} from "../components/forms/input";

/*
 * The site dialect is a skin, not a fork: the same components with `variant="line"` as the
 * default. A caller can still pass `variant="box"`.
 */

function Input(props: React.ComponentProps<typeof BaseInput>) {
  return <BaseInput variant="line" {...props} />;
}

function Textarea(props: React.ComponentProps<typeof BaseTextarea>) {
  return <BaseTextarea variant="line" {...props} />;
}

function SelectField(props: React.ComponentProps<typeof BaseSelectField>) {
  return <BaseSelectField variant="line" {...props} />;
}

export { Input, SelectField, Textarea };
