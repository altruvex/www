"use client";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { cn } from "@/lib/utils/utils";
import { Check } from "lucide-react";
import { type ComponentPropsWithoutRef } from "react";
import { useRadioKeys } from "./hooks";
import type { AnswerMap, QuestionDef, QuestionKey, Translator } from "./types";

function Dial({
  selected = false,
  className,
  ...props
}: {
  selected?: boolean;
  className?: string;
} & ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-all duration-(--motion-instant) ease-smooth",
        selected ? "border-local-accent bg-local-accent" : "border-foreground/45 bg-background group-hover:border-foreground/70",
        className,
      )}
    >
      <Check
        aria-hidden
        strokeWidth={3}
        className={cn(
          "size-3 text-background transition-opacity duration-(--motion-instant)",
          selected ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}

function StageRule({ label, note }: { label: string; note: string | null }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle pt-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <Eyebrow className="shrink-0 text-micro leading-none">{label}</Eyebrow>
      {note ? (
        <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground sm:text-end">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function OptionRows({
  base,
  question,
  selected,
  onSelect,
  t,
  className,
}: {
  base: string;
  question: QuestionDef;
  selected: string | null;
  onSelect: (val: string) => void;
  t: Translator;
  className?: string;
}) {
  const { refs, onKeyDown } = useRadioKeys(question.options, onSelect);

  return (
    <div
      role="radiogroup"
      aria-label={t(`${base}.title`)}
      className={cn(
        "grid list-none gap-px overflow-hidden rounded-panel-sm border border-border-subtle bg-border-subtle",
        className,
      )}
    >
      {question.options.map((option, i) => {
        const isSelected = selected === option;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            ref={(node) => {
              refs.current[i] = node;
            }}
            aria-checked={isSelected}
            tabIndex={isSelected || (!selected && i === 0) ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, i)}
            onClick={() => onSelect(option)}
            className={cn(
              "group relative flex w-full cursor-pointer items-start gap-4 px-5 py-5 text-start outline-none transition-colors duration-(--motion-instant) ease-smooth sm:px-6",
              "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              "active:bg-surface",
              isSelected
                ? "bg-local-accent-soft"
                : "bg-background hover:bg-surface/70",
            )}
          >
            <Dial
              aria-hidden
              selected={isSelected}
              className="mt-0.5 group-active:scale-90"
            />
            <span className="grid min-w-0 flex-1 gap-1">
              <span
                className={cn(
                  "block text-[0.9375rem] font-medium transition-colors sm:text-base",
                  isSelected
                    ? "text-foreground"
                    : "text-foreground/85 group-hover:text-foreground",
                )}
              >
                {t(`${base}.options.${option}.title`)}
              </span>
              <span className="block max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                {t(`${base}.options.${option}.description`)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Segmented({
  base,
  labelledBy,
  question,
  selected,
  onSelect,
  t,
  className,
}: {
  base: string;
  labelledBy: string;
  question: QuestionDef;
  selected: string | null;
  onSelect: (val: string) => void;
  t: Translator;
  className?: string;
}) {
  const { refs, onKeyDown } = useRadioKeys(question.options, onSelect);

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        "grid gap-px overflow-hidden rounded-panel-sm border border-border-subtle bg-border-subtle sm:grid-cols-3",
        className,
      )}
    >
      {question.options.map((option, i) => {
        const isSelected = selected === option;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            ref={(node) => {
              refs.current[i] = node;
            }}
            aria-checked={isSelected}
            tabIndex={isSelected || (!selected && i === 0) ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, i)}
            onClick={() => onSelect(option)}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-center gap-2 px-3 py-3 text-center text-sm outline-none transition-colors duration-(--motion-instant) ease-smooth",
              "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              "active:bg-surface",
              isSelected
                ? "bg-local-accent-soft font-medium text-foreground"
                : "bg-background text-foreground/80 hover:bg-surface/70 hover:text-foreground",
            )}
          >
            {isSelected ? (
              <Check
                aria-hidden
                strokeWidth={2.5}
                className="size-3.5 shrink-0"
              />
            ) : null}
            <span>{t(`${base}.options.${option}.title`)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BuildQuestion({
  index,
  stage,
  stageNote,
  question,
  selected,
  onSelect,
  t,
  num,
}: {
  index: number;
  stage: string | null;
  stageNote: string | null;
  question: QuestionDef;
  selected: string | null;
  onSelect: (val: string) => void;
  t: Translator;
  num: (n: string | number) => string;
}) {
  const base = `steps.${question.msg}`;

  return (
    <div className="scroll-mt-40">
      {stage ? <StageRule label={stage} note={stageNote} /> : null}
      <section
        aria-labelledby={`question-${question.key}`}
        className={cn(
          "lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16",
          stage ? "mt-10" : "",
        )}
      >
        <header className="lg:col-span-4">
          <span
            aria-hidden
            className="eyebrow text-micro leading-none tabular-nums text-local-accent-text ltr:font-mono"
          >
            {num(String(index).padStart(2, "0"))}
          </span>
          <h3
            id={`question-${question.key}`}
            className="mt-4 text-[clamp(1.35rem,1.9vw,1.7rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-foreground"
          >
            {t(`${base}.title`)}
          </h3>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            {t.rich(`${base}.hint`, bodyMarks)}
          </p>
        </header>
        <OptionRows
          base={base}
          question={question}
          selected={selected}
          onSelect={onSelect}
          t={t}
          className="mt-7 lg:col-span-8 lg:mt-0"
        />
      </section>
    </div>
  );
}

function ConditionControl({
  question,
  selected,
  onSelect,
  t,
}: {
  question: QuestionDef;
  selected: string | null;
  onSelect: (val: string) => void;
  t: Translator;
}) {
  const base = `steps.${question.msg}`;
  const groupId = `condition-${question.key}`;

  return (
    <div className="py-7 first:pt-0 last:pb-0">
      <h4
        id={groupId}
        className="text-[0.9375rem] font-medium leading-snug text-foreground"
      >
        {t(`${base}.title`)}
      </h4>
      <Segmented
        base={base}
        labelledBy={groupId}
        question={question}
        selected={selected}
        onSelect={onSelect}
        t={t}
        className="mt-4"
      />
      <p className="mt-3.5 min-h-14 max-w-[62ch] text-xs leading-relaxed text-muted-foreground sm:min-h-10">
        {selected
          ? t(`${base}.options.${selected}.description`)
          : t.rich(`${base}.hint`, bodyMarks)}
      </p>
    </div>
  );
}

export function ConditionsBlock({
  questions,
  answers,
  onSelect,
  t,
  num,
}: {
  questions: readonly QuestionDef[];
  answers: AnswerMap;
  onSelect: (key: QuestionKey, value: string) => void;
  t: Translator;
  num: (n: string | number) => string;
}) {
  return (
    <div className="scroll-mt-40">
      <StageRule
        label={t("stages.conditions")}
        note={t("stages.conditionsNote")}
      />
      <div className="mt-10 lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16">
        <div className="lg:col-span-4">
          <span
            aria-hidden
            className="eyebrow text-micro leading-none tabular-nums text-local-accent-text ltr:font-mono"
          >
            {num("03")}
            <span className="text-muted-foreground">
              {" – "}
              {num("05")}
            </span>
          </span>
          <h3 className="mt-4 text-[clamp(1.35rem,1.9vw,1.7rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-foreground">
            {t("stages.conditionsTitle")}
          </h3>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            {t("stages.conditionsBody")}
          </p>
        </div>
        <div className="mt-7 divide-y divide-border-subtle lg:col-span-8 lg:mt-0">
          {questions.map((question) => (
            <ConditionControl
              key={question.key}
              question={question}
              selected={answers[question.key]}
              onSelect={(val) => onSelect(question.key, val)}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}