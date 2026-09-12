/**
 * The challenge arena — the "題目" half of the platform.
 *
 * Flags are stored as SHA-256 digests so the plaintext is never shipped to the
 * browser in readable form. In production these records come from CTFd and the
 * grading happens server-side (see lib/ctfd.ts).
 */
import type { Difficulty } from "@/lib/xp";

export type Category = "web" | "crypto" | "reverse" | "pwn" | "linux" | "misc";

export const CATEGORY_META: Record<
  Category,
  { label: string; en: string; color: string; icon: string }
> = {
  web: { label: "網頁", en: "Web", color: "#a4f13b", icon: "Globe" },
  crypto: { label: "密碼學", en: "Crypto", color: "#3ee8d5", icon: "KeyRound" },
  reverse: { label: "逆向", en: "Reverse", color: "#b983ff", icon: "Binary" },
  pwn: { label: "Pwn", en: "Pwn", color: "#ff6fb5", icon: "Bug" },
  linux: { label: "Linux", en: "Linux", color: "#ffb84d", icon: "Terminal" },
  misc: { label: "雜項", en: "Misc", color: "#4da3ff", icon: "Puzzle" },
};

export interface Hint {
  id: string;
  /** seed only. The browser gets the text from /api/challenges/{slug}/hints after paying for it */
  text?: string;
  /** XP deducted when revealed */
  cost: number;
}

export interface FlagSpec {
  id: string;
  label: string;
  /** seed only. Never sent to the browser: flags are checked on the server */
  sha256?: string;
  points: number;
}

export interface Challenge {
  id: string;
  slug: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  /** "challenge" = single artifact; "box" = a machine with user + root */
  kind: "challenge" | "box";
  blurb: string;
  description: string[];
  hints: Hint[];
  flags: FlagSpec[];
  points: number;
  solves: number;
  rating: number;
  authorId: string;
  tags: string[];
  releasedAt: string;
  firstBlood?: { handle: string; school: string; time: string };
  /** connection info shown once an instance is spawned */
  connection?: { type: "http" | "nc" | "ssh"; value: string };
  files?: string[];
  /** download URLs by file name, filled in when the attachment lives in R2 */
  fileUrls?: Record<string, string | null>;
  /** the tutorial challenge literally hands you the flag */
  tutorial?: boolean;
  /** linked lesson slug, "track/lesson" */
  lesson?: string;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "c-welcome",
    slug: "welcome",
    name: "Welcome to the Gate",
    category: "misc",
    difficulty: "easy",
    kind: "challenge",
    blurb: "第一題永遠最簡單：學會怎麼提交 flag。",
    description: [
      "歡迎推開第一道門。這題不考技術，只教你這個平台怎麼運作。",
      "在 CTF 裡，每一題的目標都是找出一段特定格式的字串，我們叫它 flag。SCIST 的格式固定是大寫 SCIST 加上大括號包住的內容。",
      "這一次我們直接把答案給你：SCIST{w3lc0m3_t0_th3_g4t3}",
      "把它貼進下面的提交欄，按下送出。恭喜，你完成了人生第一個 CTF 題目。",
    ],
    hints: [],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "7f01682bf1a951e20b7da18bf5404b40a9715c6b7a327ae68e037138a7e0344a",
        points: 50,
      },
    ],
    points: 50,
    solves: 1284,
    rating: 4.9,
    authorId: "tux",
    tags: ["新手上路", "教學"],
    releasedAt: "2026-01-05T00:00:00+08:00",
    tutorial: true,
  },
  {
    id: "c-robots",
    slug: "robots-rule",
    name: "Robots Rule",
    category: "web",
    difficulty: "easy",
    kind: "challenge",
    blurb: "網站叫爬蟲別看的地方，通常最有看頭。",
    description: [
      "這個網站的管理員很守規矩，把不想被搜尋引擎收錄的路徑都寫進了 robots.txt。",
      "問題是，robots.txt 本身是公開的。",
      "去看看他不想讓你看的是什麼。",
    ],
    hints: [
      { id: "h1", text: "試著在網址後面加上 /robots.txt。", cost: 10 },
      { id: "h2", text: "Disallow 後面那一行就是入口。直接把它接在網域後面訪問。", cost: 25 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "5b0a9e4fef22155bf441a2d190549fa5225a8e005967d92c2c90173ab4d84a23",
        points: 100,
      },
    ],
    points: 100,
    solves: 926,
    rating: 4.6,
    authorId: "n0ir",
    tags: ["OSINT", "資訊洩漏"],
    releasedAt: "2026-01-08T00:00:00+08:00",
    firstBlood: { handle: "ch3n", school: "南一中", time: "2026-01-08T00:04:12+08:00" },
    connection: { type: "http", value: "http://robots.gate.scist.org:31337" },
    lesson: "web-security/http-basics",
  },
  {
    id: "c-cookie",
    slug: "cookie-monster",
    name: "Cookie Monster",
    category: "web",
    difficulty: "easy",
    kind: "challenge",
    blurb: "伺服器問你是不是 admin，而它只看 cookie。",
    description: [
      "這個後台用一個 cookie 來記錄你是不是管理員。",
      "它沒有簽章，沒有加密，就是明明白白一個值。",
      "你會怎麼做？",
    ],
    hints: [
      { id: "h1", text: "打開開發者工具的 Application 分頁，看看 Cookies 裡面存了什麼。", cost: 10 },
      { id: "h2", text: "把 role 的值從 guest 改成 admin，重新整理。", cost: 25 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "eb97735ee60cc3228f044633c2dfb4a9a18e573db3139513dc330fa4f42d4fed",
        points: 100,
      },
    ],
    points: 100,
    solves: 812,
    rating: 4.5,
    authorId: "n0ir",
    tags: ["Cookie", "認證繞過"],
    releasedAt: "2026-01-12T00:00:00+08:00",
    firstBlood: { handle: "aylin", school: "雄女", time: "2026-01-12T00:07:40+08:00" },
    connection: { type: "http", value: "http://cookie.gate.scist.org:31338" },
  },
  {
    id: "c-sqli",
    slug: "sqli-login",
    name: "Login Bypass",
    category: "web",
    difficulty: "medium",
    kind: "challenge",
    blurb: "一個引號，換一張管理員的門票。",
    description: [
      "一個看起來很普通的登入表單，背後把你的輸入直接串進了 SQL 查詢。",
      "你沒有帳號密碼，但你有 SQL 語法。",
      "以 admin 的身分登入，flag 就在後台首頁。",
    ],
    hints: [
      { id: "h1", text: "先在帳號欄輸入一個單引號，看看伺服器有沒有噴錯。噴錯就代表有救。", cost: 15 },
      { id: "h2", text: "想辦法讓 WHERE 條件恆為真，或是把後面的密碼比對註解掉。", cost: 30 },
      { id: "h3", text: "帳號欄輸入 admin 後面接單引號跟兩個減號，密碼隨便填。", cost: 60 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "f6a6ad9ca4c758fc8a3790ca7f5f3dc8aca6b155dbee0d2e5c33f408fe4d9ca6",
        points: 250,
      },
    ],
    points: 250,
    solves: 534,
    rating: 4.8,
    authorId: "n0ir",
    tags: ["SQL Injection", "認證繞過"],
    releasedAt: "2026-01-15T00:00:00+08:00",
    firstBlood: { handle: "0xkuma", school: "雄中", time: "2026-01-15T00:11:03+08:00" },
    connection: { type: "http", value: "http://sqli.gate.scist.org:31401" },
    lesson: "web-security/sql-injection",
  },
  {
    id: "c-xss",
    slug: "stored-xss",
    name: "留言板的惡意",
    category: "web",
    difficulty: "medium",
    kind: "challenge",
    blurb: "管理員每分鐘都會看一次留言。你要留什麼？",
    description: [
      "這是一個留言板，任何人都能留言，管理員每分鐘會檢查一次新留言。",
      "管理員的 cookie 裡有你要的東西。",
      "留一則會在管理員瀏覽器上執行的留言，把 cookie 送到你控制的位址。",
    ],
    hints: [
      { id: "h1", text: "留言內容沒有做 HTML escaping，試著留一個 script 標籤。", cost: 15 },
      { id: "h2", text: "用 fetch 或 img 的 src 把 document.cookie 帶到你的 webhook。", cost: 35 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "5a1241765e76b5141d1f189c5fa5a3b4b9495065bb4e8d4ea48eab66bba24d4d",
        points: 250,
      },
    ],
    points: 250,
    solves: 388,
    rating: 4.7,
    authorId: "n0ir",
    tags: ["XSS", "Stored", "Cookie"],
    releasedAt: "2026-01-19T00:00:00+08:00",
    firstBlood: { handle: "ch3n", school: "南一中", time: "2026-01-19T00:26:55+08:00" },
    connection: { type: "http", value: "http://board.gate.scist.org:31455" },
    lesson: "web-security/xss",
  },
  {
    id: "c-ssti",
    slug: "ssti-bakery",
    name: "The Bakery",
    category: "web",
    difficulty: "hard",
    kind: "challenge",
    blurb: "輸入 7 乘 7，如果它回你 49，那就有得玩了。",
    description: [
      "一間線上蛋糕店，會把你的名字印在訂單確認頁上。",
      "它用樣板引擎產生頁面，而你的名字直接進了樣板字串。",
      "從探測到 RCE，走完整條鏈。",
    ],
    hints: [
      { id: "h1", text: "先用雙大括號包住一個算式，確認輸入有沒有被當成程式碼。", cost: 20 },
      { id: "h2", text: "Jinja2 的物件繼承鏈是你的路，從一個空字串的 class 開始往上爬。", cost: 45 },
      { id: "h3", text: "找到 subprocess.Popen 之後就能執行指令了。", cost: 90 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "992eac07ad7a248d69a0b84ee99100438d1db8fe24fda68026ba17cfc7b38a5c",
        points: 500,
      },
    ],
    points: 500,
    solves: 96,
    rating: 4.9,
    authorId: "n0ir",
    tags: ["SSTI", "Jinja2", "RCE"],
    releasedAt: "2026-02-02T00:00:00+08:00",
    firstBlood: { handle: "0xkuma", school: "雄中", time: "2026-02-02T02:41:19+08:00" },
    connection: { type: "http", value: "http://bakery.gate.scist.org:31502" },
    lesson: "web-security/ssti",
  },
  {
    id: "c-caesar",
    slug: "caesar-salad",
    name: "Caesar Salad",
    category: "crypto",
    difficulty: "easy",
    kind: "challenge",
    blurb: "兩千年前的密碼，兩秒鐘就能破。",
    description: [
      "羅馬人用它傳軍情，你用一個 for 迴圈就能破它。",
      "密文在附件裡，位移量未知。",
      "把 26 種都印出來，用眼睛找出讀得通的那一行。",
    ],
    hints: [{ id: "h1", text: "位移量在 10 到 20 之間。", cost: 10 }],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "68b19bd8bed1c8db0f8701f275c9492ae9f7f4f69222c08019ada1ee6d318106",
        points: 100,
      },
    ],
    points: 100,
    solves: 741,
    rating: 4.3,
    authorId: "moka",
    tags: ["古典密碼", "暴力破解"],
    releasedAt: "2026-01-10T00:00:00+08:00",
    files: ["cipher.txt"],
    lesson: "cryptography/classical",
  },
  {
    id: "c-xor",
    slug: "one-time-xor",
    name: "One Time XOR",
    category: "crypto",
    difficulty: "easy",
    kind: "challenge",
    blurb: "同一把金鑰用第二次，就不是一次性密碼本了。",
    description: [
      "訊息用單一位元組的金鑰做了 XOR。",
      "XOR 是可逆的，而且金鑰只有 256 種可能。",
      "你知道明文一定包含 SCIST 這五個字元，用它當作驗證條件。",
    ],
    hints: [{ id: "h1", text: "跑遍 0 到 255，每次都檢查解出來的內容有沒有包含 SCIST。", cost: 15 }],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "fab172f20bbe8e43c5862e5e89551a5ed1f6bcebcabe5fab2040d17fa2c45576",
        points: 100,
      },
    ],
    points: 100,
    solves: 655,
    rating: 4.4,
    authorId: "moka",
    tags: ["XOR", "已知明文"],
    releasedAt: "2026-01-14T00:00:00+08:00",
    files: ["out.bin"],
  },
  {
    id: "c-rsa",
    slug: "smol-rsa",
    name: "Smol RSA",
    category: "crypto",
    difficulty: "medium",
    kind: "challenge",
    blurb: "e 等於 3，訊息又很短。你知道該怎麼做。",
    description: [
      "公鑰的 e 是 3，訊息短到三次方都還沒超過 n。",
      "也就是說，模運算根本沒發生。",
      "開個立方根就好。",
    ],
    hints: [
      { id: "h1", text: "檢查 c 的三次方根是不是整數。", cost: 20 },
      { id: "h2", text: "gmpy2 的 iroot 可以做高精度整數開根號。", cost: 40 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "d759354598506f57f2395ae6cb0f8e2829b191a7aaf865562ddac3b6ae95ab2b",
        points: 250,
      },
    ],
    points: 250,
    solves: 302,
    rating: 4.8,
    authorId: "moka",
    tags: ["RSA", "低指數攻擊"],
    releasedAt: "2026-01-22T00:00:00+08:00",
    files: ["params.txt"],
    lesson: "cryptography/rsa",
  },
  {
    id: "c-ecb",
    slug: "ecb-oracle",
    name: "ECB Oracle",
    category: "crypto",
    difficulty: "hard",
    kind: "challenge",
    blurb: "一次問出一個位元組，直到整個秘密都是你的。",
    description: [
      "伺服器會把你的輸入接上一段秘密，然後用 AES-ECB 加密回傳。",
      "ECB 模式相同的明文區塊會產生相同的密文區塊。",
      "利用這個特性，一次一個位元組把秘密問出來。",
    ],
    hints: [
      { id: "h1", text: "送出 16 個相同字元，觀察密文有沒有出現重複的區塊。", cost: 25 },
      { id: "h2", text: "控制對齊，讓秘密的第一個位元組剛好落在區塊邊界，再暴力猜那一格。", cost: 55 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "a0a3def57a864a2a92964b4ef88a8bfa22b43e141e798e1876a0ec6fc5b05ed3",
        points: 500,
      },
    ],
    points: 500,
    solves: 74,
    rating: 4.9,
    authorId: "moka",
    tags: ["AES", "ECB", "Oracle"],
    releasedAt: "2026-02-09T00:00:00+08:00",
    connection: { type: "nc", value: "nc ecb.gate.scist.org 32001" },
  },
  {
    id: "c-strings",
    slug: "strings-attached",
    name: "Strings Attached",
    category: "reverse",
    difficulty: "easy",
    kind: "challenge",
    blurb: "別急著開反組譯器，先掃一遍字串。",
    description: [
      "一個小小的執行檔，會問你密碼。",
      "但作者忘了一件事：比對用的字串就明明白白編譯在裡面。",
      "你甚至不用執行它。",
    ],
    hints: [{ id: "h1", text: "strings 之後接 grep 過濾關鍵字。", cost: 10 }],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "0e138e256ebd0a513e5edb58285ff59675bfd0675d7b3fe06d0f170b76e334ec",
        points: 100,
      },
    ],
    points: 100,
    solves: 698,
    rating: 4.5,
    authorId: "vex",
    tags: ["strings", "靜態分析"],
    releasedAt: "2026-01-11T00:00:00+08:00",
    files: ["checker"],
    lesson: "reverse-engineering/strings-first",
  },
  {
    id: "c-step",
    slug: "step-by-step",
    name: "Step by Step",
    category: "reverse",
    difficulty: "medium",
    kind: "challenge",
    blurb: "靜態看不出來，就讓它跑給你看。",
    description: [
      "這支程式會把你的輸入做一連串變換，再跟某個東西比對。",
      "反組譯的結果看起來很痛苦。",
      "但如果你在 cmp 那行設中斷點，答案會自己出現在暫存器裡。",
    ],
    hints: [
      { id: "h1", text: "用 gdb 載入，在比較指令的位址設中斷點。", cost: 20 },
      { id: "h2", text: "斷下來之後看第二個運算元指向的記憶體內容。", cost: 40 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "5bfb4cf145de86760075dd6c6ef2dea1c15503ffdbfefdeda29f966f5f34ce5e",
        points: 250,
      },
    ],
    points: 250,
    solves: 245,
    rating: 4.7,
    authorId: "vex",
    tags: ["GDB", "動態分析"],
    releasedAt: "2026-01-25T00:00:00+08:00",
    files: ["stepper"],
    lesson: "reverse-engineering/gdb-basics",
  },
  {
    id: "c-vm",
    slug: "tiny-vm",
    name: "Tiny VM",
    category: "reverse",
    difficulty: "hard",
    kind: "challenge",
    blurb: "作者自己寫了一台虛擬機。你得先看懂它的指令集。",
    description: [
      "這支程式裡有一台自製的虛擬機，flag 檢查邏輯是用它的位元組碼寫的。",
      "你要先逆向出指令集，再逆向那段位元組碼。",
      "耐心是唯一的工具。",
    ],
    hints: [
      { id: "h1", text: "找到那個大的 switch 或跳表，每個 case 就是一條指令。", cost: 30 },
      { id: "h2", text: "把位元組碼反組譯成人看得懂的形式，再一步步推回輸入。", cost: 70 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "02301bcef234d39c1f7fb3c514d9dbbff5612a465b5c95f440b338c265b15025",
        points: 500,
      },
    ],
    points: 500,
    solves: 41,
    rating: 5.0,
    authorId: "vex",
    tags: ["VM", "位元組碼", "硬派"],
    releasedAt: "2026-02-16T00:00:00+08:00",
    files: ["tinyvm"],
  },
  {
    id: "c-smash",
    slug: "smash-101",
    name: "Smash 101",
    category: "pwn",
    difficulty: "easy",
    kind: "challenge",
    blurb: "第一次讓程式崩潰，是一種浪漫。",
    description: [
      "一個 32 位元組的 buffer，一個沒有長度檢查的讀取。",
      "先把它弄崩潰，觀察崩潰時的狀態。",
      "然後把某個變數蓋成它檢查的那個值。",
    ],
    hints: [
      { id: "h1", text: "用 cyclic 產生的字串當輸入，崩潰後用崩潰值反查位移。", cost: 15 },
      { id: "h2", text: "buffer 之後 8 個位元組就是那個變數。", cost: 35 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "a98f785eaf083cd2e84d991259225b0538d3ef662890117f13b81af30bd8f96c",
        points: 100,
      },
    ],
    points: 100,
    solves: 421,
    rating: 4.6,
    authorId: "vex",
    tags: ["Buffer Overflow", "入門"],
    releasedAt: "2026-01-18T00:00:00+08:00",
    connection: { type: "nc", value: "nc pwn.gate.scist.org 32101" },
    files: ["smash"],
    lesson: "pwnable/memory-model",
  },
  {
    id: "c-ret2win",
    slug: "ret2win",
    name: "ret2win",
    category: "pwn",
    difficulty: "medium",
    kind: "challenge",
    blurb: "程式裡有個函式從來沒被呼叫過。去呼叫它。",
    description: [
      "有一個函式會印出 flag，但主流程永遠不會走到它。",
      "你有一個溢位，可以蓋掉返回位址。",
      "把它指向該去的地方。",
    ],
    hints: [
      { id: "h1", text: "先用 objdump 或 nm 找出那個函式的位址。", cost: 20 },
      { id: "h2", text: "到返回位址的距離是 40 個位元組。", cost: 45 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "546804fcd2fef7d334d6b06c15c57cccc96d29458b29a501c831ce14cd0cd9df",
        points: 250,
      },
    ],
    points: 250,
    solves: 268,
    rating: 4.9,
    authorId: "vex",
    tags: ["ret2win", "控制流劫持"],
    releasedAt: "2026-01-27T00:00:00+08:00",
    connection: { type: "nc", value: "nc pwn.gate.scist.org 32102" },
    files: ["vuln", "libc.so.6"],
    lesson: "pwnable/ret2win",
  },
  {
    id: "c-rop",
    slug: "rop-buffet",
    name: "ROP Buffet",
    category: "pwn",
    difficulty: "hard",
    kind: "challenge",
    blurb: "沒有現成的勝利函式，就自己用碎片拼一個。",
    description: [
      "這次沒有好心的函式等著你，而且堆疊不可執行。",
      "但二進位檔裡有一堆以 ret 結尾的小片段。",
      "把它們串起來，做出你要的系統呼叫。",
    ],
    hints: [
      { id: "h1", text: "用 ROPgadget 或 ropper 把所有 gadget 列出來。", cost: 25 },
      { id: "h2", text: "目標是湊出 execve 的參數，或先洩漏 libc 位址。", cost: 60 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "d97debd522c0b0312b15cb8f997bb9de077920d415d37716def7f4bf95abf37f",
        points: 500,
      },
    ],
    points: 500,
    solves: 63,
    rating: 4.9,
    authorId: "vex",
    tags: ["ROP", "NX", "gadget"],
    releasedAt: "2026-02-11T00:00:00+08:00",
    connection: { type: "nc", value: "nc pwn.gate.scist.org 32103" },
    files: ["buffet", "libc.so.6"],
  },
  {
    id: "c-tcache",
    slug: "tcache-poison",
    name: "Tcache Poisoning",
    category: "pwn",
    difficulty: "insane",
    kind: "challenge",
    blurb: "堆積管理器信任了它不該信任的指標。",
    description: [
      "一個經典的筆記本程式，有 use-after-free。",
      "利用 tcache 的單向串列，把配置器騙去回傳任意位址。",
      "這題會花掉你一個週末。值得。",
    ],
    hints: [
      { id: "h1", text: "free 之後指標沒有清空，你還能繼續操作那塊記憶體。", cost: 40 },
      { id: "h2", text: "覆寫 tcache entry 的 next 指標，下一次 malloc 就會拿到你指定的位址。", cost: 100 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "7cb0241aa788c3d6b69c286a8900269e80a4e5128ec43dc87c2ec3d4a891fbca",
        points: 900,
      },
    ],
    points: 900,
    solves: 12,
    rating: 5.0,
    authorId: "vex",
    tags: ["Heap", "UAF", "tcache"],
    releasedAt: "2026-02-23T00:00:00+08:00",
    connection: { type: "nc", value: "nc pwn.gate.scist.org 32104" },
    files: ["notebook", "libc.so.6"],
  },
  {
    id: "c-find",
    slug: "find-me",
    name: "Find Me",
    category: "linux",
    difficulty: "easy",
    kind: "challenge",
    blurb: "檔案就在機器上，你只是還不知道在哪。",
    description: [
      "登入這台機器，flag 藏在檔案系統的某個角落。",
      "檔名不一定叫 flag，但內容一定符合格式。",
      "find 跟 grep 是你的眼睛。",
    ],
    hints: [
      { id: "h1", text: "遞迴用 grep 搜尋內容含 SCIST 大括號的檔案，記得把錯誤訊息濾掉。", cost: 10 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "86e30c964ccbf561d6011ed95ef8683f66fce4716ff4c20664e55c643b7cc372",
        points: 100,
      },
    ],
    points: 100,
    solves: 707,
    rating: 4.4,
    authorId: "tux",
    tags: ["find", "grep", "基礎"],
    releasedAt: "2026-01-09T00:00:00+08:00",
    connection: { type: "ssh", value: "ssh player@linux.gate.scist.org -p 32201" },
    lesson: "linux-misc/cli-basics",
  },
  {
    id: "c-suid",
    slug: "suid-slip",
    name: "SUID Slip",
    category: "linux",
    difficulty: "medium",
    kind: "challenge",
    blurb: "一個設錯權限的執行檔，就是一條提權的路。",
    description: [
      "你以低權限使用者登入，flag 只有 root 讀得到。",
      "系統上有個 SUID 執行檔，它做的事情比它該做的多。",
      "找出來，用它。",
    ],
    hints: [
      { id: "h1", text: "用 find 搜尋整台機器上有 SUID 位元的檔案。", cost: 20 },
      { id: "h2", text: "GTFOBins 上有這支程式的提權用法。", cost: 45 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "b400635f215e6433f06e5eb5c6ad5caafe4769a9e0c02252d49182f33bbaac11",
        points: 250,
      },
    ],
    points: 250,
    solves: 219,
    rating: 4.8,
    authorId: "tux",
    tags: ["提權", "SUID", "GTFOBins"],
    releasedAt: "2026-01-30T00:00:00+08:00",
    connection: { type: "ssh", value: "ssh player@linux.gate.scist.org -p 32202" },
  },
  {
    id: "c-pcap",
    slug: "follow-the-stream",
    name: "Follow the Stream",
    category: "misc",
    difficulty: "medium",
    kind: "challenge",
    blurb: "有人在未加密的連線上傳了不該傳的東西。",
    description: [
      "這是一段封包側錄。",
      "其中一個連線用明文傳輸了敏感資料。",
      "把那條 TCP 串流追出來。",
    ],
    hints: [
      { id: "h1", text: "在 Wireshark 裡對可疑封包按右鍵，選擇追蹤 TCP 串流。", cost: 20 },
      { id: "h2", text: "先用過濾器只看 HTTP 或 FTP 流量，範圍會小很多。", cost: 40 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "d034cf1b754dce9cf21e07593848a5a3c18602dc3d9408b5f761d7b60e93b157",
        points: 250,
      },
    ],
    points: 250,
    solves: 287,
    rating: 4.6,
    authorId: "tux",
    tags: ["鑑識", "Wireshark", "封包"],
    releasedAt: "2026-01-24T00:00:00+08:00",
    files: ["capture.pcapng"],
  },
  {
    id: "c-stego",
    slug: "hidden-in-plain",
    name: "Hidden in Plain Sight",
    category: "misc",
    difficulty: "medium",
    kind: "challenge",
    blurb: "一張貓的照片，肚子裡有東西。",
    description: [
      "看起來就是一張普通的貓照。",
      "檔案大小卻大得可疑。",
      "圖片格式的結尾標記之後，還有東西。",
    ],
    hints: [
      { id: "h1", text: "用 binwalk 掃一下，看有沒有夾帶其他檔案簽章。", cost: 15 },
      { id: "h2", text: "夾帶的壓縮檔有密碼，密碼在圖片的 metadata 裡。", cost: 40 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "9ea9951122128f77ba3c83aba3b3dec89f944fa451fe480e298d970e28b802a2",
        points: 250,
      },
    ],
    points: 250,
    solves: 331,
    rating: 4.5,
    authorId: "tux",
    tags: ["隱寫術", "binwalk", "exiftool"],
    releasedAt: "2026-01-21T00:00:00+08:00",
    files: ["cat.jpg"],
    lesson: "linux-misc/steganography",
  },
  {
    id: "c-osint",
    slug: "where-was-i",
    name: "Where Was I",
    category: "misc",
    difficulty: "medium",
    kind: "challenge",
    blurb: "照片會記得你去過哪裡，即使你忘了。",
    description: [
      "一張在台南某處拍的照片。",
      "拍攝者沒有清掉 metadata。",
      "找出拍攝地點的名稱，包成 flag 格式提交。",
    ],
    hints: [
      { id: "h1", text: "exiftool 會列出 GPS 座標。", cost: 15 },
      { id: "h2", text: "把座標貼進地圖服務，看看那個位置是什麼地標。", cost: 30 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "4b5e768f9a601aa9b2b3548c5242680a6e178b47f600597d7ced5024ad5959e3",
        points: 250,
      },
    ],
    points: 250,
    solves: 264,
    rating: 4.4,
    authorId: "tux",
    tags: ["OSINT", "EXIF", "地理定位"],
    releasedAt: "2026-02-04T00:00:00+08:00",
    files: ["photo.jpg"],
  },
  {
    id: "c-git",
    slug: "git-happens",
    name: "Git Happens",
    category: "misc",
    difficulty: "easy",
    kind: "challenge",
    blurb: "他把密鑰 commit 上去了，然後刪掉。歷史還記得。",
    description: [
      "開發者不小心把設定檔連同 API 金鑰 commit 進了公開倉庫。",
      "他下一個 commit 就刪掉了。",
      "但 git 的歷史不會忘記。",
    ],
    hints: [
      { id: "h1", text: "看看 git log 的完整歷史，特別是被刪掉的那個檔案。", cost: 10 },
      { id: "h2", text: "用 git show 加上那個 commit 的雜湊值，就能看到當時的內容。", cost: 25 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "e0f4fd66bdab1a8a9ccc1bd80f668f706a659ec91170f67882c742c56ebefe4c",
        points: 100,
      },
    ],
    points: 100,
    solves: 592,
    rating: 4.7,
    authorId: "n0ir",
    tags: ["git", "資訊洩漏", "供應鏈"],
    releasedAt: "2026-01-16T00:00:00+08:00",
    files: ["repo.zip"],
  },
  {
    id: "c-jail",
    slug: "escape-room",
    name: "Escape Room",
    category: "misc",
    difficulty: "hard",
    kind: "challenge",
    blurb: "一個把你關起來的 Python 沙箱。門把在你手上。",
    description: [
      "這是一個 Python jail，import 被擋、大部分內建函式被拿掉。",
      "但只要你還能求值，你就還有路。",
      "逃出去，讀取 flag 檔案。",
    ],
    hints: [
      { id: "h1", text: "從物件的繼承鏈往上爬，找回被拿掉的東西。", cost: 30 },
      { id: "h2", text: "字典查找與底線開頭的屬性通常沒被過濾乾淨。", cost: 65 },
    ],
    flags: [
      {
        id: "flag",
        label: "Flag",
        sha256: "557495342884ff0f159a48dcc5565ba236b2d5b9bf987b25087330a167c23814",
        points: 500,
      },
    ],
    points: 500,
    solves: 58,
    rating: 4.8,
    authorId: "moka",
    tags: ["沙箱逃逸", "Python"],
    releasedAt: "2026-02-14T00:00:00+08:00",
    connection: { type: "nc", value: "nc jail.gate.scist.org 32301" },
  },
  {
    id: "b-anping",
    slug: "box-anping",
    name: "Anping",
    category: "linux",
    difficulty: "medium",
    kind: "box",
    blurb: "一台完整的機器。從外網打進去，再從使用者升到 root。",
    description: [
      "Anping 是一台模擬真實環境的 Linux 機器，取名自安平。",
      "你要自己做資訊收集、找到入口、拿到 shell，再想辦法提權。",
      "兩個 flag：user 在一般使用者家目錄，root 在 root 家目錄。",
    ],
    hints: [
      { id: "h1", text: "先掃 port。有一個高位 port 跑著沒更新的網頁服務。", cost: 25 },
      { id: "h2", text: "拿到 shell 之後檢查排程任務，有個腳本用了你可以寫入的檔案。", cost: 60 },
    ],
    flags: [
      {
        id: "user",
        label: "User Flag",
        sha256: "5f2c0ba2904b8bc32a200d851f3173aa2a6c66e2d88c7c4e1019ab3b0b5f5239",
        points: 200,
      },
      {
        id: "root",
        label: "Root Flag",
        sha256: "e7953d17bee583a1a7bc0048e39601b76780f21d116d1489f8ed66eae6a2cfde",
        points: 300,
      },
    ],
    points: 500,
    solves: 143,
    rating: 4.9,
    authorId: "tux",
    tags: ["Box", "提權", "枚舉"],
    releasedAt: "2026-02-01T00:00:00+08:00",
    firstBlood: { handle: "0xkuma", school: "雄中", time: "2026-02-01T01:52:07+08:00" },
    connection: { type: "ssh", value: "10.31.4.21" },
  },
  {
    id: "b-cijin",
    slug: "box-cijin",
    name: "Cijin",
    category: "linux",
    difficulty: "hard",
    kind: "box",
    blurb: "旗津。這台比較兇，需要串接兩個漏洞。",
    description: [
      "一台需要鏈式利用的機器。單一漏洞不會讓你拿到 root。",
      "入口是一個檔案上傳，但有嚴格的副檔名檢查。",
      "提權則牽涉到一個設定錯誤的服務。",
    ],
    hints: [
      { id: "h1", text: "上傳檢查只看副檔名，沒看內容，也沒處理雙重副檔名。", cost: 35 },
      { id: "h2", text: "有個服務以 root 執行且設定檔權限過寬。", cost: 75 },
    ],
    flags: [
      {
        id: "user",
        label: "User Flag",
        sha256: "9bcd33d2c3d06f028f1ec710a678564334c96b89f85becf4a8f86bcc4607c64c",
        points: 250,
      },
      {
        id: "root",
        label: "Root Flag",
        sha256: "44d70e61723809a6a5fd3f6b4a42e68e847d672a1466a6eec4d04b5ecde22dec",
        points: 400,
      },
    ],
    points: 650,
    solves: 47,
    rating: 5.0,
    authorId: "vex",
    tags: ["Box", "鏈式利用", "檔案上傳"],
    releasedAt: "2026-02-20T00:00:00+08:00",
    firstBlood: { handle: "ch3n", school: "南一中", time: "2026-02-20T03:18:44+08:00" },
    connection: { type: "ssh", value: "10.31.4.37" },
  },
];

export function challengeBySlug(slug: string) {
  return CHALLENGES.find((c) => c.slug === slug);
}

export function challengesByCategory(category: Category) {
  return CHALLENGES.filter((c) => c.category === category);
}

export const TOTAL_CHALLENGE_POINTS = CHALLENGES.reduce((n, c) => n + c.points, 0);
