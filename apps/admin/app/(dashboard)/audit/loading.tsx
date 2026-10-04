import { Skeleton, TableSkeleton, TilesSkeleton } from "@repo/ui";

export default function AuditLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <TilesSkeleton />
      <Skeleton className="h-28 w-full rounded-md" />
      <TableSkeleton rows={10} cols={3} />
    </div>
  );
}
