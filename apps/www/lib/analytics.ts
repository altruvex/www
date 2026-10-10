import { track } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null>;

// The funnel's stable event names and the props each may carry. Small
// primitives only: never a name, phone number or email.
type EventMap = {
  estimator_started: { locale?: string };
  // One per estimator question, the first time it is answered. `step` is the
  // question's 0-based index in QUESTIONS (transparency-estimator/constants).
  estimator_step_complete: { step: number; locale?: string };
  estimator_completed: { locale?: string; projectType?: string; complexity?: string };
  estimator_submitted: { locale?: string; projectType?: string; complexity?: string };
  contact_started: { locale?: string };
  contact_submitted: { locale?: string };
  schedule_started: { locale?: string };
  schedule_completed: { locale?: string };
  // Optional follow-up steps: only how many questions were answered.
  qualification_completed: { locale?: string; answered?: number };
  precall_brief_completed: { locale?: string; answered?: number };
  exit_intent_shown: { locale?: string };
  exit_intent_submitted: { locale?: string; source?: string };
  audit_lead_submitted: { locale?: string; source?: string };
  cta_clicked: { ctaId: string; source?: string };
  // A registry CTA on a page: its key, the path without locale, and the typed
  // context it carried as a query string (ids only).
  contextual_cta_clicked: { key: string; page: string; context?: string };
  intent_selected: { situation: string };
  // The estimator's preliminary read: shown, then acted on.
  recommendation_viewed: { nextStep: string; projectType: string };
  recommendation_accepted: {
    nextStep: string;
    action: "consultation" | "proposal" | "send" | "whatsapp" | "pdf";
  };
};

export const trackEvent = <K extends keyof EventMap>(
  name: K,
  props?: EventMap[K],
) => {
  try {
    track(name, props as Props | undefined);
  } catch {
    // Analytics never breaks the page.
  }
};
