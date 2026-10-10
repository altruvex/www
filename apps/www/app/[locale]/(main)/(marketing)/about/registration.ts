export type BusinessRegistration = {
  commercialRegistry: string | null;
  taxId: string | null;
};

// TODO(ali): legal/business registration details. The slot on /about renders only when a value is set.
export const BUSINESS_REGISTRATION: BusinessRegistration = {
  commercialRegistry: null,
  taxId: null,
};
