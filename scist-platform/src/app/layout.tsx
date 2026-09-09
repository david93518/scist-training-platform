import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RevealProvider } from "@/components/reveal-provider";
import { HideOnAdmin } from "@/components/layout/hide-on-admin";
import { ProgressSync } from "@/components/progress-sync";
import { SettingsProvider } from "@/components/settings-provider";
import { getSettingsSafe } from "@/server/repo/settings";
import { siteUrl } from "@/server/env";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

/* CJK glyphs are served in unicode-range slices, so only the needed pieces load. */
const notoTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSettingsSafe();
  const title = site.tagline ? site.name + " — " + site.tagline : site.name;
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: title,
      template: "%s · " + site.name,
    },
    description:
      "SCIST 南臺灣學生資訊社群的線上資安學習平台。影音課程、可實戰的 CTF 題庫、講師直播與 18 校聯防社群，帶高中生從零推開資安的第一道門。",
    keywords: [
      "SCIST", "資安", "CTF", "Web Security", "Cryptography",
      "Reverse Engineering", "Pwn", "高中生", "picoCTF", "台灣",
    ],
    openGraph: {
      title,
      description: "影音課程 × 實戰題庫 × 講師直播 × 18 校聯防社群。台灣高中生的資安起點。",
      type: "website",
      locale: "zh_TW",
      siteName: site.name,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#06090e",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettingsSafe();
  return (
    <html
      lang="zh-Hant"
      // globals.css sets scroll-behavior: smooth, which would otherwise make the
      // scroll-to-top on every route change an animation. Next scrolls instantly
      // when it sees this attribute and leaves in-page anchors smooth.
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${jetbrains.variable} ${notoTC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SettingsProvider value={settings}>
          <RevealProvider>
            <ProgressSync />
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <HideOnAdmin>
              <SiteFooter />
            </HideOnAdmin>
          </RevealProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
