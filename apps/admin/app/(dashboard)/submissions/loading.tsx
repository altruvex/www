import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function SubmissionsLoading() {
  return <ListPageSkeleton tiles={4} filters rows={10} cols={5} actions={0} />;
}
