import { Lightbulb, AlertTriangle, Info } from "lucide-react";
import type { ContentBlock } from "@/data/tracks";

const CALLOUT = {
  tip: { Icon: Lightbulb, color: "var(--color-accent)", label: "小技巧" },
  warn: { Icon: AlertTriangle, color: "var(--color-amber)", label: "注意" },
  info: { Icon: Info, color: "var(--color-blue)", label: "補充" },
} as const;

function CodeBlock({ lang, lines }: { lang: string; lines: string[] }) {
  return (
    <div className="my-4 min-w-0 overflow-hidden rounded-xl border border-line bg-bg-0">
      <div className="flex items-center justify-between border-b border-line bg-bg-1 px-3 py-1.5">
        <span className="font-mono text-[10.5px] tracking-widest text-fg-3">
          {lang.toUpperCase()}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.75]">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="flex">
              <span className="mr-4 w-5 shrink-0 select-none text-right text-fg-3/50">
                {i + 1}
              </span>
              <span
                className={
                  line.trimStart().startsWith("#") || line.trimStart().startsWith("--") || line.trimStart().startsWith("//")
                    ? "text-fg-3"
                    : "text-fg"
                }
              >
                {line || " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="prose-scist min-w-0 text-[14.5px] text-fg-2">
      {blocks.map((b, i) => {
        if (b.type === "p") return <p key={i}>{b.text}</p>;
        if (b.type === "h")
          return (
            <h4 key={i} className="!mt-7 flex items-center gap-2 text-[15.5px]">
              <span className="h-3.5 w-[3px] rounded-full bg-accent" />
              {b.text}
            </h4>
          );
        if (b.type === "list")
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        if (b.type === "code") return <CodeBlock key={i} lang={b.lang} lines={b.lines} />;
        const { Icon, color, label } = CALLOUT[b.tone];
        return (
          <div
            key={i}
            className="my-4 flex gap-3 rounded-xl border p-4"
            style={{ borderColor: color + "33", background: color + "0d" }}
          >
            <Icon size={16} style={{ color }} className="mt-0.5 shrink-0" />
            <div>
              <div
                className="mb-1 font-mono text-[10.5px] tracking-widest"
                style={{ color }}
              >
                {label.toUpperCase()}
              </div>
              <div className="text-[13.5px] leading-relaxed text-fg-2">{b.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
