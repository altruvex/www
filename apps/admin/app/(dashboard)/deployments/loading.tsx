import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function DeploymentsLoading() {
  return <ListPageSkeleton tiles={4} filters rows={10} cols={6} />;
}
