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
export function HomeClient({ transparency }: { transparency: ReactNode }) {
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