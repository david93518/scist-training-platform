import { ImageResponse } from "next/og";
import { getSettingsSafe } from "@/server/repo/settings";

export const alt = "SCIST Gate — 資安的第一道門";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card Discord and IG show when someone pastes a link.
 *
 * Deliberately Latin-only: ImageResponse renders through Satori, whose bundled
 * font has no CJK glyphs, so Chinese would come out as empty boxes. Adding a
 * Noto Sans TC .ttf under assets/ and passing it in `fonts` would lift that.
 */
export default async function OpengraphImage() {
  const { site } = await getSettingsSafe();
  const [first = "SCIST", ...rest] = site.name.split(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 88px",
          background: "#06090e",
          backgroundImage:
            "radial-gradient(900px 500px at 8% -10%, rgba(164,241,59,0.22), transparent 62%), radial-gradient(700px 460px at 100% 12%, rgba(62,232,213,0.14), transparent 60%)",
          color: "#eef3f9",
          fontFamily: "sans-serif",
        }}
      >
        {/* brand mark: the gate hexagon from the favicon */}
        <svg width="96" height="96" viewBox="0 0 32 32">
          <path d="M16 3.6 L27 10 v12 L16 28.4 L5 22 V10 Z" stroke="#a4f13b" strokeWidth="1.5" opacity="0.55" fill="none" />
          <rect x="14.8" y="9.6" width="2.5" height="13" rx="1.25" fill="#a4f13b" />
          <path d="M11.4 12.9 L8.7 16 l2.7 3.1" stroke="#a4f13b" strokeWidth="1.9" strokeLinecap="round" fill="none" />
          <path d="M20.6 12.9 L23.3 16 l-2.7 3.1" stroke="#a4f13b" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        </svg>

        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 40 }}>
          <span style={{ fontSize: 104, fontWeight: 800, letterSpacing: "-0.03em" }}>{first}</span>
          {rest.length ? (
            <span style={{ fontSize: 104, fontWeight: 800, letterSpacing: "-0.03em", color: "#a4f13b" }}>
              {rest.join(" ")}
            </span>
          ) : null}
        </div>

        <div style={{ fontSize: 34, color: "#aab7c7", marginTop: 20 }}>
          Cybersecurity for Taiwanese high-school students
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 52 }}>
          {["VIDEO COURSES", "CTF ARENA", "LIVE CLINICS", "18 SCHOOLS"].map((t) => (
            <span
              key={t}
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid rgba(164,241,59,0.34)",
                background: "rgba(164,241,59,0.08)",
                color: "#d2ff7a",
                fontSize: 22,
                letterSpacing: "0.12em",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
