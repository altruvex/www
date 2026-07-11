"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let code = "";

    if (typeof children === "string") {
      code = children;
    } else if (
      React.isValidElement(children) &&
      typeof children.props === "object" &&
      children.props !== null &&
      "children" in children.props &&
      typeof children.props.children === "string"
    ) {
      code = children.props.children;
    }

    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group relative my-6">
      <button
        onClick={handleCopy}
        className={cn(
          "absolute right-4 top-4 rounded-lg border bg-background p-2",
          "opacity-0 transition-all group-hover:opacity-100",
        )}
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <pre className={cn("overflow-x-auto rounded-lg border p-4", className)}>
        {children}
      </pre>
    </div>
  );
}
