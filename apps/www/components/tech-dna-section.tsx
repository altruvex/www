"use client";
import { useSectionTitle, useSectionEyebrow, MOTION } from "@/lib/motion";

import { Container } from "@/components/container";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useTranslations, useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface TechNode {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  r: number;
  primary?: boolean;
  accent: string;
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
    r: 30,
    primary: true,
    accent: "#818CF8",
  },
  {
    id: "react",
    name: "React",
    category: "UI Library",
    x: 160,
    y: 155,
    r: 21,
    accent: "#61DAFB",
  },
  {
    id: "typescript",
    name: "TypeScript",
    category: "Language",
    x: 350,
    y: 55,
    r: 21,
    accent: "#3B82F6",
  },
  {
    id: "nodejs",
    name: "Node.js",
    category: "Runtime",
    x: 540,
    y: 155,
    r: 21,
    accent: "#4ADE80",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "Database",
    x: 490,
    y: 365,
    r: 21,
    accent: "#60A5FA",
  },
  {
    id: "prisma",
    name: "Prisma",
    category: "ORM",
    x: 285,
    y: 385,
    r: 21,
    accent: "#A78BFA",
  },
  {
    id: "tailwind",
    name: "Tailwind",
    category: "Styling",
    x: 130,
    y: 320,
    r: 21,
    accent: "#22D3EE",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Deployment",
    x: 585,
    y: 305,
    r: 21,
    accent: "#E4E4E7",
  },
  {
    id: "vps",
    name: "VPS Server",
    category: "Server",
    x: 640,
    y: 180,
    r: 21,
    accent: "#94A3B8",
  },
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
const NODE_RX = 3;

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
  const animated = useRef(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState(0);

  const titleRef = useSectionEyebrow<HTMLDivElement>();
  const headingRef = useSectionTitle();

  const activeNode = activeId
    ? (NODES.find((n) => n.id === activeId) ?? null)
    : null;
  const connectedIds = activeId ? getConnectedIds(activeId) : new Set<string>();

  useEffect(() => {
    if (!sectionRef.current || !svgRef.current || animated.current) return;

    const lines =
      svgRef.current.querySelectorAll<SVGLineElement>("[data-conn]");
    const nodeGrps =
      svgRef.current.querySelectorAll<SVGGElement>("[data-node]");

    lines.forEach((line) => {
      const x1 = parseFloat(line.getAttribute("x1") ?? "0");
      const y1 = parseFloat(line.getAttribute("y1") ?? "0");
      const x2 = parseFloat(line.getAttribute("x2") ?? "0");
      const y2 = parseFloat(line.getAttribute("y2") ?? "0");
      const len = Math.hypot(x2 - x1, y2 - y1);
      gsap.set(line, {
        strokeDasharray: len,
        strokeDashoffset: len,
        opacity: 0,
      });
    });
    gsap.set(nodeGrps, { opacity: 0, y: 5 });

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 72%",
      once: true,
      onEnter: () => {
        animated.current = true;
        const tl = gsap.timeline({ defaults: { ease: MOTION.ease.smooth } });

        tl.to(lines, {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.06,
          onComplete: () => {
            svgRef.current
              ?.querySelectorAll<SVGLineElement>("[data-dashed]")
              .forEach((el) => gsap.set(el, { strokeDasharray: "4 6" }));
          },
        });
        tl.to(
          nodeGrps,
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.04,
            ease: "power2.out",
          },
          "-=0.5",
        );
      },
    });

    return () => st.kill();
  }, []);

  const enter = useCallback((id: string) => {
    setActiveId(id);
    setDetailKey((k) => k + 1);
  }, []);
  const leave = useCallback(() => setActiveId(null), []);

  const getNodeOpacity = (id: string): number => {
    if (!activeId) return 1;
    if (id === activeId) return 1;
    if (connectedIds.has(id)) return 0.8;
    return 0.12;
  };

  const getConnStroke = (conn: Connection): string => {
    if (!activeId) return "hsl(var(--foreground))";
    if (conn.from === activeId || conn.to === activeId) {
      return (
        NODES.find((n) => n.id === conn.from)?.accent ??
        "hsl(var(--foreground))"
      );
    }
    return "hsl(var(--foreground))";
  };

  const getConnOpacity = (conn: Connection): number => {
    if (!activeId) return 0.1;
    if (conn.from === activeId || conn.to === activeId) return 0.65;
    return 0.04;
  };

  const getConnWidth = (conn: Connection): number => {
    if (!activeId) return 0.6;
    if (conn.from === activeId || conn.to === activeId) return 1.25;
    return 0.4;
  };

  return (
    <section
      ref={sectionRef}
      id="tech-dna"
      className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div ref={titleRef} className="mb-16">
          <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block">
            {t("techStack.eyebrow")}
          </p>
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <h2
              ref={headingRef}
              className="font-sans font-normal text-foreground leading-[1.05]"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("techStack.title")}
              <br />
              <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                {t("techStack.titleItalic")}
              </span>
            </h2>
            <p className="font-mono leading-normal tracking-wider text-sm text-primary/35 max-w-[32ch] hidden lg:block">
              {t("techStack.subtitle")}
            </p>
          </div>
        </div>
        <div className="relative mt-12 md:mt-0">
          <div className="relative overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide cursor-grab active:cursor-grabbing group/scroll">
            <div className="min-w-[680px] md:min-w-0 relative">
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                  opacity: 0.04,
                }}
              />
              <div className="relative" style={{ paddingBottom: "66%" }}>
                <svg
                  ref={svgRef}
                  viewBox="0 0 700 462"
                  width="100%"
                  height="100%"
                  className="absolute inset-0"
                  style={{
                    overflow: "visible",
                    color: "hsl(var(--foreground))",
                  }}
                  role="img"
                  aria-label={t("techStack.diagramLabel")}
                >
                  <g>
                    {CONNECTIONS.map((conn, i) => {
                      const a = NODES.find((n) => n.id === conn.from)!;
                      const b = NODES.find((n) => n.id === conn.to)!;
                      return (
                        <line
                          key={i}
                          data-conn
                          {...(conn.dashed ? { "data-dashed": "" } : {})}
                          x1={getX(a.x)}
                          y1={a.y}
                          x2={getX(b.x)}
                          y2={b.y}
                          stroke={getConnStroke(conn)}
                          strokeWidth={getConnWidth(conn)}
                          strokeDasharray={conn.dashed ? "4 6" : undefined}
                          style={{
                            opacity: getConnOpacity(conn),
                            transition:
                              "opacity 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease",
                          }}
                        />
                      );
                    })}
                  </g>
                  <g>
                    {NODES.map((node) => {
                      const isActive = node.id === activeId;
                      const isPrimary = !!node.primary;
                      const w = isPrimary ? NODE_W * 1.14 : NODE_W;
                      const nx = getX(node.x);
                      const bx = nx - w / 2;
                      const by = node.y - NODE_H / 2;

                      return (
                        <g
                          key={node.id}
                          data-node
                          style={{
                            cursor: "pointer",
                            opacity: getNodeOpacity(node.id),
                            transition: "opacity 0.2s ease",
                          }}
                          onMouseEnter={() => enter(node.id)}
                          onMouseLeave={leave}
                          onFocus={() => enter(node.id)}
                          onBlur={leave}
                          role="button"
                          tabIndex={0}
                          aria-label={`${node.name} - ${t(`techStack.categories.${node.category}`)}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (isActive) {
                                leave();
                              } else {
                                enter(node.id);
                              }
                            }
                          }}
                        >
                          <rect
                            x={bx}
                            y={by}
                            width={w}
                            height={NODE_H}
                            rx={NODE_RX}
                            fill={
                              isActive
                                ? `${node.accent}0D`
                                : "hsl(var(--background))"
                            }
                            stroke={
                              isActive ? node.accent : "hsl(var(--foreground))"
                            }
                            strokeWidth={isActive ? 1 : 0.5}
                            strokeOpacity={isActive ? 0.6 : 0.16}
                            style={{
                              transition:
                                "fill 0.2s ease, stroke 0.2s ease, stroke-opacity 0.2s ease",
                            }}
                          />
                          {isActive && (
                            <rect
                              x={bx}
                              y={by}
                              width={2}
                              height={NODE_H}
                              rx={NODE_RX}
                              fill={node.accent}
                              opacity={0.75}
                            />
                          )}
                          <circle
                            cx={bx + (isRtl ? 7 : w - 7)}
                            cy={by + 7}
                            r={2}
                            fill={node.accent}
                            opacity={isActive ? 0.9 : 0.3}
                            style={{ transition: "opacity 0.2s ease" }}
                          />
                          <text
                            x={nx}
                            y={node.y - 4}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                              fill: "hsl(var(--foreground))",
                              fontSize: isPrimary ? "11px" : "10px",
                              fontFamily:
                                "var(--font-mono, 'JetBrains Mono', monospace)",
                              fontWeight: isActive ? "600" : "400",
                              opacity: isActive ? 1 : 0.7,
                              transition: "opacity 0.2s ease",
                              userSelect: "none",
                              pointerEvents: "none",
                            }}
                          >
                            {node.name}
                          </text>
                          <text
                            x={nx}
                            y={node.y + 8}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                              fill: isActive
                                ? node.accent
                                : "hsl(var(--foreground))",
                              fontSize: "7px",
                              fontFamily: "var(--font-mono, monospace)",
                              letterSpacing: "0.12em",
                              opacity: isActive ? 0.85 : 0.25,
                              transition: "fill 0.2s ease, opacity 0.2s ease",
                              userSelect: "none",
                              pointerEvents: "none",
                            }}
                          >
                            {t(
                              `techStack.categories.${node.category}`,
                            ).toUpperCase()}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>
          </div>

          <div className="md:hidden flex items-center justify-center gap-3 mt-4 pointer-events-none transition-opacity group-hover/scroll:opacity-5">
            <div className="h-px flex-1 bg-border" />
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 whitespace-nowrap">
              {t("techStack.dragHint")}
            </p>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-8 md:mt-0 min-h-[160px] md:min-h-[116px] relative">
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                opacity: activeNode ? 0 : 1,
                transition: "opacity 0.18s ease",
              }}
            >
              <p className="font-mono text-sm leading-normal tracking-wider md:text-sm uppercase text-muted-foreground text-center px-6">
                {t("techStack.inspect")}
              </p>
            </div>
            <div
              key={detailKey}
              style={{
                opacity: activeNode ? 1 : 0,
                pointerEvents: activeNode ? "auto" : "none",
                animation: activeNode
                  ? "detailIn 0.22s ease forwards"
                  : undefined,
              }}
            >
              {activeNode && (
                <div
                  className="rounded-lg p-5 md:p-6 grid items-start gap-5 md:gap-6 border-foreground/10"
                  style={{
                    gridTemplateColumns: "2px 1fr auto",
                    border: `1px solid ${activeNode.accent}24`,
                    background: `${activeNode.accent}07`,
                  }}
                >
                  <div
                    style={{
                      alignSelf: "stretch",
                      background: activeNode.accent,
                      borderRadius: "var(--radius-xs)",
                      opacity: 0.65,
                    }}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                      <h3
                        className="font-mono text-sm leading-normal tracking-wider font-semibold text-primary"
                        style={{
                          fontSize: "clamp(14px, 1.5vw, 16px)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {activeNode.name}
                      </h3>
                      <span
                        className="font-mono text-sm leading-normal tracking-wider uppercase"
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-xs)",
                          color: activeNode.accent,
                          border: `1px solid ${activeNode.accent}32`,
                        }}
                      >
                        {t(`techStack.categories.${activeNode.category}`)}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed text-primary/60 md:text-primary/75"
                      style={{ maxWidth: "54ch" }}
                    >
                      {t(`techStack.nodes.${activeNode.id}.description`)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {(
                      t.raw(
                        `techStack.nodes.${activeNode.id}.highlights`,
                      ) as string[]
                    ).map((h, i) => (
                      <span
                        key={h}
                        className="font-mono text-sm leading-normal tracking-wider uppercase text-primary/38 border border-foreground/8 bg-foreground/3 rounded-lg whitespace-nowrap"
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.13em",
                          padding: "4px 10px",
                          animation: `chipIn 0.2s ease ${i * 0.055}s both`,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-foreground/8 pt-4 flex items-center gap-4">
          <span className="font-mono text-sm leading-normal tracking-wider uppercase text-primary/20">
            {t("techStack.footer")}
          </span>
          <div className="flex-1 h-px bg-foreground/4" />
        </div>
      </Container>
      <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes detailIn {
                    from { opacity: 0.2; transform: translateY(4px); }
                    to   { opacity: 1;   transform: translateY(0); }
                }
                @keyframes chipIn {
                    from { opacity: 0; transform: translateX(5px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `}</style>
    </section>
  );
}
