"use client";

import { LOADER_RELEASE_EVENT } from "@/lib/motion/utils/loader";
import { markMotionReady } from "@/lib/motion/utils/ready";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isInitialLoadComplete: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({
  children,
  isBot = false,
}: {
  children: ReactNode;
  isBot?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(!isBot);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(isBot);

  useEffect(() => {
    if (isInitialLoadComplete) markMotionReady();
  }, [isInitialLoadComplete]);

  useEffect(() => {
    if (isBot) return;
    const html = document.documentElement;
    const release = () => setIsLoading(false);
    window.addEventListener(LOADER_RELEASE_EVENT, release, { once: true });
    if (
      html.getAttribute("data-initial-load") === "complete" ||
      !html.hasAttribute("data-loader")
    ) {
      release();
    }
    return () => window.removeEventListener(LOADER_RELEASE_EVENT, release);
  }, [isBot]);

  useEffect(() => {
    if (!isLoading && !isInitialLoadComplete) {
      const timer = setTimeout(() => {
        setIsInitialLoadComplete(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isInitialLoadComplete]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setIsLoading,
        isInitialLoadComplete,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
