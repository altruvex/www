export { InspectSheet, type InspectSheetProps } from "./inspect-sheet-client";

export const INSPECT_PARAM = "inspect";

type ParamsLike =
  | URLSearchParams
  | { toString(): string; get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function toSearchParams(params: ParamsLike | undefined): URLSearchParams {
  if (!params) return new URLSearchParams();
  if (params instanceof URLSearchParams) return new URLSearchParams(params.toString());
  if (typeof (params as URLSearchParams).get === "function") {
    return new URLSearchParams(params.toString());
  }
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, string | string[] | undefined>)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) out.append(key, v);
  }
  return out;
}

export function inspectHref(
  pathname: string,
  searchParams: ParamsLike | undefined,
  id: string | null,
): string {
  const params = toSearchParams(searchParams);
  if (id === null) params.delete(INSPECT_PARAM);
  else params.set(INSPECT_PARAM, id);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
