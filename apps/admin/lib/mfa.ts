export function mfaRequired(): boolean {
  return process.env.ADMIN_MFA_REQUIRED === "true";
}

export const MFA_SETUP_PATH = "/security";

export const MFA_SKIP_COOKIE = "altruvex_mfa_skip";
export const MFA_SKIP_DAYS = 30;
