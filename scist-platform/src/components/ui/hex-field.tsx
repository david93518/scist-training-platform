import { seeded } from "@/lib/utils";

/**
 * A field of hexagons where a handful of cells are "lit" and breathe.
 * Pure SVG, deterministic layout (seeded), no client JS. Sits behind heroes
 * and page headers to give the grid a living, HTB-style feel.
 *
 * The viewBox is sized close to a real desktop section (about 1660 x 1260 px)
 * and drawn with `slice`, so hexagons render near their native ~50 px size
 * instead of being stretched to fill tall sections.
 *
 * The unlit grid is one tiled `<pattern>`, not 896 polygons. Drawing every
 * cell put ~150 KB of markup on the page — and the same again in the RSC
 * payload — so the home page shipped 1.5 MB of HTML for three of these.
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

  // keep lit cells in the upper two thirds where the mask is bright
  const litRows = Math.max(3, Math.floor(rows * 0.66));
  const litSet = new Set<number>();
  while (litSet.size < Math.min(lit, litRows * cols)) {
    litSet.add(Math.floor(rand() * litRows) * cols + Math.floor(rand() * cols));
  }

  const litCells = [...litSet].map((i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      x: col * w + (row % 2 ? w / 2 : 0) + w / 2,
      y: row * (h * 0.75) + h / 2,
      delay: rand() * 6,
      dur: 5 + rand() * 5,
    };
  });

  const width = cols * w + w / 2;
  const height = rows * h * 0.75 + h / 4;

  const points = (px: number, py: number, rad: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return (px + rad * Math.cos(a)).toFixed(1) + "," + (py + rad * Math.sin(a)).toFixed(1);
    }).join(" ");

  const id = "hexfield-" + seed;

  /**
   * One tile is `w` wide and `3r` tall: an even row centred at (w/2, r) and an
   * odd row centred at (w, 2.5r). The copies are the neighbours whose hexagons
   * cross the tile edge — without them the grid shows seams.
   */
  const tile: [number, number][] = [
    [w / 2, r],
    [w / 2 - w, r],
    [w / 2 + w, r],
    [0, 2.5 * r],
    [w, 2.5 * r],
    [0, -0.5 * r],
    [w, -0.5 * r],
  ];

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
        <pattern id={id + "-grid"} patternUnits="userSpaceOnUse" width={w} height={3 * r}>
          {tile.map(([px, py], i) => (
            <polygon
              key={i}
              points={points(px, py, r - 1.5)}
              fill="none"
              stroke="rgba(255,255,255,0.075)"
              strokeWidth="1"
            />
          ))}
        </pattern>
      </defs>
      <g mask={"url(#" + id + ")"}>
        <rect width={width} height={height} fill={"url(#" + id + "-grid)"} />
        {litCells.map((c, i) => {
          const anim = "lit " + c.dur + "s ease-in-out " + c.delay + "s infinite";
          return (
            <g key={i}>
              <polygon points={points(c.x, c.y, r + 4)} fill={color} filter={"url(#" + id + "-blur)"} style={{ animation: anim }} />
              <polygon
                points={points(c.x, c.y, r - 1.5)}
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
