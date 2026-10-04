import { ListPageSkeleton } from "@/components/os/page-skeleton";

export default function PipelineLoading() {
  return (
    <ListPageSkeleton tiles={4} filters={false} rows={6} cols={6} actions={0} />
  );
}
