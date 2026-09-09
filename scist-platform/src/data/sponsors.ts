export interface SponsorTier {
  id: string;
  name: string;
  min: string;
  color: string;
  perks: string[];
}

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    id: "gold",
    name: "黃金贊助",
    min: "10 萬元以上",
    color: "#ffb84d",
    perks: [
      "Logo 置於平台首頁 Banner（最顯眼位置）",
      "年度「SCIST 盃」冠名權",
      "優先招募學員管道（內部推薦）",
      "企業資安實習分享場次（年度一次）",
    ],
  },
  {
    id: "silver",
    name: "白銀贊助",
    min: "5 萬元以上",
    color: "#c7d2e0",
    perks: [
      "Logo 置於平台贊助商區",
      "Discord 社群「贊助夥伴」頻道曝光",
      "SCIST 官方社群媒體感謝貼文",
    ],
  },
  {
    id: "bronze",
    name: "銅牌贊助",
    min: "2 萬元以上",
    color: "#d99b6c",
    perks: ["講義與教材內頁 Logo 露出", "SCIST 活動場合品牌曝光"],
  },
];

export const TARGET_SPONSORS = [
  "AIS3 計畫",
  "奧義智慧 DEVCORE",
  "中華資安國際",
  "叡揚資訊",
  "趨勢科技教育基金會",
];
