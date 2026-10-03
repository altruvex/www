"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { markSubmissionViewed } from "../actions";

/**
 * Renders nothing. Stamps "first opened" once, from the browser, because a
 * server render of the detail page must not write. Only mounted while the
 * record has no first-opened time, so it cannot loop.
 */
export function ViewedMarker({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void markSubmissionViewed(submissionId).then((result) => {
      if (result.ok) router.refresh();
    });
  }, [submissionId, router]);
  return null;
}
