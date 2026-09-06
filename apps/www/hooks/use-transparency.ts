import { useCallback, useState } from "react";
import {
  calculateEstimate,
  resolveTierToken,
  TIERS,
  type BrandIdentityId,
  type ComplexityId,
  type ContentReadinessId,
  type EstimateResult,
  type ServiceId,
  type TimelineId,
} from "@repo/pricing-schema";

export type ProjectType = ServiceId | null;
export type Complexity = ComplexityId | null;
export type Timeline = TimelineId | null;
export type BrandIdentity = BrandIdentityId | null;
export type ContentReadiness = ContentReadinessId | null;

/**
 * The five inputs `calculateEstimate` actually consumes — no more, no less.
 *
 * This hook previously carried an eight-step wizard (`step`, `nextStep`,
 * `prevStep`, `canProceed`, `TOTAL_STEPS = 8`) plus `budget` and
 * `deadlineUrgency`. None of it was reachable: the estimator drives its own
 * question list, and neither `budget` nor `deadlineUrgency` was ever passed to
 * the pricing engine or to the lead API. Asking a visitor for their budget and
 * then pricing them anyway is the exact suspicion this page exists to remove,
 * so the dead state is gone rather than left lying around to be re-wired.
 */
interface TransparencyState {
  brandIdentity: BrandIdentity;
  complexity: Complexity;
  contentReadiness: ContentReadiness;
  projectType: ProjectType;
  timeline: Timeline;
}

interface UseTransparencyOptions {
  initialTier?: string | null;
  initialProjectType?: ProjectType;
}

/**
 * Deep links from /pricing land here with a tier already chosen.
 *
 * The band is read off the tier's own schema entry rather than a second map,
 * so a card and the estimator it links to cannot disagree about which cell the
 * visitor was promised.
 */
function complexityForTierToken(token: string): NonNullable<Complexity> | null {
  const tierId = resolveTierToken(token);
  return tierId === null ? null : TIERS[tierId].complexityId;
}

export function useTransparency({
  initialTier = null,
  initialProjectType = null,
}: UseTransparencyOptions = {}) {
  const presetComplexity =
    initialTier !== null ? complexityForTierToken(initialTier) : null;

  const createInitialState = useCallback(
    (): TransparencyState => ({
      brandIdentity: null,
      complexity: presetComplexity,
      contentReadiness: null,
      projectType: initialProjectType,
      timeline: null,
    }),
    [presetComplexity, initialProjectType],
  );

  const [state, setState] = useState<TransparencyState>(createInitialState);

  const setBrandIdentity = useCallback((v: BrandIdentity) => {
    setState((prev) => ({ ...prev, brandIdentity: v }));
  }, []);
  const setComplexity = useCallback((v: Complexity) => {
    setState((prev) => ({ ...prev, complexity: v }));
  }, []);
  const setContentReadiness = useCallback((v: ContentReadiness) => {
    setState((prev) => ({ ...prev, contentReadiness: v }));
  }, []);
  const setProjectType = useCallback((v: ProjectType) => {
    setState((prev) => ({ ...prev, projectType: v }));
  }, []);
  const setTimeline = useCallback((v: Timeline) => {
    setState((prev) => ({ ...prev, timeline: v }));
  }, []);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, [createInitialState]);

  /**
   * The estimate needs only projectType + complexity; brand, content and
   * timeline are refiners that stay neutral until answered. That is what lets
   * the readout show a real range before every question is done, instead of
   * withholding the number until the end.
   */
  const getEstimate = useCallback((): EstimateResult | null => {
    if (!state.projectType || !state.complexity) return null;

    return calculateEstimate({
      serviceId: state.projectType,
      complexityId: state.complexity,
      timeline: state.timeline ?? "standard",
      brandIdentity: state.brandIdentity,
      contentReadiness: state.contentReadiness,
    });
  }, [state]);

  return {
    brandIdentity: state.brandIdentity,
    complexity: state.complexity,
    contentReadiness: state.contentReadiness,
    projectType: state.projectType,
    timeline: state.timeline,
    setBrandIdentity,
    setComplexity,
    setContentReadiness,
    setProjectType,
    setTimeline,
    reset,
    getEstimate,
  };
}
