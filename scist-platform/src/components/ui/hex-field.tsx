import { seeded } from "@/lib/utils";

/**
 * A field of hexagons where a handful of cells are "lit" and breathe.
 * Pure SVG, deterministic layout (seeded), no client JS. Sits behind heroes
 * and page headers to give the grid a living, HTB-style feel.
 *
 * The viewBox is sized close to a real desktop section (about 1660 x 1260 px)
 * and drawn with `slice`, so hexagons render near their native ~50 px size
 * instead of being stretched to fill tall sections.
 */
export function HexField({
  seed = 7,
  lit = 14,
  cols = 32,
  rows = 28,
  color = "#a4f13b",
  className = "",
  fade = true,
  /** center of the visibility mask, as SVG percentages */
  cx = "50%",
  cy = "15%",
}: {
  seed?: number;
  lit?: number;
  cols?: number;
  rows?: number;
  color?: string;
  className?: string;
  fade?: boolean;
  cx?: string;
  cy?: string;
}) {
  const r = 30;
  const w = Math.sqrt(3) * r;
  const h = 2 * r;
  const rand = seeded(seed);

  const cells: { x: number; y: number; lit: boolean; delay: number; dur: number }[] = [];
  const litSet = new Set<number>();
  const total = cols * rows;
  // keep lit cells in the upper two thirds where the mask is bright
  const litRows = Math.max(3, Math.floor(rows * 0.66));
  while (litSet.size < Math.min(lit, total)) {
    litSet.add(Math.floor(rand() * litRows) * cols + Math.floor(rand() * cols));
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0);
      const y = row * (h * 0.75);
      const i = row * cols + col;
      cells.push({ x, y, lit: litSet.has(i), delay: rand() * 6, dur: 5 + rand() * 5 });
    }
  }

  const width = cols * w + w / 2;
  const height = rows * h * 0.75 + h / 4;

  const points = (px: number, py: number, rad: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return (px + rad * Math.cos(a)).toFixed(1) + "," + (py + rad * Math.sin(a)).toFixed(1);
    }).join(" ");

  const id = "hexfield-" + seed;

  return (
    <svg
      className={"pointer-events-none absolute inset-0 h-full w-full " + className}
      viewBox={"0 0 " + width + " " + height}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={id + "-g"} cx={cx} cy={cy} r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={id}>
          <rect width="100%" height="100%" fill={fade ? "url(#" + id + "-g)" : "#fff"} />
        </mask>
        <filter id={id + "-blur"} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g mask={"url(#" + id + ")"}>
        {cells.map((c, i) => (
          <polygon
            key={i}
            points={points(c.x + w / 2, c.y + h / 2, r - 1.5)}
            fill="none"
            stroke="rgba(255,255,255,0.075)"
            strokeWidth="1"
          />
        ))}
        {cells
          .filter((c) => c.lit)
          .map((c, i) => {
            const anim = "lit " + c.dur + "s ease-in-out " + c.delay + "s infinite";
            return (
              <g key={"lit" + i}>
                <polygon
                  points={points(c.x + w / 2, c.y + h / 2, r + 4)}
                  fill={color}
                  filter={"url(#" + id + "-blur)"}
                  style={{ animation: anim }}
                />
                <polygon
                  points={points(c.x + w / 2, c.y + h / 2, r - 1.5)}
                  fill={color}
                  fillOpacity="0.35"
                  stroke={color}
                  strokeOpacity="0.9"
                  strokeWidth="1"
                  style={{ animation: anim }}
                />
              </g>
            );
          })}
      </g>
    </svg>
  );
}
