/**
 * 講義用的小範圍 Markdown ↔ 既有 ContentBlock。
 * 存進資料庫的還是區塊，後台用一篇 Markdown 編。
 *
 *   ## 小標題
 *   段落
 *   - 條列
 *   ```sql
 *   SELECT 1
 *   ```
 *   > [tip] 小技巧（後台另有獨立欄位，這是相容寫法）
 *   > [warn] 注意
 *   > [info] 補充
 */
import type { ContentBlock } from "@/data/tracks";

const CALLOUT = /^(tip|warn|info)$/i;

export function markdownToBlocks(src: string): ContentBlock[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "text";
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang, lines: body.length ? body : [""] });
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "h", text: heading[1].trim() });
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.startsWith(">")) {
      const first = line.replace(/^>\s?/, "");
      const tagged = first.match(/^\[(tip|warn|info)\]\s*(.*)$/i);
      const tone = tagged && CALLOUT.test(tagged[1]) ? (tagged[1].toLowerCase() as "tip" | "warn" | "info") : "info";
      const texts = [tagged ? tagged[2] : first];
      i += 1;
      while (i < lines.length && lines[i].startsWith(">")) {
        texts.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "callout", tone, text: texts.join("\n").trim() });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith(">") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }

  return blocks;
}

export function blocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h":
          return "## " + b.text;
        case "p":
          return b.text;
        case "code":
          return "```" + (b.lang || "text") + "\n" + b.lines.join("\n") + "\n```";
        case "list":
          return b.items.map((it) => "- " + it).join("\n");
        case "callout":
          return ("> [" + b.tone + "] " + b.text).replace(/\n/g, "\n> ");
      }
    })
    .filter((s) => s.length > 0)
    .join("\n\n");
}
