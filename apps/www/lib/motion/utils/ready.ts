/**
 * Imperative "motion may start" signal.
 *
 * Scroll hooks used to subscribe to the LoadingProvider React context to know
 * when the initial loader had finished. That meant every hook instance on the
 * page (a few hundred on a long route) re-rendered its host component once
 * when the flag flipped — React work whose only purpose was to start a GSAP
 * tween. This bus delivers the same signal without touching React: the
 * provider calls `markMotionReady()`, hooks call `whenMotionReady(cb)` inside
 * their layout effect and get the callback either immediately (already ready)
 * or once, later.
 */
let ready = false;
const subscribers = new Set<() => void>();

export function markMotionReady(): void {
  if (ready) return;
  ready = true;
  for (const cb of subscribers) cb();
  subscribers.clear();
}

/** Returns an unsubscribe; safe to call in effect cleanup after firing. */
export function whenMotionReady(cb: () => void): () => void {
  if (ready) {
    cb();
    return () => undefined;
  }
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
