# SCIST Gate — 資安學習平台

SCIST 南臺灣學生資訊社群數位轉型計畫的互動平台。把「影音課程」與「實戰題庫」綁在同一套進度系統裡：看到哪、就做到哪。

風格參照 Hack The Box 的暗色駭客介面，內容架構依 2026 年度數位轉型企劃書。

目前狀態：前台、後台、資料庫、登入、進度同步、影片播放全部接在一起，本機 `pnpm dev` 就是完整可用的系統。還沒做的只有填外部服務憑證與部署，見 [docs/HANDOFF.md](docs/HANDOFF.md)。

## 文件

| 文件 | 內容 |
| --- | --- |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 現況、已驗證的串接、還要做的事 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系統架構、資料模型、一個請求怎麼走 |
| [docs/API.md](docs/API.md) | 42 支 API 的合約 |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | Discord、Cloudflare Stream、R2、Instancer、Neon、Vercel 怎麼接 |
| [instancer/README.md](instancer/README.md) | VPS 上的靶機服務 |

## 快速開始

```bash
pnpm install
pnpm dev
```

- 前台：http://localhost:3000
- 後台：http://localhost:3000/admin?as=admin（開發環境專用，會自動簽一個管理員 session；正式站以 Discord 登入）
- 登入：右上角「登入」。開發環境可以用任何名稱、任何角色登入，會在資料庫建立真的帳號。沒權限就開後台網址時會被帶回首頁的登入框，登入後自動回到原本要去的頁面。

不需要任何環境變數。沒設定 `DATABASE_URL` 時資料庫是內嵌的 PGlite，存在 `.data/pglite`，空資料庫會自動灌入示範內容。外部服務全部沒設定時走模擬模式，畫面流程照樣能走完。要接真服務時複製 `.env.example` 為 `.env.local` 填入。

其他指令：

```bash
pnpm build          # 正式建置
pnpm start
pnpm lint
pnpm db:generate    # schema 改了之後產生 migration
pnpm db:seed --force  # 重灌示範內容（保留學員資料）
pnpm db:reset       # 刪掉本機 PGlite，下次 pnpm dev 重建
pnpm db:studio      # Drizzle Studio 看資料
```

## 技術

| 項目 | 選型 |
| --- | --- |
| 框架 | Next.js 16（App Router、Turbopack、Route Handlers、proxy） |
| UI | React 19 + Tailwind CSS v4 |
| 學員端狀態 | Zustand；訪客存 localStorage，登入後鏡射到 API 並以伺服器為準 |
| 資料庫 | Drizzle ORM；本機 PGlite，正式 Postgres（Neon / Supabase / 自架） |
| 登入 | Discord OAuth，jose 簽 JWT 放 httpOnly cookie；開發環境另有 dev 登入 |
| 驗證 | zod（所有 API 輸入在 `src/server/validators.ts`） |
| 影片 | YouTube IFrame API 或 Cloudflare Stream Player SDK，同一個播放器 |
| 附件 | Cloudflare R2 預簽名直傳 |
| 靶機 | 自寫的 instancer（Node + Docker）跑在 VPS |
| 圖示 | lucide-react |
| 字型 | Manrope（英數）+ Noto Sans TC（中文，next/font 自託管）+ JetBrains Mono（程式碼） |

## 視覺系統

- 主色：電光萊姆綠 `#a4f13b`，配色與階級、難度、五大領域各有自己的色相，定義在 `src/app/globals.css` 的 `@theme`。
- 六角形是全站母題：Logo、頭像、圖示框、背景格。`src/components/ui/hex-field.tsx` 畫出會呼吸的發光六角格，純 SVG、無 client JS、seeded 決定性排版，不會造成 hydration 不一致。
- 首頁的「門」主視覺在 `src/components/marketing/hero.tsx` 的 `GateVisual`。
- 卡片是不透明玻璃質感（`card` utility），懸停有綠色光暈；`reveal` 讓區塊在進入視窗時淡入。
- 內頁共用 `src/components/ui/page-hero.tsx` 當頁首；後台共用 `src/components/admin/ui.tsx` 的表單元件。

檢視視覺時建議用無頭 Chrome 拍整頁截圖，例如：

```bash
chrome --headless=new --window-size=1440,3000 --virtual-time-budget=10000 --screenshot=out.png http://localhost:3000/
```

## 頁面

| 路徑 | 內容 |
| --- | --- |
| `/` | 首頁：願景、即時動態、五大路徑、學習閉環、題庫預覽、排行榜、講師、社群、時程 |
| `/learn` | 學習路徑總覽與個人完成度 |
| `/learn/[track]` | 單一領域的完整課程大綱、講師、對應實戰題 |
| `/learn/[track]/[lesson]` | **互動課程播放器**（見下） |
| `/challenges` | 題庫。可依類別、難度、解題狀態篩選與搜尋 |
| `/challenges/[slug]` | 題目詳情：環境啟動、提示解鎖、Flag 提交、討論、最近解出的人 |
| `/leaderboard` | 週榜、總榜、18 校聯防積分 |
| `/dashboard` | 個人 XP、階級、各領域進度、活動紀錄、筆記 |
| `/community` | 活動報名、助教賦能計畫、講師群、18 校名單 |
| `/about` | 組織介紹、平台架構、預算、KPI、贊助方案 |
| `/admin` | 後台總覽：數字、卡關點、整合狀態、待處理 |
| `/admin/tracks` | 學習路徑與章節 |
| `/admin/lessons` | 課程與影片：上架流程、YouTube 或 Stream 上傳、講義區塊、檢查站、Lab |
| `/admin/challenges` | 題庫：flag（存檔只留 SHA-256）、提示、附件、Docker 環境、排程上線 |
| `/admin/events` | 活動與報名 |
| `/admin/instructors` | 講師：邀請、專長、經歷、綁定 Discord 帳號 |
| `/admin/users` | 學員與角色（學員 / 助教 / 講師 / 管理員）、停權、個人詳情與 XP 調整 |
| `/admin/questions` | 問答回覆與採納 |
| `/admin/instances` | 靶機環境：運行中的容器、到期倒數、關閉 |
| `/admin/analytics` | 數據：12 週趨勢、學習漏斗、完課率、解題率、18 校參與 |
| `/admin/audit` | 操作紀錄：誰在什麼時候改了什麼 |
| `/admin/settings` | 站點文案、XP 規則、階級門檻、整合狀態、CTFd 匯入、匯出 |

所有前台頁面每次請求都從資料庫讀，後台改完重新整理就看得到。

## 互動課程播放器

`/learn/[track]/[lesson]` 是整個平台的核心，把企劃書裡「翻轉教室」的概念做成可操作的東西：

1. **播放** — 課程有 YouTube 或 Cloudflare Stream 影片時用真的播放器；沒有影片時用程式碼跑馬燈當替身，兩者共用同一套控制列與進度條。
2. **知識點檢查站** — 播到設定的百分比會自動暫停，右側跳出選擇題。**答對才會繼續播放**，答錯可以重試。
3. **實戰 Lab** — 每一課掛一題題庫裡的真實題目，一鍵跳過去打。
4. **筆記** — 每課獨立的筆記本，自動儲存到帳號。
5. **發問** — 課程與題目都能發問，接上 webhook 後會同步到 Discord 對應頻道。

完成所有檢查站才會解鎖「下一課」按鈕。看課進度、檢查站、完課都會即時寫回伺服器。

## 登入與進度

- 訪客不用登入就能看課、答檢查站、在瀏覽器比對 flag，進度存在這台瀏覽器。
- 登入（正式站用 Discord）後，伺服器是唯一的真相：每個動作打 API，`GET /api/me` 回填 store。訪客時期的檢查站、看課進度、筆記會在第一次登入時合併到帳號。
- 只有登入後的解題會進排行榜、First Blood 與 Discord 通知。

## Flag 驗證

flag 只以 SHA-256 存放，前端與資料庫都沒有明文。登入者的提交由 `POST /api/challenges/{slug}/attempt` 在伺服器比對（限流、記錄嘗試、First Blood 通知）；訪客在瀏覽器用同一組雜湊比對，不會記錄。

`welcome` 這題刻意把 flag 直接寫在題目敘述裡，讓第一次使用的人能完整走完一次提交流程。

## 後台的兩種模式

後台永遠透過 `src/admin/api.ts` 的 `AdminApi` 介面存取資料：

| | HTTP 模式（預設） | 本機模式 |
| --- | --- | --- |
| 開關 | 不設定 | `.env.local` 設 `NEXT_PUBLIC_ADMIN_API=local` |
| 資料在哪 | 資料庫（透過 `/api/admin/*`） | 這台瀏覽器的 localStorage |
| 需要登入 | 講師以上（`src/proxy.ts` 在伺服器端擋） | 不用 |
| 用途 | 真正上架內容 | 看畫面、討論 UX |

## 內容怎麼改

課程、題目、活動、講師、設定都在 `/admin` 改。`src/data/` 裡的示範內容只用來 seed 空資料庫；型別與常數（題目類別、學校、贊助方案）仍在那裡。

| 要改什麼 | 改哪裡 |
| --- | --- |
| 課程、題目、活動、講師、站點文案、XP 規則 | 後台 |
| 合作學校 | `src/data/schools.ts` |
| 贊助方案 | `src/data/sponsors.ts` |
| 示範內容（seed） | `src/data/tracks.ts`、`challenges.ts`、`events.ts`、`questions.ts`、`players.ts` |
| 顏色、字型、視覺 | `src/app/globals.css` |

## 示範資料說明

講師、學員帳號、排行榜數字與 First Blood 紀錄都是為了展示介面而虛構的，不對應真實個人。示範帳號的 XP 在資料庫裡標記為「示範資料」，上線前停權或用 SQL 清掉即可。沒接 instancer 之前，題目環境是模擬的。
