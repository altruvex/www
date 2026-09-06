"use client";

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

  // Motion hooks listen on an imperative bus rather than this context, so
  // flipping the flag doesn't re-render every animated element on the page.
  useEffect(() => {
    if (isInitialLoadComplete) markMotionReady();
  }, [isInitialLoadComplete]);

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
