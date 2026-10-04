import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function NotificationsLoading() {
  return <ListPageSkeleton filters rows={10} cols={3} />;
}
