"use client";

import {
  SegmentedControl as BaseSegmentedControl,
  type SegmentedControlProps,
} from "../components/forms/segmented-control";

/* The site dialect: the same control with `variant="pill"` as the default. */

function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  return <BaseSegmentedControl<T> variant="pill" {...props} />;
}

export { SegmentedControl };
