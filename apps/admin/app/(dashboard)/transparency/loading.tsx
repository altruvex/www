import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function TransparencyLoading() {
  return <ListPageSkeleton tiles={4} filters rows={10} cols={6} actions={0} />;
}
