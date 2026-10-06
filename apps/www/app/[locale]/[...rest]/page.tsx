import { notFound } from "next/navigation";

// Unmatched paths under a locale would otherwise fall through to Next's
// default 404; routing them here renders app/[locale]/not-found.tsx.
export default function CatchAllPage() {
  notFound();
}
