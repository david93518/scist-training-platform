"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last resort: the root layout itself failed, so this replaces the whole
 * document. Next does not load globals.css here, which is why the palette is
 * repeated inline instead of using the Tailwind tokens.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="zh-Hant">
      <head>
        <title>出了點問題 · SCIST Gate</title>
        <meta name="color-scheme" content="dark" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "48px 20px",
          background: "#06090e",
          color: "#eef3f9",
          fontFamily: "system-ui, -apple-system, 'Noto Sans TC', sans-serif",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, letterSpacing: "0.2em", color: "#ff5e5e" }}>
            FATAL
          </div>
          <h1 style={{ margin: "18px 0 0", fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em" }}>
            整站掛了
          </h1>
          <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.8, color: "#aab7c7" }}>
            這是連版面都渲染不出來的等級，通常代表資料庫或設定壞了。
            重新整理一次，如果還是這樣，請到 Discord 的 #平台問題 回報。
          </p>

          <div
            style={{
              margin: "28px 0 0",
              padding: "12px 14px",
              textAlign: "left",
              border: "1px solid #1b2432",
              borderRadius: 12,
              background: "#0a0f16",
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: "#6b7a8e",
              wordBreak: "break-all",
            }}
          >
            digest: {error.digest ?? "（本機錯誤，看終端機 log）"}
          </div>

          <div style={{ margin: "28px 0 0", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => retry()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: "#a4f13b",
                color: "#06090e",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              再試一次
            </button>
            {/* a full reload, not client navigation: the React tree that would
                handle a <Link /> is the thing that just crashed */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid #283344",
                color: "#eef3f9",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              回首頁
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
