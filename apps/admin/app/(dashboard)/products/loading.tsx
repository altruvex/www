import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function ProductsLoading() {
  return <ListPageSkeleton tiles={4} filters rows={8} cols={5} actions={2} />;
}
