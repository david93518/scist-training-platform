# 交接與現況

前台、後台、資料庫、登入、進度同步、影片播放都已經接在一起，本機 `pnpm dev` 就是一個完整可用的系統。剩下的工作只有兩類：**填外部服務的憑證**與**部署**。

先讀 [ARCHITECTURE.md](ARCHITECTURE.md)（10 分鐘），做到外部服務時讀 [INTEGRATIONS.md](INTEGRATIONS.md)，API 細節查 [API.md](API.md)。

## 已完成的串接（本機驗證過）

| 項目 | 做法 | 驗證方式 |
| --- | --- | --- |
| 前台讀資料庫 | 所有頁面 `force-dynamic`，用 `src/server/repo/*` 取資料；`src/data` 只剩型別與 seed | 後台改課名，重新整理 `/learn` 立刻看到 |
| 資料庫零設定 | 沒設 `DATABASE_URL` 用 PGlite；空資料庫在開發環境自動灌示範內容 | 刪掉 `.data/pglite` 再 `pnpm dev`，首頁有內容 |
| 登入 | Discord OAuth；開發環境另有 `POST/GET /api/auth/dev`；session 是 httpOnly JWT cookie | 登入對話框選角色登入，`GET /api/me` 回 `authenticated: true` |
| 進度同步 | `src/store/progress.ts`：登入後每個動作打 API，再從 `/api/me` 回填；訪客留在瀏覽器 | 兩個瀏覽器同帳號，一邊答檢查站，另一邊重整看到 XP |
| 訪客進度合併 | 第一次登入時把瀏覽器裡的檢查站、看課進度、筆記重播到帳號 | 未登入答一站再登入，`/api/me` 的 `checkpoints` 有它，XP 也加了 |
| Flag、提示、靶機、報名、發問 | 登入者走 API（伺服器比對 flag、扣 XP、開容器、佔名額、同步 Discord）；訪客只在瀏覽器模擬 | 題目頁送出 `SCIST{w3lc0m3_t0_th3_g4t3}`，排行榜多一筆 |
| 影片 | `video-stage.tsx` 支援 YouTube IFrame API 與 Cloudflare Stream SDK；播到檢查站自動暫停，答對繼續 | 後台把一課設成 YouTube，播放器會在 30% / 60% / 90% 停下 |
| 後台 | 預設打 `/api/admin/*`；`src/proxy.ts` 在伺服器端擋掉非講師，導回 `/?login=admin&next=原路徑`，登入框會說明原因、預選管理員，登入後直接回到原本要去的後台頁；開發用 `/admin?as=admin` 會先簽一個 session | 未登入開 `/admin/lessons` 被導回首頁並跳出登入框，登入後落在 `/admin/lessons`；學員身分開 `/admin` 會看到「你目前是 …（學員）」 |

## 還要做的事

### 1. 憑證（各 30 分鐘）

照 [INTEGRATIONS.md](INTEGRATIONS.md) 依序：資料庫（Neon）→ Discord 登入（記得 `NEXT_PUBLIC_DISCORD_LOGIN=1`）→ Webhook → Stream → R2 → Instancer。每接一項，後台「設定與整合」那一列會變成「已設定」。沒接之前一律走模擬模式，流程照樣能走完。

### 2. 部署（1 小時）

INTEGRATIONS.md 第 7 節。第一次部署把 `AUTO_SEED=1` 打開讓正式資料庫灌入示範內容（或跑 `pnpm db:seed`），之後關掉。用自己的 Discord 登入確認變成管理員後，到後台「學員與角色」把示範帳號停權，或用 SQL 刪 `users` 裡 id 為 `p1`…`p30` 的列。

### 3. 上線後值得做的

- `attempts` 的限流現在是 5 分鐘 20 次，可依需要調整（`repo/learner.ts`）。
- 學員端的事件（解題、完課）若也要進 `audit_log`，在 `repo/learner.ts` 呼叫 `audit()`。
- 影片轉檔狀態改用 Cloudflare 的 webhook 主動通知，就不用手動「重新檢查」。
- 每週重置的週榜其實是「本週累積」，若要真正的重置紀錄可以另開 `seasons` 表。
- 學校清單（`schools`）目前只有 seed，若要在後台管理，照 `events` 的樣子加一頁即可。
- 首頁的活動跑馬燈與各項統計都是即時查詢；流量大了再加 `unstable_cache` 或 `"use cache"`。

## 已知的邊界

- 訪客的解題不會合併到帳號（伺服器沒有明文 flag 可以重播），登入後要再交一次。
- `challenges.base_solves` 與 `events.base_registered` 是「初始顯示數據」，會和真實數字相加，正式營運後把它們歸零。
- 示範帳號的 XP 是 seed 寫進 `xp_ledger` 的兩筆 `reason = "admin"` 紀錄，label 有標「示範資料」。
- 本機 PGlite 裡有測試時留下的帳號（tester、helper、dev-admin、e2e-user）與一則測試問題；`pnpm db:reset` 後重跑 `pnpm dev` 就會回到乾淨的示範資料（先停掉 dev server，PGlite 一次只能一個程序開）。
- `src/data/flags.local.json`、`src/data/flag-hashes.json`、`scripts/hash-flags.mjs` 不是這個專案用的（另一個工作階段留下的），沒有任何程式引用，可刪。
- 後台的本機模式（`NEXT_PUBLIC_ADMIN_API=local`）資料只存在瀏覽器，跟資料庫無關；那是給看畫面用的。
