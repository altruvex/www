import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function Loading() {
  return <ListPageSkeleton filters={false} rows={6} cols={7} actions={2} />;
}
