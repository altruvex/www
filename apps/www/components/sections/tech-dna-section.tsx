"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  MOTION,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionHeading } from "./section-heading";

interface TechNode {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  primary?: boolean;
}

interface Connection {
  from: string;
  to: string;
  dashed?: boolean;
}

const NODES: TechNode[] = [
  {
    id: "nextjs",
    name: "Next.js",
    category: "Framework",
    x: 350,
    y: 220,
    primary: true,
  },
  { id: "react", name: "React", category: "UI Library", x: 160, y: 155 },
  { id: "typescript", name: "TypeScript", category: "Language", x: 350, y: 55 },
  { id: "nodejs", name: "Node.js", category: "Runtime", x: 540, y: 155 },
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "Database",
    x: 490,
    y: 365,
  },
  { id: "prisma", name: "Prisma", category: "ORM", x: 285, y: 385 },
  { id: "tailwind", name: "Tailwind", category: "Styling", x: 130, y: 320 },
  { id: "vercel", name: "Vercel", category: "Deployment", x: 585, y: 305 },
  { id: "vps", name: "VPS Server", category: "Server", x: 640, y: 180 },
];

const CONNECTIONS: Connection[] = [
  { from: "typescript", to: "react" },
  { from: "typescript", to: "nextjs" },
  { from: "typescript", to: "nodejs" },
  { from: "react", to: "nextjs" },
  { from: "nextjs", to: "tailwind" },
  { from: "nextjs", to: "nodejs" },
  { from: "nextjs", to: "vercel", dashed: true },
  { from: "nodejs", to: "vps", dashed: true },
  { from: "nodejs", to: "postgresql" },
  { from: "postgresql", to: "prisma" },
];

const NODE_W = 90;
const NODE_H = 34;
const NODE_RX = 8;
const VIEW_W = 700;
const VIEW_H = 462;

function getConnectedIds(nodeId: string): Set<string> {
  const ids = new Set<string>();
  CONNECTIONS.forEach((c) => {
    if (c.from === nodeId) ids.add(c.to);
    if (c.to === nodeId) ids.add(c.from);
  });
  return ids;
}

export function TechDNASection() {
  const t = useTranslations("serviceDetails.development");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const getX = (x: number) => (isRtl ? 700 - x : x);

  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [activeId, setActiveId] = useState<string | null>(null);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();

  const activeNode = activeId
    ? (NODES.find((n) => n.id === activeId) ?? null)
    : null;
  const connectedIds = activeId ? getConnectedIds(activeId) : new Set<string>();

  const highlights: string[] = (() => {
    if (!activeNode) return [];
    const raw: unknown = t.raw(`techStack.nodes.${activeNode.id}.highlights`);
    return Array.isArray(raw)
      ? raw.filter((h): h is string => typeof h === "string")
      : [];
  })();

  useEffect(() => {
    const section = sectionRef.current;
    const svg = svgRef.current;
    if (!section || !svg) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /* Reduced motion renders the finished diagram: nothing is hidden
         up front, so there is nothing to wait for. */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = svg.querySelectorAll<SVGLineElement>("[data-conn]");
        const nodes = svg.querySelectorAll<SVGGElement>("[data-node]");

        lines.forEach((line) => {
          const len = Math.hypot(
            Number(line.getAttribute("x2")) - Number(line.getAttribute("x1")),
            Number(line.getAttribute("y2")) - Number(line.getAttribute("y1")),
          );
          gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
        });
        gsap.set(nodes, { opacity: 0, y: 5 });

        ScrollTrigger.create({
          trigger: section,
          start: MOTION.trigger.latest,
          once: true,
          onEnter: () => {
            gsap
              .timeline({ defaults: { ease: MOTION.ease.smooth } })
              .to(lines, {
                strokeDashoffset: 0,
                duration: MOTION.duration.text,
                stagger: MOTION.stagger.base,
                onComplete: () => {
                  svg
                    .querySelectorAll("[data-dashed]")
                    .forEach((el) => gsap.set(el, { strokeDasharray: "4 6" }));
                },
              })
              .to(
                nodes,
                { opacity: 1, y: 0, duration: MOTION.duration.fast, stagger: MOTION.stagger.tight },
                "-=0.5",
              );
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const enter = useCallback((id: string) => setActiveId(id), []);
  const clearSelection = useCallback(() => setActiveId(null), []);

  const getNodeOpacity = (id: string): number => {
    if (!activeId || id === activeId) return 1;
    return connectedIds.has(id) ? 0.85 : 0.2;
  };

  const isRelated = (conn: Connection) =>
    conn.from === activeId || conn.to === activeId;

  const getConnOpacity = (conn: Connection): number => {
    if (!activeId) return 0.18;
    return isRelated(conn) ? 0.75 : 0.06;
  };

  const getConnWidth = (conn: Connection): number => {
    if (!activeId) return 0.75;
    return isRelated(conn) ? 1.25 : 0.5;
  };

  /* The popover opens on the side of the node that has room: below for the
     upper half of the diagram, above for the lower half — so it never leaves
     the diagram, including inside the mobile horizontal scroller. */
  const popover = activeNode
    ? (() => {
        const above = activeNode.y > VIEW_H / 2;
        const edge = activeNode.y + (above ? -NODE_H / 2 : NODE_H / 2);
        return {
          above,
          left: (getX(activeNode.x) / VIEW_W) * 100,
          top: (edge / VIEW_H) * 100,
        };
      })()
    : null;

  return (
    <section
      ref={sectionRef}
      id="tech-dna"
      aria-labelledby="tech-dna-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="tech-dna-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("techStack.eyebrow")}
          firstTitle={t("techStack.title")}
          secondTitle={t("techStack.titleItalic")}
          description={t("techStack.subtitle")}
          className="mb-10 md:mb-14"
        />

        <div className="scrollbar-hide -mx-6 overflow-x-auto px-6 sm:-mx-8 sm:px-8 md:mx-0 md:overflow-visible md:px-0">
          {/* aspect-ratio, not padding-bottom: a padding percentage resolves
              against the scroller's width, so on mobile the 680px-wide
              diagram got a 327px-based height and rendered at half size. */}
          <div
            className="relative aspect-[700/462] min-w-[680px] md:min-w-0"
            onMouseLeave={clearSelection}
          >
            {/* role="group", not "img": an img role makes its children
                presentational, which hid every node button from AT. */}
            <svg
              ref={svgRef}
              viewBox="0 0 700 462"
              className="absolute inset-0 h-full w-full overflow-visible text-foreground"
              role="group"
              aria-label={t("techStack.diagramLabel")}
              onClick={clearSelection}
            >
              <g>
                {CONNECTIONS.map((conn) => {
                  const a = NODES.find((n) => n.id === conn.from)!;
                  const b = NODES.find((n) => n.id === conn.to)!;
                  return (
                    <line
                      key={`${conn.from}-${conn.to}`}
                      data-conn
                      {...(conn.dashed ? { "data-dashed": "" } : {})}
                      x1={getX(a.x)}
                      y1={a.y}
                      x2={getX(b.x)}
                      y2={b.y}
                      stroke="currentColor"
                      strokeWidth={getConnWidth(conn)}
                      strokeDasharray={conn.dashed ? "4 6" : undefined}
                      style={{
                        opacity: getConnOpacity(conn),
                        transition: "opacity 0.2s ease, stroke-width 0.2s ease",
                      }}
                    />
                  );
                })}
              </g>
              <g>
                {NODES.map((node) => {
                  const isActive = node.id === activeId;
                  const w = node.primary ? NODE_W * 1.14 : NODE_W;
                  const nx = getX(node.x);
                  const category = t(`techStack.categories.${node.category}`);

                  return (
                    <g
                      key={node.id}
                      data-node
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      aria-label={`${node.name} - ${category}`}
                      className={cn(
                        "cursor-pointer outline-none",
                        /* The rect below strokes with currentColor, so lighting
                           the group is all it takes for the selected node to
                           wear the page's world. Weight and fill already carry
                           the state, so colour is never the only signal. */
                        isActive && "text-local-accent",
                      )}
                      style={{
                        opacity: getNodeOpacity(node.id),
                        transition: "opacity 0.2s ease",
                      }}
                      onMouseEnter={() => enter(node.id)}
                      onFocus={() => enter(node.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        enter(node.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (isActive) clearSelection();
                          else enter(node.id);
                        } else if (e.key === "Escape") {
                          clearSelection();
                        }
                      }}
                    >
                      <rect
                        x={nx - w / 2}
                        y={node.y - NODE_H / 2}
                        width={w}
                        height={NODE_H}
                        rx={NODE_RX}
                        className={cn(
                          "transition-[stroke-opacity,stroke-width] duration-(--motion-instant)",
                          isActive ? "fill-card" : "fill-background",
                        )}
                        stroke="currentColor"
                        strokeWidth={isActive ? 1.25 : 0.75}
                        strokeOpacity={isActive ? 0.9 : 0.25}
                      />
                      <text
                        x={nx}
                        y={node.y - 4}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none select-none fill-foreground font-mono"
                        style={{
                          fontSize: node.primary ? 11.5 : 10.5,
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {node.name}
                      </text>
                      <text
                        x={nx}
                        y={node.y + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={cn(
                          "pointer-events-none select-none fill-muted-foreground",
                          isRtl ? "font-sans" : "font-mono uppercase",
                        )}
                        style={{
                          fontSize: 7.5,
                          letterSpacing: isRtl ? 0 : "0.12em",
                        }}
                      >
                        {category}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <div
              aria-live="polite"
              className="pointer-events-none absolute inset-0"
            >
              {activeNode && popover ? (
                <div
                  className="absolute z-10 w-80 max-w-full"
                  style={{
                    left: `clamp(0px, calc(${popover.left}% - 10rem), calc(100% - 20rem))`,
                    top: `calc(${popover.top}% ${popover.above ? "-" : "+"} 10px)`,
                    transform: popover.above ? "translateY(-100%)" : undefined,
                  }}
                >
                  <div
                    key={activeNode.id}
                    className={cn(
                      "liquid-glass pointer-events-auto rounded-panel-md p-4",
                      popover.above ? "td-pop-up" : "td-pop-down",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <h3 className="text-base font-medium leading-snug text-foreground">
                        {activeNode.name}
                      </h3>
                      <Eyebrow className="m-0 text-micro">
                        {t(`techStack.categories.${activeNode.category}`)}
                      </Eyebrow>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {t(`techStack.nodes.${activeNode.id}.description`)}
                    </p>
                    {highlights.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {highlights.map((h) => (
                          <li
                            key={h}
                            dir="ltr"
                            className="rounded-ctl-xs border border-border-subtle/70 px-2 py-0.5 font-mono text-micro text-foreground/80"
                          >
                            {h}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div aria-hidden className="mt-4 flex items-center gap-3 md:hidden">
          <div className="h-px flex-1 bg-border-subtle" />
          <Eyebrow className="m-0 whitespace-nowrap">
            {t("techStack.dragHint")}
          </Eyebrow>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>

        <p
          className={cn(
            "mt-6 text-center text-sm text-muted-foreground transition-opacity duration-(--motion-instant)",
            activeNode ? "opacity-0" : "opacity-100",
          )}
        >
          {t("techStack.inspect")}
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Eyebrow className="m-0">
            {t("techStack.footer", {
              count: localizeNumbers(String(NODES.length), locale),
            })}
          </Eyebrow>
          <div aria-hidden className="h-px flex-1 bg-border-subtle/60" />
        </div>
      </Container>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes td-pop-up { from { opacity: 0; transform: translateY(6px) scale(0.98); } }
        @keyframes td-pop-down { from { opacity: 0; transform: translateY(-6px) scale(0.98); } }
        .td-pop-up { transform-origin: bottom center; animation: td-pop-up 0.22s var(--ease-strong) both; }
        .td-pop-down { transform-origin: top center; animation: td-pop-down 0.22s var(--ease-strong) both; }
        @media (prefers-reduced-motion: reduce) { .td-pop-up, .td-pop-down { animation: none; } }
      `}</style>
    </section>
  );
}
