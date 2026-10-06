import { useSyncExternalStore } from "react";

/*
 * The brand app's light/dark switch. The head script in app/layout.tsx applies the stored
 * choice before paint; this module reads and changes it afterwards, so the shell toggle and
 * the board's Theme tile stay one switch.
 */

const EVENT = "brand-theme";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function read(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function setDark(next: boolean): void {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(EVENT, next ? "dark" : "light");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useDark(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
