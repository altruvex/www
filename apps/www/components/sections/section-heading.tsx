import { ReactNode, RefObject } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Accent, Highlight, type AccentGradient, type GradientDirection } from "@/components/ui/emphasis";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: ReactNode;
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
  accentAnimate?: boolean;
  
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
  customEyebrow = false,
  classes,
}: SectionHeadingProps) {
  const isSurface = theme === "surface";

  return (
    <div className={cn("flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 md:gap-12", className, classes?.container)}>
      <div className={cn("space-y-3", isSurface && "w-full lg:w-auto flex-1", classes?.titleWrapper)}>
        {!customEyebrow ? (
          <Eyebrow ref={eyebrowRef as RefObject<HTMLParagraphElement | null>} className={cn("m-0", isSurface && "text-s-low", classes?.eyebrow)}>
            {eyebrow}
          </Eyebrow>
        ) : (
          <div ref={eyebrowRef as RefObject<HTMLDivElement | null>} className={classes?.eyebrow}>{eyebrow}</div>
        )}
        <h2
          ref={titleRef as RefObject<HTMLHeadingElement | null>}
          className={cn(
            "section-title font-normal m-0",
            isSurface ? "text-s-high" : "text-foreground",
            classes?.title
          )}
        >
          {firstTitle}
          {secondTitle ? (
            <>
              <br className={isSurface ? "" : "hidden md:block"} />
              {accent ? (
                <Accent
                  gradient={accent}
                  direction={accentDirection}
                  animate={accentAnimate}
                  className={cn(
                    isSurface ? "" : "block mt-2 md:mt-0 md:inline",
                    classes?.secondTitle
                  )}
                >
                  {secondTitle}
                </Accent>
              ) : (
                <Highlight
                  className={cn(
                    isSurface
                      ? "text-s-mid"
                      : "block mt-2 md:mt-0 md:inline text-foreground/45",
                    classes?.secondTitle
                  )}
                >
                  {secondTitle}
                </Highlight>
              )}
            </>
          ) : null}
        </h2>
      </div>
      {description && (
        <p
          ref={descriptionRef as RefObject<HTMLParagraphElement | null>}
          className={cn(
            "m-0 max-w-sm text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed md:max-w-xs lg:max-w-[20rem]",
            isSurface ? "text-s-low" : "text-muted-foreground",
            classes?.description
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}