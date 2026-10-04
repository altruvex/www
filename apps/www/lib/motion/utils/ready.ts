let ready = false;
const subscribers = new Set<() => void>();

export function markMotionReady(): void {
  if (ready) return;
  ready = true;
  for (const cb of subscribers) cb();
  subscribers.clear();
}

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

export const INITIAL_LOAD_KEY = "Altruvex_initial_load_complete";

export const WELCOMED_KEY = "Altruvex_welcomed";
