import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function IncidentsLoading() {
  return <ListPageSkeleton tiles={4} filters rows={8} cols={3} actions={1} />;
}
