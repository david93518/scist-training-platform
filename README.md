# SCIST Gate

SCIST Gate 是為南臺灣高中生打造的資安學習平台，將影音課程、知識點檢查、CTF 實戰題、學習進度、排行榜與社群問答整合在同一套系統中。

本專案源自 SCIST（南臺灣學生資訊社群）的數位轉型計畫，目標是讓學員從「看懂」走到「做得出來」，並讓講師與助教能在後台管理內容、掌握學習成效及維運實戰環境。

> 專案目前可在本機完整執行；正式部署前仍需設定資料庫、Discord、Cloudflare 與靶機服務等外部憑證。詳細狀態請見 [待補清單](scist-platform/docs/TODO.md)。

## 核心功能

### 學員端

- 五大資安學習路徑與課程搜尋
- YouTube／Cloudflare Stream 影音播放器
- 播放進度檢查站，答對後才繼續課程
- 每課筆記、觀看位置與完成進度同步
- CTF 題庫搜尋、分類與難度篩選
- Flag 驗證、提示解鎖、First Blood 與 XP 獎勵
- Docker 靶機啟動、到期與關閉管理
- 週榜、總榜及校際排行榜
- 每週指定挑戰，前三名加分並公告
- 入門／進階／菁英三級認證與進度追蹤
- 課程與題目問答、投票及最佳解答
- 活動報名、個人儀表板與學習紀錄
- 訪客進度保存；登入後合併至帳號

### 管理端

- 學習路徑、章節、課程與檢查站管理
- YouTube／Cloudflare Stream 影片設定與上傳
- 題目、Flag、提示、附件及 Docker 環境管理
- 活動、講師、學員、角色與停權管理
- 問答回覆與採納
- 執行中靶機管理
- XP 調整與完整操作稽核紀錄
- 助教貢獻統計：回答數與被採納數
- 12 週趨勢、學習漏斗、完課率及解題率
- 企劃書 KPI 與 6／12 個月目標對照
- 站點文案、XP 規則、階級門檻及功能開關
- 三級認證條件與本週挑戰設定
- 一鍵結算本週挑戰並公告至 Discord
- CTFd 內容匯入與全站 JSON 匯出

## 技術架構

- **框架**：Next.js 16、React 19、TypeScript
- **樣式**：Tailwind CSS 4
- **狀態管理**：Zustand
- **資料庫**：Drizzle ORM + PostgreSQL
  - 本機：PGlite
  - 正式環境：Neon、Supabase 或自架 PostgreSQL
- **登入**：Discord OAuth + `jose` JWT httpOnly cookie
- **輸入驗證**：Zod
- **影片**：YouTube IFrame API、Cloudflare Stream
- **附件**：Cloudflare R2 預簽名直傳
- **靶機**：Node.js Instancer + Docker
- **部署**：Vercel 或自架 VPS

前台、後台與 API 都在同一個 Next.js 專案中。頁面由 Server Components 讀取資料，互動功能透過 Route Handlers 寫入；所有資料庫操作集中在 `src/server/repo`。

更完整的資料流與資料模型請見 [系統架構文件](scist-platform/docs/ARCHITECTURE.md)。

## 專案結構

```text
.
├─ .github/workflows/
│  ├─ ci.yml                     # push / PR：lint + build
│  ├─ backup.yml                 # 每週內容備份
│  └─ weekly-settle.yml          # 每週挑戰結算與公告
├─ scist-platform/               # Next.js 主專案
│  ├─ drizzle/                   # 資料庫 migrations
│  ├─ docs/                      # 架構、API、整合與待辦文件
│  ├─ instancer/                 # Docker 靶機服務
│  ├─ scripts/                   # migration、seed、reset、清示範資料
│  └─ src/
│     ├─ app/                    # 頁面與 API Route Handlers
│     ├─ admin/                  # 後台資料介面與型別
│     ├─ components/             # 前台、後台與共用 UI
│     ├─ data/                   # 型別、常數與示範內容
│     ├─ lib/                    # 共用工具
│     ├─ server/                 # DB、repo、auth、services
│     └─ store/                  # 學員端 Zustand store
└─ README.md
```

## 本機快速開始

### 環境需求

- Node.js 20.9 或以上
- pnpm 9（專案指定 `pnpm@9.15.9`）
- Git

建議用 Corepack 啟用正確版本的 pnpm：

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

### 安裝與啟動

```bash
git clone https://github.com/david93518/scist-training-platform.git
cd scist-training-platform/scist-platform
pnpm install
pnpm dev
```

開啟：

- 前台：<http://localhost:3000>
- 後台：<http://localhost:3000/admin>（要講師或管理員帳號）

本機開發不需要任何環境變數：

- 未設定 `DATABASE_URL` 時使用 `.data/pglite` 內的 PGlite。
- 空資料庫會自動載入示範內容。
- 用右上角「登入」註冊帳號；資料庫還沒有管理員時，第一個註冊的人會成為管理員。
- 未設定的外部服務使用模擬模式，方便先測試完整介面流程。
- 示範 seed 帳號沒有密碼，不能登入。

## 環境變數

需要串接服務時：

```bash
cd scist-platform
cp .env.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

主要變數如下：

| 變數 | 用途 | 正式環境 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 連線字串 | 必填 |
| `AUTH_SECRET` | Session JWT 簽章密鑰，至少 32 字元 | 必填 |
| `APP_URL` | 網站完整網址 | 必填 |
| `ADMIN_HANDLES` | 註冊時自動成為管理員的帳號（逗號分隔） | 建議 |
| `BOOTSTRAP_ADMIN_HANDLE` | 啟動時建立或補齊的管理員帳號 | 正式站建議 |
| `BOOTSTRAP_ADMIN_PASSWORD` | 上述帳號的密碼（至少 8 字） | 正式站建議 |
| `DISCORD_CLIENT_ID` | Discord OAuth Client ID | 可選 |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret | 可選 |
| `ADMIN_DISCORD_IDS` | 首次 Discord 登入即成為管理員的 ID | 可選 |
| `DISCORD_WEBHOOK_URL` | 新問題及 First Blood 通知 | 選填 |
| `CF_ACCOUNT_ID` | Cloudflare 帳號 ID | Stream 需要 |
| `CF_STREAM_API_TOKEN` | Cloudflare Stream API Token | Stream 需要 |
| `CF_STREAM_CUSTOMER_CODE` | Stream 播放子網域代碼 | Stream 需要 |
| `R2_*` | R2 金鑰、bucket 與公開網址 | 附件需要 |
| `INSTANCER_URL` | 靶機服務網址 | 真實靶機需要 |
| `INSTANCER_SECRET` | 平台與 Instancer 的共用密鑰 | 真實靶機需要 |
| `BACKUP_TOKEN` | GitHub Actions 取得匯出檔的 Bearer Token | 備份需要 |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | 錯誤監控，兩邊填同一個 DSN | 選填 |
| `AUTO_SEED` | 控制空資料庫是否載入示範內容 | 首次部署使用 |
| `NEXT_PUBLIC_DISCORD_LOGIN` | 設為 `1` 顯示 Discord 登入按鈕 | 可選 |

請勿提交 `.env.local` 或任何正式憑證。完整申請與設定流程請見 [外部服務整合指南](scist-platform/docs/INTEGRATIONS.md)。

## 常用指令

請在 `scist-platform` 目錄執行：

```bash
pnpm dev                 # 啟動開發伺服器
pnpm build               # 建立 production build
pnpm start               # 啟動 production server
pnpm lint                # 執行 ESLint

pnpm db:generate         # 根據 Drizzle schema 產生 migration
pnpm db:migrate          # 套用 migration
pnpm db:seed             # 空資料庫才載入示範內容
pnpm db:seed --force     # 重新匯入 seed 內容
pnpm db:reset            # 刪除本機 PGlite 資料
pnpm db:studio           # 開啟 Drizzle Studio

pnpm db:clean-demo       # 預覽將被清除的示範資料
pnpm db:clean-demo --yes # 正式清除示範帳號與灌水數據
```

`db:clean-demo` 預設只會列出資料，不會刪除。正式開放前務必確認資料庫與備份，再執行 `--yes`。

## 登入與權限

系統角色由低至高為：

```text
student → ta → instructor → admin
```

- 預設用帳號密碼登入。註冊後是學員；庫裡還沒有管理員時，第一個註冊的人是管理員。
- 角色只能由管理員在後台指派，登入時不能自己選。
- Session 是簽章 JWT，儲存在 httpOnly cookie，有效期 30 天。
- API 每次會重新確認資料庫中的角色與停權狀態。
- `/admin` 需要 `instructor` 以上權限。
- `ENABLE_DEV_LOGIN=1` 才會打開舊的選角色開發登入，正式站不要開。

## 資料與安全設計

- Flag 只儲存 SHA-256，不保留明文。
- 錯誤的 Flag 提交只保留雜湊。
- 同一題的提交有速率限制。
- 發問與回答限制每人每 10 分鐘最多 5 則。
- 後台寫入會記錄操作者、時間、動作與目標。
- R2 與 Stream 採瀏覽器直傳，檔案不經過應用伺服器。
- 所有 API 輸入由 Zod 驗證。
- `/admin` 與 `/api` 已在 `robots.txt` 中禁止索引。
- 每週備份 workflow 將全站匯出 JSON 保存為 GitHub artifact。

公開 repository 不代表可以公開憑證、真實 Flag、個人資料或正式資料庫備份。

## 部署到 Vercel

1. 在 Vercel 匯入本 repository。
2. 將 **Root Directory** 設為 `scist-platform`。
3. 建立 Neon 或其他 PostgreSQL 資料庫。
4. 在 Vercel 設定至少：
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `APP_URL`
5. 要啟用正式登入時，再設定 Discord 相關變數及 `NEXT_PUBLIC_DISCORD_LOGIN=1`。
6. 在 Discord Developer Portal 新增：
   - `https://你的網域/api/auth/discord/callback`
7. 套用 migration，並決定是否於第一次部署設定 `AUTO_SEED=1`。
8. 確認自己的 Discord ID 位於 `ADMIN_DISCORD_IDS`。
9. 正式開放前執行 `pnpm db:clean-demo --yes` 清除示範資料。

Vercel 的檔案系統不保證持久保存，正式部署不可使用 PGlite，必須提供 `DATABASE_URL`。

### 每週備份

Repository 已包含 `.github/workflows/backup.yml`。請在 GitHub：

1. `Settings → Secrets and variables → Actions`
2. 新增 secret `BACKUP_TOKEN`
3. 新增 variable `APP_URL`
4. 在部署環境設定同一個 `BACKUP_TOKEN`

workflow 每週匯出一次全站 JSON，驗證檔案格式後保存 90 天，也可由 Actions 頁面手動執行。

### 每週挑戰結算

`.github/workflows/weekly-settle.yml` 在台北時間週日 22:00 呼叫 `POST /api/admin/weekly/settle`，發出本週挑戰前三名的加分並把戰報貼到 Discord。使用與備份相同的 `BACKUP_TOKEN`，設定好備份即可運作。同一週重複觸發不會重複發分，後台「設定與整合 → 本週挑戰」也有同一顆按鈕。週界線是台北時間凌晨，預設 `weekStartsOn = 0` 時即週日 00:00 台北。

### CI

`.github/workflows/ci.yml` 在 push 到 `main` 與每個 PR 跑 `pnpm lint` 與 `pnpm build`。過不了的變更不會默默進 main。

## 文件

- [主專案詳細說明](scist-platform/README.md)
- [系統架構與資料模型](scist-platform/docs/ARCHITECTURE.md)
- [API 合約](scist-platform/docs/API.md)
- [外部服務整合與部署](scist-platform/docs/INTEGRATIONS.md)
- [交接與目前狀態](scist-platform/docs/HANDOFF.md)
- [待補清單與驗收方式](scist-platform/docs/TODO.md)
- [靶機 Instancer 部署](scist-platform/instancer/README.md)

## 目前狀態與後續規劃

已完成：

- 前台、後台、資料庫及登入流程
- 學習進度、XP、階級與排行榜
- 課程播放器、檢查站、筆記及訪客進度合併
- 題庫、Flag、提示、靶機及附件
- 問答投票、作者採納及發文限流
- 入門／進階／菁英三級認證
- 每週指定挑戰、加分與 Discord 公告
- 助教貢獻統計（回答數與被採納數）
- 後台管理、分析、KPI 與操作稽核
- 公開查詢的 TTL 快取與存檔即失效
- 錯誤頁、載入骨架、SEO、分享預覽及每週備份
- push / PR 的 CI（lint + build）
- 可選的 Sentry 錯誤監控
- 週榜、連續登入與本週挑戰使用台北時區

需要外部設定（只有專案負責人能做）：

- 六項外部服務憑證與 Vercel 部署
- 換掉出貨用的預設值：本週挑戰題目、開放時間、Discord 邀請連結、認證門檻
- 正式開放前執行 `pnpm db:clean-demo --yes`

尚未實作：

- 自動化測試
- 問答檢舉及內容審核
- SCIST 盃獨立賽季、隊伍與計分

已知限制（可以上線，但規模成長後需處理）：

- 三級認證在瀏覽器計算，伺服器沒有紀錄，後台無法匯出認證名單
- 快取為單一 process 內有效，多 instance 部署下最多 60 秒不一致
- 助教貢獻統計的是回答數，不包含線下帶課時數
- 沒有公開個人頁，認證徽章無法分享
- 分享預覽圖不支援中文字元

進度及每項驗收條件以 [TODO.md](scist-platform/docs/TODO.md) 為準，該文件同時記錄各項的優先順序與估時。

## 貢獻方式

1. Fork repository 或建立功能分支。
2. 修改前先閱讀架構與 API 文件。
3. Schema 有變更時一併提交 Drizzle migration。
4. 提交前至少執行：

```bash
pnpm lint
pnpm build
```

5. Pull Request 請說明目的、主要變更、驗證方式及必要的環境變數或 migration。

## 授權

本 repository 目前尚未附加開源授權條款。除非另有書面授權，程式碼與內容仍保留所有權利；請勿直接再散布、商用或建立衍生版本。

