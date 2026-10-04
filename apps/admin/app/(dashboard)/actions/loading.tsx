import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function ActionsLoading() {
  return <ListPageSkeleton tiles={3} filters rows={8} />;
}
