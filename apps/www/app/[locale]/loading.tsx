"use client";

import { useEffect, useState } from "react";

const messages = ["Loading content", "Preparing experience", "Almost ready"];

export default function LoadingPage() {
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <main className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-10">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] bg-foreground/80" />
          </div>
        </div>
        <p className="text-xl font-medium tracking-tight text-foreground">
          Loading
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </main>
    </div>
  );
}
