import { track } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null>;

// The funnel's stable event names and the props each may carry. Small
// primitives only: never a name, phone number or email.
type EventMap = {
  estimator_started: { locale?: string };
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
