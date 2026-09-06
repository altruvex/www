import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/os/empty-state";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <EmptyState
        icon={FileQuestion}
        title="That record does not exist"
        body="It was either deleted, or the link points at an id from another environment. Nothing here is hidden by permissions — if you can reach this application, you can see every record in it."
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
