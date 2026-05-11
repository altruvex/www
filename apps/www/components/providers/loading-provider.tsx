"use client";

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
