import { cn } from "@/lib/utils/utils";

interface Stroke {
  readonly d: string;
  readonly accent?: boolean;
  readonly bold?: boolean;
  readonly occlude?: boolean;
}

interface Drawing {
  readonly flip: boolean;
  readonly strokes: readonly Stroke[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function rect(x: number, y: number, w: number, h: number, r = 0): string {
  const [x0, y0, x1, y1] = [x, y, x + w, y + h].map(r1) as [number, number, number, number];
  if (!r) return `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
  const a = `A${r} ${r} 0 0 1`;
  return (
    `M${r1(x + r)} ${y0}H${r1(x + w - r)}${a} ${x1} ${r1(y + r)}` +
    `V${r1(y + h - r)}${a} ${r1(x + w - r)} ${y1}` +
    `H${r1(x + r)}${a} ${x0} ${r1(y + h - r)}` +
    `V${r1(y + r)}${a} ${r1(x + r)} ${y0}Z`
  );
}

function circle(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)} ${cy}a${r} ${r} 0 1 0 ${r1(2 * r)} 0a${r} ${r} 0 1 0 ${r1(-2 * r)} 0`;
}

function line(x1: number, y1: number, x2: number, y2: number): string {
  return `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}`;
}

function page(ox: number, oy: number, k: number, second: boolean): Stroke[] {
  const x = (n: number) => ox + n * k;
  const y = (n: number) => oy + n * k;
  const logo: Stroke = { d: rect(x(5), y(4), 6 * k, 6 * k, 1), accent: second };
  const strokes: Stroke[] = [
    { d: rect(x(0), y(0), 44 * k, 56 * k, 3), occlude: second },
    { d: line(x(14), y(7), x(38), y(7)) },
    { d: line(x(0), y(14), x(44), y(14)) },
    { d: rect(x(5), y(19), 34 * k, 12 * k, 1.5) },
    {
      d:
        line(x(5), y(37), x(39), y(37)) +
        line(x(5), y(43), x(33), y(43)) +
        line(x(5), y(49), x(36), y(49)),
    },
  ];
  if (second) strokes.push(logo);
  else strokes.splice(1, 0, logo);
  return strokes;
}

const PAGE_SCALE = 1.27;

const DRAWINGS: readonly Drawing[] = [
  {
    flip: false,
    strokes: [
      ...page(6, 6, PAGE_SCALE, false),
      ...page(6 + 22 * PAGE_SCALE, 6 + 10 * PAGE_SCALE, PAGE_SCALE, true),
    ],
  },
  {
    flip: false,
    strokes: [
      { d: rect(26, 6, 44, 84, 8) },
      { d: line(42, 14, 54, 14) },
      { d: line(42, 82, 54, 82) },
      { d: circle(48, 48, 13) },
      { d: "M48 35 A13 13 0 0 1 60.2 52.4", accent: true, bold: true },
    ],
  },
  {
    flip: false,
    strokes: [
      { d: rect(6, 4, 52, 88, 3) },
      { d: line(32, 10, 32, 86) },
      {
        d: [16, 24, 32, 40, 48, 56, 64, 72, 80]
          .map((ty, k) => (k % 2 ? line(32, ty, 38, ty) : line(26, ty, 32, ty)))
          .join(""),
      },
      {
        d:
          circle(78, 20, 9) +
          line(78, 29, 78, 88) +
          line(78, 72, 86, 72) +
          line(78, 81, 85, 81),
        accent: true,
      },
    ],
  },
  {
    flip: true,
    strokes: [
      { d: line(4, 90, 92, 90) },
      { d: "M7 90V74H19V90" },
      { d: "M25 90V60H37V90" },
      { d: "M43 90V44H55V90" },
      { d: "M61 90V26H73V90" },
      { d: "M79 90V6H91V90", accent: true },
    ],
  },
  {
    flip: true,
    strokes: [
      { d: circle(18, 18, 8) + "M4 42a14 14 0 0 1 28 0" },
      { d: circle(78, 58, 8) + "M64 82a14 14 0 0 1 28 0" },
      { d: line(30, 44, 38, 49) },
      { d: circle(41, 51, 3.5) },
      { d: line(44, 53, 50, 57) },
      { d: circle(53, 59, 3.5) },
      { d: line(56, 61, 59, 63) + line(63, 65.5, 66, 67.5), accent: true, bold: true },
    ],
  },
];

const FRAME_SHAPES = [
  "rounded-panel-sm",
  "rounded-t-full pt-[14%]",
  "rounded-b-panel-sm",
  "border-e-0",
  "rounded-panel-sm rounded-se-none",
] as const;

export function ProblemDrawing({ index, className }: { index: number; className?: string }) {
  const drawing = DRAWINGS[index];
  if (!drawing) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "block aspect-square w-24 border border-foreground/45 p-[10%] transition-colors duration-(--motion-base) ease-smooth group-hover:border-foreground lg:w-32",
        FRAME_SHAPES[index],
        className,
      )}
    >
      <svg
        viewBox="0 0 96 96"
        focusable="false"
        className={cn(
          "block size-full overflow-visible text-foreground/70",
          drawing.flip && "rtl:-scale-x-100",
        )}
      >
        {drawing.strokes.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            pathLength={1}
            data-stroke
            data-accent={stroke.accent ? "" : undefined}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke.bold ? 3 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={cn(
              stroke.accent && "stroke-local-accent",
              stroke.occlude && "fill-background",
            )}
          />
        ))}
      </svg>
    </div>
  );
}
