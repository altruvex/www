import { useCallback, useState } from "react";

export type ProjectType = "website" | "webapp" | "ecommerce" | "pwa" | null;
export type Complexity = "basic" | "standard" | "premium" | null;
export type Timeline = "urgent" | "standard" | "flexible" | null;
export type BrandIdentity = "complete" | "partial" | "scratch" | null;
export type ContentReadiness = "provide" | "need-help" | "unsure" | null;
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

interface EstimateResult {
  minWeeks: number;
  maxWeeks: number;
  minPrice: number;
  maxPrice: number;
}

const TOTAL_STEPS = 8;

const ESTIMATE_ROUNDING = 5_000;

function roundEstimate(value: number): number {
  return Math.round(value / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
}

const PRICING_TABLE = {
  website: {
    basic: [35_000, 70_000],
    standard: [70_000, 140_000],
    premium: [140_000, 220_000],
  },
  webapp: {
    basic: [80_000, 150_000],
    standard: [150_000, 280_000],
    premium: [280_000, 450_000],
  },
  ecommerce: {
    basic: [55_000, 95_000],
    standard: [95_000, 180_000],
    premium: [180_000, 320_000],
  },
  pwa: {
    basic: [95_000, 175_000],
    standard: [175_000, 310_000],
    premium: [310_000, 495_000],
  },
};

const TIMELINE_TABLE = {
  website: {
    basic: [2, 4],
    standard: [4, 7],
    premium: [7, 11],
  },
  webapp: {
    basic: [5, 8],
    standard: [8, 14],
    premium: [14, 22],
  },
  ecommerce: {
    basic: [4, 6],
    standard: [6, 10],
    premium: [10, 16],
  },
  pwa: {
    basic: [6, 10],
    standard: [10, 16],
    premium: [16, 26],
  },
};

const TIMELINE_MULTIPLIERS = {
  urgent: 1.15,
  standard: 1,
  flexible: 0.95,
};

const TIMELINE_WEEK_MULTIPLIERS = {
  urgent: 0.85,
  standard: 1,
  flexible: 1.15,
};

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

    const priceRange = PRICING_TABLE[state.projectType][state.complexity];
    const timelineRange = TIMELINE_TABLE[state.projectType][state.complexity];
    const multiplier = TIMELINE_MULTIPLIERS[state.timeline];
    const weekMultiplier = TIMELINE_WEEK_MULTIPLIERS[state.timeline];

    return {
      minWeeks: Math.max(Math.round(timelineRange[0] * weekMultiplier), 1),
      maxWeeks: Math.max(Math.round(timelineRange[1] * weekMultiplier), 1),
      minPrice: roundEstimate(priceRange[0] * multiplier),
      maxPrice: roundEstimate(priceRange[1] * multiplier),
    };
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

