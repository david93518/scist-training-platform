export interface Instructor {
  id: string;
  name: string;
  handle: string;
  role: string;
  domains: string[];
  bio: string;
  creds: string[];
  accent: string;
}

/** Fictional instructor personas for the demo (not real people). */
export const INSTRUCTORS: Instructor[] = [
  {
    id: "n0ir",
    name: "林則安",
    handle: "n0ir",
    role: "Web / 平台核心講師",
    domains: ["web"],
    bio: "把每一個 HTTP request 拆開講給你聽。相信「看得懂封包，就不怕任何網頁題」。",
    creds: ["HITCON CTF 決賽隊員", "前 SCIST 總召", "Bug Bounty 名人堂"],
    accent: "#a4f13b",
  },
  {
    id: "moka",
    name: "陳沐可",
    handle: "moka",
    role: "Crypto 講師",
    domains: ["crypto"],
    bio: "數學不好也能學密碼學。用生活比喻把 RSA 講到你笑出來。",
    creds: ["AIS3 Pre-Exam 全國第 6", "台大資工"],
    accent: "#3ee8d5",
  },
  {
    id: "vex",
    name: "黃韋辰",
    handle: "vex",
    role: "Reverse / Pwn 講師",
    domains: ["reverse", "pwn"],
    bio: "組合語言是母語。從 stack overflow 到 heap 利用，一行一行帶你踩。",
    creds: ["DEFCON CTF 參賽", "CVE 發現者 x3"],
    accent: "#b983ff",
  },
  {
    id: "tux",
    name: "吳定樺",
    handle: "tux",
    role: "Linux & Misc 講師",
    domains: ["linux"],
    bio: "終端機控。鑑識、OSINT、隱寫術樣樣來，最愛看學員第一次 root 的表情。",
    creds: ["鐵人賽冠軍", "SCIST 助教導師"],
    accent: "#ffb84d",
  },
];

export function instructorById(id: string) {
  return INSTRUCTORS.find((i) => i.id === id);
}
