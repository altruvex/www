import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/os/empty-state";
import { Button } from "@repo/ui";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <EmptyState
        icon={FileQuestion}
        title="That record does not exist"
        body="It was deleted, the link points at an id from another environment, or this area is outside your role — finance screens are hidden from roles that do not handle money."
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/clients">
                Browse clients
              </Link>
            </Button>
            <Button asChild variant="brand">
              <Link href="/">
                Dashboard
              </Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
