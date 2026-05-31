import { CASE_STUDIES, type CaseStudyRecord } from "@/lib/case-studies";

/** Production client sites with public URLs (excludes self-case-study). */
export function getLiveClientSites(): CaseStudyRecord[] {
  return CASE_STUDIES.filter(
    (study) =>
      study.externalUrl !== undefined && study.slug !== "altruvex-site",
  );
}
