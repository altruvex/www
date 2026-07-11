
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { SectionSkeleton } from "@/components/shared/section-skeleton";
import dynamic from "next/dynamic";

const ProblemSection = dynamic(
  () =>
    import("@/components/sections/problem-section").then(
      (mod) => mod.ProblemSection,
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
const TransparencyEstimator = dynamic(
  () =>
    import("@/components/sections/transparency-estimator").then(
      (mod) => mod.TransparencyEstimator,
    ),
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
const PricingSignalSection = dynamic(
  () =>
    import("@/components/sections/pricing-signal-section").then(
      (mod) => mod.PricingSignalSection,
    ),
  { loading: () => <SectionSkeleton /> },
);
export function HomeClient() {
  return (
    <>
      <ErrorBoundary>
        <ProblemSection />
      </ErrorBoundary>
      <SceneInversionWrapper />
      <ErrorBoundary>
        <WorkSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <TrustSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <TransparencyEstimator />
      </ErrorBoundary>
      <ErrorBoundary>
        <PricingSignalSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <CtaSection />
      </ErrorBoundary>
    </>
  );
}