import type { CalloutBlock, CalloutTone, ContentBlock } from "@/data/tracks";

export type { CalloutBlock, CalloutTone };

export const CALLOUT_META = {
  tip: { label: "小技巧", color: "var(--color-accent)" },
  warn: { label: "注意", color: "var(--color-amber)" },
  info: { label: "補充", color: "var(--color-blue)" },
} as const;

export function isCallout(block: ContentBlock): block is CalloutBlock {
  return block.type === "callout";
}

export function splitLessonContent(blocks: ContentBlock[]) {
  return {
    body: blocks.filter((b) => !isCallout(b)),
    callouts: blocks.filter(isCallout),
  };
}

export function emptyCallout(tone: CalloutTone = "tip"): CalloutBlock {
  return { type: "callout", tone, text: "" };
}

export function keepFilledBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter((b) => {
    if (b.type === "code") return b.lines.some((l) => l.trim());
    if (b.type === "list") return b.items.some((l) => l.trim());
    return b.text.trim().length > 0;
  });
}
