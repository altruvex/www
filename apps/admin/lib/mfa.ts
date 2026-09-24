/**
 * Whether an operator must hold a second factor.
 *
 * Optional by default (Ali, 2026-09-19): an operator who has not enrolled is
 * offered the enrolment screen and may skip it. The skip is remembered per
 * browser for MFA_SKIP_DAYS, then the offer comes back. `ADMIN_MFA_REQUIRED=true`
 * turns the offer into a gate — no skip, no dashboard until enrolled.
 */
export function mfaRequired(): boolean {
  return process.env.ADMIN_MFA_REQUIRED === "true";
}

/** The enrolment screen itself can never be behind the gate it serves. */
export const MFA_SETUP_PATH = "/security";

/** Set when an operator chooses "Skip for now" on the enrolment screen. */
export const MFA_SKIP_COOKIE = "altruvex_mfa_skip";
export const MFA_SKIP_DAYS = 30;
