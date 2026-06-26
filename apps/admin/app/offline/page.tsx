"use client";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    if (navigator.onLine) {
      router.refresh();
    } else {
      alert("Still offline. Please check your connection.");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background">
      <Container>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-8 relative">
            <div
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center",
                "bg-linear-to-br from-muted to-muted/50",
                "border border-border",
              )}
            >
              <WifiOff className="w-16 h-16 text-muted-foreground" />
            </div>
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-20"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
              }}
            />
          </div>
          <h1 className="mb-4 font-sans text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground">
            You&apos;re Offline
          </h1>

          <p className="mb-8 max-w-md text-lg text-muted-foreground">
            It looks like you&apos;ve lost your internet connection. Check your
            network and try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              variant="default"
              onClick={handleRetry}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <p className="text-sm text-muted-foreground font-mono">
              Network Status: Offline
            </p>
          </div>
        </div>
      </Container>

      <div className="absolute top-20 left-10 w-32 h-32 rounded-full blur-3xl opacity-10 bg-primary animate-pulse" />
      <div
        className="absolute bottom-20 right-10 w-40 h-40 rounded-full blur-3xl opacity-10 bg-accent animate-pulse"
        style={{ animationDelay: "1s" }}
      />
    </div>
  );
}
