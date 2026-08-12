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
export type DeadlineUrgency =
  | "flexible"
  | "2months"
  | "1month"
  | "urgent"
  | null;
export type Budget = "small" | "medium" | "large" | "custom" | null;

interface TransparencyState {
  step: number;
  budget: Budget;
  brandIdentity: BrandIdentity;
  contentReadiness: ContentReadiness;
  deadlineUrgency: DeadlineUrgency;
  projectType: ProjectType;
  complexity: Complexity;
  timeline: Timeline;
}

const TOTAL_STEPS = 8;

interface UseTransparencyOptions {
  initialTier?: string | null;
  initialProjectType?: ProjectType;
}

export function useTransparency({
  initialTier = null,
  initialProjectType = null,
}: UseTransparencyOptions = {}) {
  const isPreselected = initialTier !== null;

  const preselectedBudget =
    initialTier === "essential" || initialTier === "small"
      ? "small"
      : initialTier === "professional" || initialTier === "medium"
        ? "medium"
        : initialTier === "commerce" ||
            initialTier === "flagship" ||
            initialTier === "large"
          ? "large"
          : null;

  const preselectedComplexity =
    initialTier === "essential" || initialTier === "small"
      ? "basic"
      : initialTier === "professional" || initialTier === "medium"
        ? "standard"
        : initialTier === "commerce" ||
            initialTier === "flagship" ||
            initialTier === "large"
          ? "premium"
          : null;

  const createInitialState = useCallback(
    (): TransparencyState => ({
      step: isPreselected ? 5 : 1,
      budget: preselectedBudget as Budget,
      brandIdentity: isPreselected ? "complete" : null,
      contentReadiness: isPreselected ? "provide" : null,
      deadlineUrgency: isPreselected ? "flexible" : null,
      projectType: initialProjectType,
      complexity: preselectedComplexity as Complexity,
      timeline: null,
    }),
    [
      isPreselected,
      preselectedBudget,
      preselectedComplexity,
      initialProjectType,
    ],
  );

  const [state, setState] = useState<TransparencyState>(createInitialState);

  const setBudget = useCallback((v: Budget) => {
    setState((prev) => ({ ...prev, budget: v }));
  }, []);
  const setBrandIdentity = useCallback((v: BrandIdentity) => {
    setState((prev) => ({ ...prev, brandIdentity: v }));
  }, []);
  const setContentReadiness = useCallback((v: ContentReadiness) => {
    setState((prev) => ({ ...prev, contentReadiness: v }));
  }, []);
  const setDeadlineUrgency = useCallback((v: DeadlineUrgency) => {
    setState((prev) => ({ ...prev, deadlineUrgency: v }));
  }, []);
  const setProjectType = useCallback((v: ProjectType) => {
    setState((prev) => ({ ...prev, projectType: v }));
  }, []);
  const setComplexity = useCallback((v: Complexity) => {
    setState((prev) => ({ ...prev, complexity: v }));
  }, []);
  const setTimeline = useCallback((v: Timeline) => {
    setState((prev) => ({ ...prev, timeline: v }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      let next = prev.step + 1;
      if (isPreselected && prev.step === 5) next = 7;
      return { ...prev, step: Math.min(next, TOTAL_STEPS) };
    });
  }, [isPreselected]);

  const prevStep = useCallback(() => {
    setState((prev) => {
      let back = prev.step - 1;
      if (isPreselected) {
        if (prev.step === 7) back = 5;
        if (prev.step <= 5) back = 5;
      }
      return { ...prev, step: Math.max(back, 1) };
    });
  }, [isPreselected]);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, [createInitialState]);

  const canProceed = useCallback((): boolean => {
    switch (state.step) {
      case 1:
        return state.brandIdentity !== null;
      case 2:
        return state.budget !== null;
      case 3:
        return state.contentReadiness !== null;
      case 4:
        return state.deadlineUrgency !== null;
      case 5:
        return state.projectType !== null;
      case 6:
        return state.complexity !== null;
      case 7:
        return state.timeline !== null;
      default:
        return false;
    }
  }, [state]);

  const getEstimate = useCallback((): EstimateResult | null => {
    if (!state.projectType || !state.complexity || !state.timeline) return null;

    return calculateEstimate({
      projectType: state.projectType,
      complexity: state.complexity,
      timeline: state.timeline,
      brandIdentity: state.brandIdentity,
      contentReadiness: state.contentReadiness,
    });
  }, [state]);

  return {
    step: state.step,
    budget: state.budget,
    brandIdentity: state.brandIdentity,
    contentReadiness: state.contentReadiness,
    deadlineUrgency: state.deadlineUrgency,
    projectType: state.projectType,
    complexity: state.complexity,
    timeline: state.timeline,
    setBudget,
    setBrandIdentity,
    setContentReadiness,
    setDeadlineUrgency,
    setProjectType,
    setComplexity,
    setTimeline,
    nextStep,
    prevStep,
    reset,
    canProceed,
    getEstimate,
  };
}

