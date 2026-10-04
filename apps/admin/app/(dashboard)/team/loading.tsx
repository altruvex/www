import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function Loading() {
  return <ListPageSkeleton tiles={4} filters={false} rows={5} cols={4} actions={1} />;
}
