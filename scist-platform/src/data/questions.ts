/**
 * 發問 threads. Attached either to a lesson ("track/lesson") or a challenge slug.
 * Locally posted questions are merged in from the zustand store at render time.
 */
export interface Answer {
  id: string;
  author: string;
  role: "助教" | "講師" | "學員";
  body: string;
  createdAt: string;
  /** 作者改過的時間；有值就在畫面上標「已編輯」 */
  editedAt?: string;
  votes: number;
  accepted?: boolean;
  /** the reader already voted this up */
  voted?: boolean;
  /** the reader wrote this, so they may edit or delete it */
  mine?: boolean;
}

export interface Question {
  id: string;
  scope: "lesson" | "challenge";
  refId: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  editedAt?: string;
  votes: number;
  answers: Answer[];
  voted?: boolean;
  /** the reader asked this, so they may accept an answer, edit or delete it */
  mine?: boolean;
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    scope: "lesson",
    refId: "web-security/sql-injection",
    title: "為什麼我輸入單引號伺服器沒有噴錯？",
    body: "老師說有漏洞的話輸入單引號會噴 500，但我試了它只是說登入失敗。這樣代表沒有漏洞嗎？",
    author: "hana",
    createdAt: "2026-09-06T21:14:00+08:00",
    votes: 12,
    answers: [
      {
        id: "a1",
        author: "n0ir",
        role: "講師",
        body: "不一定。很多網站會把錯誤訊息藏起來（生產環境本來就該這樣），這叫 blind injection。你可以改用時間差來判斷：送一個會讓資料庫睡 5 秒的 payload，如果回應真的慢了 5 秒，就代表注入成功了。",
        createdAt: "2026-09-06T21:40:00+08:00",
        votes: 24,
        accepted: true,
      },
      {
        id: "a2",
        author: "0xkuma",
        role: "助教",
        body: "補充一下，也可以先觀察「登入失敗」跟「帳號不存在」的訊息有沒有不一樣。有差別的話就能當成布林條件慢慢問出資料。",
        createdAt: "2026-09-06T22:02:00+08:00",
        votes: 9,
      },
    ],
  },
  {
    id: "q2",
    scope: "lesson",
    refId: "web-security/sql-injection",
    title: "參數化查詢是不是就 100% 安全了？",
    body: "如果我全部都改成參數化查詢，是不是就再也不用擔心 SQL Injection？",
    author: "toto",
    createdAt: "2026-09-05T18:30:00+08:00",
    votes: 7,
    answers: [
      {
        id: "a3",
        author: "n0ir",
        role: "講師",
        body: "對於值的部分是的。但要注意：表格名稱、欄位名稱、ORDER BY 的方向這些「識別字」沒辦法用參數綁定。如果那些也來自使用者輸入，你還是得用白名單。",
        createdAt: "2026-09-05T19:05:00+08:00",
        votes: 18,
        accepted: true,
      },
    ],
  },
  {
    id: "q3",
    scope: "challenge",
    refId: "sqli-login",
    title: "卡在第二關，admin 進去了但沒看到 flag",
    body: "我用註解的方式成功以 admin 登入，後台首頁卻只有一句歡迎詞。是我漏看什麼嗎？",
    author: "mimi",
    createdAt: "2026-09-07T10:22:00+08:00",
    votes: 5,
    answers: [
      {
        id: "a4",
        author: "aylin",
        role: "助教",
        body: "先看網頁原始碼，有時候會在註解裡。另外檢查一下登入後有沒有拿到新的 cookie，某些題目 flag 是塞在 session 裡的。",
        createdAt: "2026-09-07T10:51:00+08:00",
        votes: 11,
        accepted: true,
      },
    ],
  },
  {
    id: "q4",
    scope: "challenge",
    refId: "ret2win",
    title: "offset 算出來是 40，但 payload 送過去還是 segfault",
    body: "cyclic 反查是 40，我用 40 個 A 加上 win 的位址，結果還是崩潰。是不是位址寫錯？",
    author: "haru",
    createdAt: "2026-09-04T23:40:00+08:00",
    votes: 14,
    answers: [
      {
        id: "a5",
        author: "vex",
        role: "講師",
        body: "十之八九是 stack alignment。x86-64 在呼叫某些 libc 函式前要求 16 位元組對齊。在 win 位址前面多墊一個 ret gadget 試試看，通常就過了。",
        createdAt: "2026-09-05T00:12:00+08:00",
        votes: 31,
        accepted: true,
      },
      {
        id: "a6",
        author: "ch3n",
        role: "助教",
        body: "另外確認你是用 p64 打包位址，不是直接寫字串。位元組序寫反了也會 segfault。",
        createdAt: "2026-09-05T08:30:00+08:00",
        votes: 8,
      },
    ],
  },
  {
    id: "q5",
    scope: "lesson",
    refId: "cryptography/rsa",
    title: "iroot 回傳的 exact 是 False 怎麼辦",
    body: "我照著開三次方根，但 exact 那個值是 False，解出來也是亂碼。",
    author: "nori",
    createdAt: "2026-09-03T20:11:00+08:00",
    votes: 6,
    answers: [
      {
        id: "a7",
        author: "moka",
        role: "講師",
        body: "代表 m 的三次方其實有超過 n，被模運算縮過了。這時候要試 c 加上 k 乘以 n 再開根號，k 從 0 往上跑。這叫做還原被模掉的倍數。",
        createdAt: "2026-09-03T20:44:00+08:00",
        votes: 22,
        accepted: true,
      },
    ],
  },
  {
    id: "q6",
    scope: "challenge",
    refId: "box-anping",
    title: "掃到的高位 port 是不是 31500 那個？",
    body: "nmap 全 port 掃完看到一個很怪的服務，想確認方向對不對再繼續花時間。",
    author: "mochi",
    createdAt: "2026-09-02T16:05:00+08:00",
    votes: 9,
    answers: [
      {
        id: "a8",
        author: "tux",
        role: "講師",
        body: "方向對了。看一下那個服務回應的標頭，版本號會告訴你要找哪個 CVE。不要急著打 exploit，先確認版本。",
        createdAt: "2026-09-02T16:38:00+08:00",
        votes: 16,
        accepted: true,
      },
    ],
  },
];

export function questionsFor(scope: "lesson" | "challenge", refId: string) {
  return QUESTIONS.filter((q) => q.scope === scope && q.refId === refId);
}
