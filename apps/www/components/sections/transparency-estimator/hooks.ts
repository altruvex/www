"use client";
import { useLocale } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export function useStuck(offset: number) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) =>
        setStuck(
          !entry.isIntersecting && entry.boundingClientRect.top <= offset,
        ),
      { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [offset]);

  return { sentinel, stuck };
}

export function useReached() {
  const [reached, setReached] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const sentinel = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;

    if (!node) {
      setReached(false);
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;

    observer.current = new IntersectionObserver(
      ([entry]) =>
        setReached(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { threshold: 0, rootMargin: "0px 0px -35% 0px" },
    );
    observer.current.observe(node);
  }, []);

  return { sentinel, reached };
}

export function useRadioKeys(
  options: readonly string[],
  onSelect: (val: string) => void,
) {
  const locale = useLocale();
  const rtl = locale.startsWith("ar");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    const step =
      event.key === "ArrowDown" || event.key === forward
        ? 1
        : event.key === "ArrowUp" || event.key === backward
          ? -1
          : 0;
    if (!step) return;

    event.preventDefault();
    const count = options.length;
    const next = (from + step + count) % count;
    onSelect(options[next]);
    refs.current[next]?.focus();
  };

  return { refs, onKeyDown };
}