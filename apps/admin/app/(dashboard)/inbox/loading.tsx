import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function Loading() {
  return <ListPageSkeleton tiles={4} filters rows={8} cols={4} actions={0} />;
}
