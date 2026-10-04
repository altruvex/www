import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function Loading() {
  return <ListPageSkeleton tiles={4} rows={8} cols={6} />;
}
