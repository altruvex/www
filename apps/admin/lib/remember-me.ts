/**
 * The "remember me" preference, as an external store.
 *
 * Three ways to read a browser-only value into React, and only one of them is
 * right here:
 *
 *  - `useState` + an effect that calls `setState`: renders the default, then
 *    flips. React 19 flags it, and the checkbox visibly changes after mount.
 *  - `useState(() => localStorage…)`: the server renders the default and the
 *    client renders the stored value, so hydration mismatches on the very
 *    attribute the checkbox is showing.
 *  - `useSyncExternalStore`: the server snapshot is used through hydration and
 *    the stored value is picked up immediately after, which is what this is.
 *
 * The snapshot is cached because `getSnapshot` must return a stable value —
 * reading `localStorage` on every call would hand React a new answer each
 * render only when the underlying string changes, and caching makes that
 * explicit rather than accidental.
 */

const KEY = "altruvex_remember_me";
const DEFAULT = true;

let cached: boolean | null = null;
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === null ? DEFAULT : saved === "true";
  } catch (err) {
    // Private windows and blocked site data both throw here. The preference is
    // a convenience; losing it is not worth a broken sign-in page.
    if (process.env.NODE_ENV !== "production") {
      console.warn("Could not read the remember-me preference:", err);
    }
    return DEFAULT;
  }
}

export function subscribeRememberMe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab changing the preference is the same event as this one doing it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cached = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getRememberMe(): boolean {
  if (cached === null) cached = readStored();
  return cached;
}

/** Used during server rendering and through hydration. */
export function getServerRememberMe(): boolean {
  return DEFAULT;
}

export function setRememberMe(value: boolean): void {
  cached = value;
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Could not store the remember-me preference:", err);
    }
  }
  for (const listener of listeners) listener();
}
