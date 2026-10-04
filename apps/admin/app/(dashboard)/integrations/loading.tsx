import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function Loading() {
  return <ListPageSkeleton tiles={4} filters={false} rows={6} cols={3} actions={1} />;
}
