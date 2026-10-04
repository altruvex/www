const KEY = "altruvex_remember_me";
const DEFAULT = true;

let cached: boolean | null = null;
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === null ? DEFAULT : saved === "true";
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Could not read the remember-me preference:", err);
    }
    return DEFAULT;
  }
}

export function subscribeRememberMe(onChange: () => void): () => void {
  listeners.add(onChange);
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
