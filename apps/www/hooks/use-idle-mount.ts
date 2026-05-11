"use client";

import { useEffect, useState } from "react";

type IdleMountOptions = {
  timeout?: number;
  immediate?: boolean;
};

export function useIdleMount({
  timeout = 1500,
  immediate = false,
}: IdleMountOptions = {}) {
  const [mounted, setMounted] = useState(immediate);

  useEffect(() => {
    if (mounted) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;
    const hasIdleCallback =
      typeof window.requestIdleCallback === "function" &&
      typeof window.cancelIdleCallback === "function";

    const onIdle = () => setMounted(true);

    if (hasIdleCallback) {
      idleId = window.requestIdleCallback(onIdle, { timeout });
    } else {
      timeoutId = globalThis.setTimeout(onIdle, Math.min(timeout, 800));
    }

    return () => {
      if (idleId !== undefined && hasIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [mounted, timeout]);

  return mounted;
}
