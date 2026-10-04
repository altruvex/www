import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function Loading() {
  return <ListPageSkeleton tiles={4} rows={10} cols={6} actions={1} />;
}
