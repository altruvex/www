
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { SectionSkeleton } from "@/components/shared/section-skeleton";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ProblemSection = dynamic(
  () =>
    import("@/components/sections/problem-section").then(
      (mod) => mod.ProblemSection,
    ),
  { loading: () => <SectionSkeleton /> },
);
const OwnershipStackSection = dynamic(
  () =>
    import("@/components/sections/ownership-stack-section").then(
      (mod) => mod.OwnershipStackSection,
    ),
  { loading: () => <SectionSkeleton /> },
);
const SceneInversionWrapper = dynamic(
  () =>
    import("@/components/scene-inversion-wrapper").then(
      (mod) => mod.SceneInversionWrapper,
    ),
  { loading: () => null },
);
const CtaSection = dynamic(
  () =>
    import("@/components/sections/cta-section").then((mod) => mod.CtaSection),
  { loading: () => <SectionSkeleton /> },
);
const TrustSection = dynamic(
  () =>
    import("@/components/sections/trust-section").then(
      (mod) => mod.TrustSection,
    ),
  { loading: () => <SectionSkeleton /> },
);
const WorkSection = dynamic(
  () =>
    import("@/components/sections/work-section").then((mod) => mod.WorkSection),
  { loading: () => <SectionSkeleton /> },
);
const QuoteArtifactSection = dynamic(
  () =>
    import("@/components/sections/quote-artifact-section").then(
      (mod) => mod.QuoteArtifactSection,
    ),
  { loading: () => <SectionSkeleton /> },
);
/**
 * `transparency` is the server-rendered "Transparent by design" section: it
 * reads the resolved (override-aware) pricing, so page.tsx renders it and
 * hands it in. `paymentSplit` is the resolved payment schedule's percentages,
 * in milestone order, which the quote artifact draws its bar from.
 * `scopeFigure` is the worked example's estimate range, which the quote
 * artifact's first clause repeats.
 */
export function HomeClient({
  transparency,
  paymentSplit,
  scopeFigure,
}: {
  transparency: ReactNode;
  paymentSplit: readonly number[];
  scopeFigure: string;
}) {
  return (
    <>
      <ErrorBoundary>
        <ProblemSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <OwnershipStackSection />
      </ErrorBoundary>
      <SceneInversionWrapper />
      <ErrorBoundary>
        <WorkSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <TrustSection />
      </ErrorBoundary>
      <ErrorBoundary>{transparency}</ErrorBoundary>
      <ErrorBoundary>
        <CtaSection />
      </ErrorBoundary>
    </>
  );
}