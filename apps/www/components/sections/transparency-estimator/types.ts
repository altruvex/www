import type { useTranslations } from "next-intl";

export type QuestionKey =
  | "projectType"
  | "complexity"
  | "brandIdentity"
  | "contentReadiness"
  | "timeline";

export type AnswerMap = Record<QuestionKey, string | null>;

export type Translator = ReturnType<typeof useTranslations<"transparency">>;

export type QuestionDef = {
  key: QuestionKey;
  msg: string;
  options: readonly string[];
};

export interface MoneyFormats {
  readonly money: (n: number) => string;
  readonly lead: (n: number) => string;
  readonly trail: (n: number) => string;
}

export interface Delta {
  readonly label: string;
  readonly minChange: number;
  readonly maxChange: number;
}
