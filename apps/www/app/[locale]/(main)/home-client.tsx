import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";
import { SectionSkeleton } from "@/components/section-skeleton";

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
const TransparencySection = dynamic(
  () =>
    import("@/components/sections/transparency-section").then(
      (mod) => mod.TransparencySection,
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
const FaqSection = dynamic(
  () =>
    import("@/components/sections/faq-section").then((mod) => mod.FaqSection),
  { loading: () => <SectionSkeleton /> },
);

const HOME_FAQ_KEYS = ["07", "06", "11", "04", "08", "02"];

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
        <PricingSignalSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <TrustSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <TransparencySection />
      </ErrorBoundary>
      <ErrorBoundary>
        <FaqSection namespace="faq" questionKeys={HOME_FAQ_KEYS} />
      </ErrorBoundary>
      <ErrorBoundary>
        <CtaSection />
      </ErrorBoundary>
    </>
  );
}
