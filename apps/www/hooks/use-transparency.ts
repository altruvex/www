import { useCallback, useState } from "react";
import {
  calculateEstimate,
  type BrandIdentity as PricingBrandIdentity,
  type Complexity as PricingComplexity,
  type ContentReadiness as PricingContentReadiness,
  type EstimateResult,
  type ProjectType as PricingProjectType,
  type Timeline as PricingTimeline,
} from "@repo/pricing";

export type ProjectType = PricingProjectType | null;
export type Complexity = PricingComplexity | null;
export type Timeline = PricingTimeline | null;
export type BrandIdentity = PricingBrandIdentity | null;
export type ContentReadiness = PricingContentReadiness | null;

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

/** Deep links from /pricing land here with a tier already chosen. */
const TIER_COMPLEXITY: Record<string, NonNullable<Complexity>> = {
  essential: "basic",
  small: "basic",
  professional: "standard",
  medium: "standard",
  commerce: "standard",
  flagship: "standard",
  large: "premium",
};

export function useTransparency({
  initialTier = null,
  initialProjectType = null,
}: UseTransparencyOptions = {}) {
  const presetComplexity =
    initialTier !== null ? (TIER_COMPLEXITY[initialTier] ?? null) : null;

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
      projectType: state.projectType,
      complexity: state.complexity,
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
