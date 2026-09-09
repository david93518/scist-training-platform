/** SCIST 18-school 聯防 network across Chiayi / Tainan / Kaohsiung / Pingtung. */
export interface School {
  id: string;
  name: string;
  short: string;
  region: "嘉義" | "台南" | "高雄" | "屏東";
}

export const SCHOOLS: School[] = [
  { id: "cysh", name: "國立嘉義高中", short: "嘉中", region: "嘉義" },
  { id: "cygsh", name: "國立嘉義女中", short: "嘉女", region: "嘉義" },
  { id: "cvsh", name: "國立華僑高級中等學校", short: "華僑", region: "嘉義" },
  { id: "tnfsh", name: "國立臺南第一高級中學", short: "南一中", region: "台南" },
  { id: "tngs", name: "國立臺南女子高級中學", short: "南女中", region: "台南" },
  { id: "tnssh", name: "國立臺南第二高級中學", short: "南二中", region: "台南" },
  { id: "cjhs", name: "國立長榮高級中學", short: "長榮", region: "台南" },
  { id: "khjh", name: "高雄市立高雄高級中學", short: "雄中", region: "高雄" },
  { id: "kghs", name: "高雄市立高雄女子高級中學", short: "雄女", region: "高雄" },
  { id: "smsh", name: "高雄市立三民高級中學", short: "三民", region: "高雄" },
  { id: "fzsh", name: "高雄市立鳳新高級中學", short: "鳳新", region: "高雄" },
  { id: "nksh", name: "國立岡山高級中學", short: "岡山", region: "高雄" },
  { id: "ptsh", name: "國立屏東高級中學", short: "屏中", region: "屏東" },
  { id: "ptgs", name: "國立屏東女子高級中學", short: "屏女", region: "屏東" },
  { id: "cmsh", name: "國立潮州高級中學", short: "潮州", region: "屏東" },
  { id: "kmvs", name: "國立高雄高級工業職業學校", short: "高工", region: "高雄" },
  { id: "tnvs", name: "國立臺南高級工業職業學校", short: "南工", region: "台南" },
  { id: "cyvs", name: "國立嘉義高級工業職業學校", short: "嘉工", region: "嘉義" },
];

export const REGIONS = ["嘉義", "台南", "高雄", "屏東"] as const;

export function schoolById(id: string) {
  return SCHOOLS.find((s) => s.id === id);
}
