import { Skeleton, TilesSkeleton, TableSkeleton } from "@repo/ui";

/**
 * The loading state mirrors the SHAPE of a typical page — a header, a tile row,
 * a table — rather than a spinner. A skeleton that matches the layout stops the
 * page from jumping when the data lands.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-80" />
      </div>
      <TilesSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
