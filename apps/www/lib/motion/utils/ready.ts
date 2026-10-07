let ready = false;
const subscribers = new Set<() => void>();

// Every reveal/text/batch/scene hook on the page subscribes here, so releasing them all in
// one synchronous loop built every ScrollTrigger in a single long task (393ms on GTmetrix,
// 2026-10-07). The queue is drained in slices instead, yielding to the browser between
// them; subscribers still run in mount order (roughly top of the page first).
const SLICE_MS = 8;

function yieldToMain(): Promise<void> {
  const scheduler = (
    globalThis as { scheduler?: { yield?: () => Promise<void> } }
  ).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function drain(): Promise<void> {
  let sliceStart = performance.now();
  for (const cb of subscribers) {
    // Deleted before running, so an unsubscribe that lands mid-drain is honoured.
    subscribers.delete(cb);
    cb();
    if (performance.now() - sliceStart > SLICE_MS && subscribers.size > 0) {
      await yieldToMain();
      sliceStart = performance.now();
    }
  }
}

export function markMotionReady(): void {
  if (ready) return;
  ready = true;
  void drain();
}

export function whenMotionReady(cb: () => void): () => void {
  if (ready && !subscribers.size) {
    cb();
    return () => undefined;
  }
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export const INITIAL_LOAD_KEY = "Altruvex_initial_load_complete";

export const WELCOMED_KEY = "Altruvex_welcomed";
