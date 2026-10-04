import { useCallback, useState } from "react";
import {
  calculateEstimate,
  DEFAULT_PRICING,
  SCOPE_NOTE_IDS,
  type BrandIdentityId,
  type ComplexityId,
  type ContentReadinessId,
  type EstimateResult,
  type ResolvedPricing,
  type ScopeNoteId,
  type ServiceId,
  type TimelineId,
} from "@repo/pricing-schema";

export type ProjectType = ServiceId | null;
export type Complexity = ComplexityId | null;
export type Timeline = TimelineId | null;
export type BrandIdentity = BrandIdentityId | null;
export type ContentReadiness = ContentReadinessId | null;

interface TransparencyState {
  brandIdentity: BrandIdentity;
  complexity: Complexity;
  contentReadiness: ContentReadiness;
  projectType: ProjectType;
  timeline: Timeline;
  scopeNotes: readonly ScopeNoteId[];
}

interface UseTransparencyOptions {
  initialProjectType?: ProjectType;
  pricing?: ResolvedPricing;
}

export function useTransparency({
  initialProjectType = null,
  pricing = DEFAULT_PRICING,
}: UseTransparencyOptions = {}) {
  const createInitialState = useCallback(
    (): TransparencyState => ({
      brandIdentity: null,
      complexity: null,
      contentReadiness: null,
      projectType: initialProjectType,
      timeline: null,
      scopeNotes: [],
    }),
    [initialProjectType],
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
  const toggleScopeNote = useCallback((id: ScopeNoteId) => {
    setState((prev) => {
      const on = prev.scopeNotes.includes(id);
      return {
        ...prev,
        scopeNotes: SCOPE_NOTE_IDS.filter((n) =>
          n === id ? !on : prev.scopeNotes.includes(n),
        ),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, [createInitialState]);

  const getEstimate = useCallback((): EstimateResult | null => {
    if (!state.projectType || !state.complexity) return null;

    return calculateEstimate(
      {
        serviceId: state.projectType,
        complexityId: state.complexity,
        timeline: state.timeline ?? "standard",
        brandIdentity: state.brandIdentity,
        contentReadiness: state.contentReadiness,
      },
      pricing,
    );
  }, [pricing, state]);

  return {
    brandIdentity: state.brandIdentity,
    complexity: state.complexity,
    contentReadiness: state.contentReadiness,
    projectType: state.projectType,
    timeline: state.timeline,
    scopeNotes: state.scopeNotes,
    setBrandIdentity,
    setComplexity,
    setContentReadiness,
    setProjectType,
    setTimeline,
    toggleScopeNote,
    reset,
    getEstimate,
  };
}
