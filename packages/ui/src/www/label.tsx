"use client";

import type * as React from "react";
import { Label as BaseLabel } from "../components/forms/label";

/** The site's label is the eyebrow variant of the one Label. */
function Label(props: React.ComponentProps<typeof BaseLabel>) {
  return <BaseLabel variant="eyebrow" {...props} />;
}

export { Label };
