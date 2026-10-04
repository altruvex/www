const RULES: Record<
  string,
  { label: string; test: (digits: string) => boolean; expect: string }
> = {
  Egypt: {
    label: "Egypt tax registration number",
    expect: "9 digits",
    test: (d) => /^\d{9}$/.test(d),
  },
  "Saudi Arabia": {
    label: "Saudi VAT number",
    expect: "15 digits, starting and ending with 3",
    test: (d) => /^3\d{13}3$/.test(d),
  },
  "United Arab Emirates": {
    label: "UAE TRN",
    expect: "15 digits",
    test: (d) => /^\d{15}$/.test(d),
  },
};

export function taxIdHint(
  country: string,
  taxId: string,
): { hint: string | null; ok: boolean } {
  const rule = RULES[country.trim()];
  const compact = taxId.replace(/[\s-]/g, "");
  if (!rule || compact === "") return { hint: null, ok: true };
  if (rule.test(compact)) return { hint: null, ok: true };
  return {
    hint: `${rule.label} is usually ${rule.expect}. Saving is still allowed.`,
    ok: false,
  };
}
