"use client";

import { usePathname } from "next/navigation";
import { ListPageSkeleton, OverviewSkeleton } from "@/components/os/page-skeleton";

export default function DashboardLoading() {
  const pathname = usePathname();
  return pathname === "/" ? <OverviewSkeleton /> : <ListPageSkeleton />;
}
