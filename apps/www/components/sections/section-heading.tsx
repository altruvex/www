import { Accent, Highlight, type AccentAnimation, type AccentGradient, type GradientDirection } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils/utils";
import { ReactNode, RefObject } from "react";

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  firstTitle: ReactNode;
  secondTitle?: ReactNode | null;
  description?: ReactNode;
  eyebrowRef?: RefObject<HTMLElement | null>;
  titleRef?: RefObject<HTMLElement | null>;
  descriptionRef?: RefObject<HTMLElement | null>;
  className?: string;
  theme?: "default" | "surface";
  accent?: AccentGradient | (string & {});
  accentDirection?: GradientDirection;
  accentAnimate?: boolean | AccentAnimation;
  secondTitleBreak?: boolean;
  titleId?: string;
  titleAs?: "h1" | "h2" | "h3";
  customEyebrow?: boolean;
  classes?: {
    container?: string;
    titleWrapper?: string;
    eyebrow?: string;
    title?: string;
    secondTitle?: string;
    description?: string;
  };
}

export function SectionHeading({
  eyebrow,
  firstTitle,
  secondTitle,
  description,
  eyebrowRef,
  titleRef,
  descriptionRef,
  className,
  theme = "default",
  accent,
  accentDirection = "r",
  accentAnimate = false,
  secondTitleBreak = true,
  titleId,
  titleAs = "h2",
  customEyebrow = false,
  classes,
}: SectionHeadingProps) {
  const isSurface = theme === "surface";

  const Heading = titleAs;

  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end md:gap-12",
        className,
        classes?.container,
      )}
    >
      <div
        className={cn(
          "space-y-3",
          isSurface && "flex-1",
          classes?.titleWrapper,
        )}
      >
        {eyebrow ? (
          !customEyebrow ? (
            <Eyebrow
              ref={eyebrowRef as RefObject<HTMLParagraphElement | null>}
              className={cn(
                "m-0",
                isSurface && "text-s-mid",
                classes?.eyebrow,
              )}
            >
              {eyebrow}
            </Eyebrow>
          ) : (
            <div
              ref={eyebrowRef as RefObject<HTMLDivElement | null>}
              className={classes?.eyebrow}
            >
              {eyebrow}
            </div>
          )
        ) : null}
        <Heading
          id={titleId}
          ref={titleRef as RefObject<HTMLHeadingElement | null>}
          className={cn(
            "section-title m-0 font-normal",
            isSurface ? "text-s-high" : "text-foreground",
            classes?.title,
          )}
        >
          {firstTitle}
          {secondTitle ? (
            <>
              {secondTitleBreak ? (
                <br className={isSurface ? "" : "hidden md:block"} />
              ) : (
                " "
              )}
              {accent ? (
                <Accent
                  gradient={accent}
                  direction={accentDirection}
                  animate={accentAnimate}
                  className={cn(
                    secondTitleBreak &&
                    (isSurface
                      ? ""
                      : "mt-2 block md:mt-0 md:inline"),
                    classes?.secondTitle,
                  )}
                >
                  {secondTitle}
                </Accent>
              ) : (
                <Highlight
                  className={cn(
                    isSurface
                      ? "text-s-mid"
                      : "text-foreground/45",
                    secondTitleBreak &&
                    "mt-2 block md:mt-0 md:inline",
                    classes?.secondTitle,
                  )}
                >
                  {secondTitle}
                </Highlight>
              )}
            </>
          ) : null}
        </Heading>
      </div>
      {description && (
        <p
          ref={descriptionRef as RefObject<HTMLParagraphElement | null>}
          className={cn(
            "m-0 max-w-sm text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed md:max-w-xs lg:max-w-[20rem]",
            isSurface ? "text-s-mid" : "text-muted-foreground",
            classes?.description,
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}