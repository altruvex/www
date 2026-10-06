import { Container } from "@/components/shared/container";

// One viewport-anchored sweep shared by every bar (keyframes in @repo/ui tokens);
// the highlight follows the scene's own ink, and runs right-to-left in Arabic.
const bar =
  "rounded-ctl-xs bg-fixed bg-[length:300%_100%] bg-[linear-gradient(90deg,transparent_35%,color-mix(in_oklab,var(--s-high)_8%,transparent)_50%,transparent_65%)] animate-shimmer rtl:[animation-direction:reverse]";

export function SectionSkeleton() {
  return (
    <div className="min-h-[50vh] w-full">
      <Container className="pt-(--section-y-top) pb-(--section-y-bottom)">
        <div className={`mb-8 h-3 w-24 bg-s-border ${bar}`} />
        <div className={`mb-6 h-12 w-2/3 bg-s-border ${bar}`} />
        <div className="space-y-3">
          <div className={`h-4 w-full bg-s-surface ${bar}`} />
          <div className={`h-4 w-5/6 bg-s-surface ${bar}`} />
        </div>
      </Container>
    </div>
  );
}
