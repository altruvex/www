import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function LogsLoading() {
  return <ListPageSkeleton filters rows={14} cols={3} actions={0} />;
}
