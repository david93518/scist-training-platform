# 待補清單

2026-09-09 全面盤點，同日做掉一輪。分成六級，P0 是上線前一定要做的，P1 是後台看得到但實際沒生效的東西，往下依序是功能、企劃書承諾、工程基礎、安全。

每一項都寫了**在哪個檔案**與**怎麼驗收**。✅ 是已經做完的，底下有一行寫實際改了什麼。

| 級別 | 狀態 |
| --- | --- |
| P0 上線前必做 | 0.1 ✅、0.3 ✅（腳本備好，等你按）、**0.2 憑證只有你能填** |
| P1 後台設定沒生效 | ✅ 五項全做完 |
| P2 前台功能缺口 | ✅ 五項全做完 |
| P3 企劃書承諾 | 3.5 ✅；3.1 三級認證、3.2 助教時數、3.3 每週挑戰、3.4 校際競賽未做 |
| P4 工程基礎 | 4.1 ✅、4.2 ✅、4.3 ✅；4.4 測試、4.5 快取未做 |
| P5 安全與維運 | 5.1 ✅、5.3 ✅；5.2 內容審核、5.4 錯誤監控未做 |

---

## P0 上線前必做（現在做不了部署）

### 0.1 ✅ 專案還不是 git repo
`D:\SCIST計畫` 底下沒有 `.git`。Vercel 部署需要 GitHub repo，而且現在所有修改都沒有版本紀錄，改壞了無法回溯。

**已做**：`git init` 在 `D:\SCIST計畫`（不是 `scist-platform`，這樣 docs 與 workflow 都進得去），根目錄 `.gitignore` 擋掉 `node_modules/`、`.next/`、`.data/`、`.env.local`，`.gitattributes` 統一換行為 LF，`scist-platform/.gitignore` 加 `!.env.example` 讓範本進版控。首次 commit 已建立。

剩下：`git remote add origin …` 推到 GitHub。

### 0.2 六項外部服務憑證全部未填 ⬅️ 只有你能做
目前全部跑模擬模式。步驟在 [INTEGRATIONS.md](INTEGRATIONS.md)，建議順序與時間：

| 服務 | 沒接的後果 | 時間 |
| --- | --- | --- |
| Neon（`DATABASE_URL`） | 部署到 Vercel 會失敗（serverless 不能用 PGlite） | 20 分 |
| `AUTH_SECRET` | production 啟動時直接 throw | 1 分 |
| Discord OAuth | 沒有人能登入正式站 | 30 分 |
| Discord Webhook | 新問題、First Blood 不會通知 | 5 分 |
| Cloudflare Stream | 影片只能貼 YouTube | 30 分 |
| Cloudflare R2 | 題目附件無法下載 | 30 分 |
| Instancer（VPS） | 靶機是假的 IP | 1-2 小時 |

另外多一個 `BACKUP_TOKEN`（24 字以上隨機字串），給 5.3 的每週備份用。

驗收：後台「設定與整合」六列全部變成「已設定」。

### 0.3 ✅ 示範資料要清掉（腳本寫好了，還沒跑）
正式開放前必須處理，不然假帳號會出現在真的排行榜上。

- **示範帳號**：`users` 裡 `p1`…`p30` 的 30 個人，還有測試留下的 `tester`、`helper`、`dev-admin`、`e2e-user`。
- **示範 XP**：`xp_ledger` 裡 `reason = 'admin'` 且 label 含「示範資料」的 60 筆。
- **假解題紀錄**：seed 產生的 118 筆 `solves`。
- **初始顯示數據**：每一題的 `base_solves`、每個活動的 `base_registered`，這兩個數字會**加到**真實數字上，不歸零的話解題數永遠灌水。

**已做**：`scripts/clean-demo.mts`，預設是 dry run，只印數量不刪東西。

```bash
pnpm db:clean-demo         # 先看會刪掉什麼
pnpm db:clean-demo --yes   # 確認後才真的刪
```

⚠️ 原本清單裡寫的 `delete from users where id like 'p%'` **不要用**：真實帳號的 id 是 nanoid，字母表含 `p`，這條 SQL 會順手刪掉大約每 60 個真人裡的 1 個。腳本改成比對 `src/data/players.ts` 裡的確切 id。

刪 user 會 cascade 到 solves、attempts、hint_unlocks、lesson_progress、xp_ledger、instances、報名與投票；questions / answers 的 `author_id` 只會被設成 null，所以 seed 的 6 則問答另外用 id 刪掉。

驗收：排行榜是空的，題目卡片顯示 0 人解出。

---

## P1 後台改得到、但實際沒生效

### 1.1 ✅ 階級門檻改了沒用
後台可以改七個階級的名稱、XP 門檻、顏色，存進 `settings.ranks`，但前台全部讀 `src/lib/xp.ts` 的硬編碼 `RANKS`。

**已做**：
1. `src/lib/xp.ts` 的 `rankFor` / `nextRank` / `rankProgress` 多收一個 `ranks` 參數，`RANKS` 降為預設值；新增 `ladder()` 依 `minXp` 排序，`rankProgress` 對 `span <= 0` 有防呆。
2. 新增 `src/components/settings-provider.tsx`，根 layout 用 `getSettingsSafe()` 取設定後注入，client 端用 `useSettings()` / `useRanks()` / `useFeatures()` 讀。
3. 排行榜、儀表板、頁首、登入選單、首頁預覽、後台學員列表與詳情都改成讀注入的 ranks。
4. 新增 `src/lib/settings-defaults.ts` 當唯一一份預設值，`repo/settings.ts`、`admin/store.ts`、`db/seed.ts` 都改讀它，不再各寫一份。

驗收：後台把「駭客」門檻從 1000 改成 500，排行榜側欄的階級表立刻變。

### 1.2 ✅ XP 預設值沒有被用
`settings.xp.checkpointDefault`（25）與 `lessonDefault`（80）存了，但 `lesson-editor.tsx` 新增課程時寫死。

**已做**：`blankLesson()` 與檢查站 `make()` 改吃 `useSettings().xp`。

驗收：後台把完成課程預設 XP 改成 100，新增課程時「完成 XP」欄預填 100。

### 1.3 ✅ 「解出後退還提示扣的 XP」完全沒實作
`settings.xp.hintRefundOnSolve` 存了但沒有任何程式讀它。

**已做**：`repo/learner.ts` 新增 `refundHints()`，`attemptFlag()` 在整題解完時呼叫，補一筆正數 `xp_ledger`（reason `hint`）並在 API 回傳 `refunded`，`flag-submit.tsx` 顯示「已退還 N XP」。

驗收：打開開關，解鎖提示再解題，XP 回到扣之前。

### 1.4 ✅ 三個功能開關沒有任何作用

| 開關 | 現在的行為 | 改了哪裡 |
| --- | --- | --- |
| `guestProgress` | 關掉時未登入者看課不記進度，課程頁出現「登入才能記錄進度」橫幅，完成鈕與筆記停用 | `store/progress.ts` 的 `mayRecord`、`progress-sync.tsx`、`lesson-player.tsx` |
| `instances` | 關掉時題目頁不顯示「啟動環境」，只留固定連線資訊；後端 `spawnInstance()` 也直接拒絕 | `instance-panel.tsx`、`repo/ops.ts` |
| `questions` | 關掉時問答區只剩閱讀，`createQuestion` / `createAnswer` 後端也擋 | `qa-panel.tsx`、`repo/community.ts` |

驗收：關掉「開放發問」，題目頁的發問表單消失。

### 1.5 ✅ 站點名稱與標語沒有套用
**已做**：`layout.tsx` 改成 async server component + `generateMetadata()` 讀 `getSettingsSafe()`；首頁徽章讀 `settings.site.launch`；登入對話框讀站名。`server/env.ts` 加 `siteUrl()` 給 metadataBase / sitemap / robots 共用。

驗收：後台把標語改掉，瀏覽器分頁標題跟著變。

---

## P2 功能缺口（前台）

### 2.1 ✅ 問答不能投票
**已做**：新增 `question_votes` / `answer_votes` 兩張表（userId + 目標 id 唯一，已產 migration），`POST /api/questions/[id]/vote` 收 `{ target, answerId? }`，`listQuestionsPublic()` 多收 `viewerId` 回傳 `voted` / `mine`，前台票數改成可點的按鈕，再點一次取消。

### 2.2 ✅ 發問者不能自己採納最佳解答
**已做**：`PATCH /api/questions/[id]` 放寬成「助教以上**或**問題作者本人」，每則回答多一個「這個解決了我的問題」按鈕，只有作者看得到。

### 2.3 ✅ 課程沒有搜尋
**已做**：抽出 `src/components/learn/track-list.tsx`，搜尋比對課名、英文名、標語、產出、大綱與底下每一課的標題。

### 2.4 ✅ 靶機到期後狀態不會自己更新
**已做**：`repo/ops.ts` 加 `expireInstances()`，`getProfile()` 與 `listInstancesAdmin()` 進來時順手把 `expires_at < now()` 的標成 `stopped`。

### 2.5 ✅ 刪掉附件不會刪掉 R2 上的檔案
**已做**：`saveChallenge()` 比對前後的 `files`，`deleteChallenge()` 比對全部，消失的那些交給 `dropOrphanedObjects()` 呼叫 `deleteObject()`。

---

## P3 企劃書寫了但平台沒有

### 3.1 學員三級認證（入門 / 進階 / 菁英）⬅️ 剩下最有價值的一項
企劃書第 111-124 行明訂三個等級，每級有**能力指標**與**對應競賽目標**：

| 等級 | 能力指標 | 對應競賽目標 |
| --- | --- | --- |
| 入門 | 完成 Linux 基礎 + 任一領域入門課程 | MyFirstCTF 參賽 |
| 進階 | 完成 3 個以上領域課程，具備解題能力 | AIS3 Pre-Exam 前 75 名 |
| 菁英 | 全五領域精通，具備出題與教學能力 | 成為 SCIST 講師/助教 |

平台目前只有**七級 XP 階級**（新手到傳說），那是遊戲化的分數階級，跟這個以「完成哪些課程」為條件的認證是兩回事。企劃書拿這張表去談 AIS3 補助，平台上卻找不到。

要補：
1. 新增 `certifications` 概念：條件用「完成某條路徑的某幾課」表示，存在 `settings` 或新表。
2. 儀表板顯示目前等級與距離下一級還差什麼。
3. 個人頁可以秀出認證徽章。

估時：一天。

### 3.2 助教時數累積與兌換
企劃書第 109 行「助教激勵機制：累積助教時數可兌換優先報名資深課程資格」。平台有助教角色，但沒有時數統計。

要補：從 `answers` 表統計每位助教的回答數與被採納數，後台「學員與角色」顯示；或新增 `ta_hours` 表手動登記。

估時：半天。

### 3.3 每週解題挑戰
企劃書第 192 行「Discord 社群活化：設立每週解題挑戰，前三名公告表揚」。平台有週榜，但沒有「本週指定題目」的概念。

要補：`settings` 加一個 `weeklyChallenge` 欄位（題目 slug + 週次），首頁與題庫置頂顯示，週結算時發 Discord 公告。

估時：半天。

### 3.4 SCIST 盃校際競賽計分
活動類型有 `contest`，但只是一個活動卡片，沒有競賽期間的獨立計分、隊伍、賽後結算。

要補：短期可以用「學校聯防榜 + 指定期間」湊出來；完整做要 `seasons` 表。

估時：一到三天，看做多完整。

### 3.5 ✅ KPI 目標線沒有標在數據頁
**已做**：`getAnalytics()` 多回一組 `kpi`（註冊數、近 30 天月活躍、整體完課率、有學員的學校數），後台數據頁新增「企劃書 KPI 對照」卡，進度條刻度標在 6 個月與 12 個月門檻上，並算出達成率與還差多少。

---

## P4 工程基礎（品質，不影響功能）

### 4.1 ✅ 沒有錯誤頁
**已做**：`src/app/error.tsx`（segment 層，站內風格 + 重試 + digest）與 `src/app/global-error.tsx`（root layout 掛掉時用，全部 inline style，因為那時候 `globals.css` 還沒載）。

### 4.2 ✅ 沒有 loading 骨架
**已做**：`src/components/ui/skeleton.tsx` 放共用零件，`src/app/loading.tsx` 全站通用，`/learn` 與 `/challenges` 各自一個貼近版面的。

### 4.3 ✅ SEO 與分享預覽
**已做**：`src/app/sitemap.ts`（靜態頁 + 資料庫來的路徑、課程、題目；資料庫掛掉時只回靜態頁不會 500）、`src/app/robots.ts`（擋 `/admin` 與 `/api`，指向 sitemap）、`src/app/opengraph-image.tsx`（1200×630，站內配色）。

⚠️ OG 圖是純英文的：`ImageResponse` 底層的 Satori 內建字型沒有中文字符，中文會變成空框。要放中文標語得先把 Noto Sans TC 的 `.ttf` 放進 `assets/` 再傳給 `fonts`。

### 4.4 沒有任何測試
一個測試都沒有。改動 flag 比對、XP 計算、進度合併這種邏輯時沒有任何保護。

建議至少補：`repo/learner.ts` 的 `attemptFlag`、`answerCheckpoint`、`unlockHint` 三個函式的單元測試（用 PGlite 跑，很快）。

估時：半天。

### 4.5 快取
首頁一次打七個資料庫查詢，每個請求都重算。示範資料量小沒感覺，2000 人之後會慢。

要補：`getSiteStats()`、`getRecentActivity()`、`getInstructorsPublic()` 這種不常變的加快取（60 秒）。

估時：1 小時。

---

## P5 安全與維運

### 5.1 ✅ 發問沒有限流
**已做**：`createQuestion()` / `createAnswer()` 都加「每人每 10 分鐘最多 5 則」，助教以上從後台回答不受限。

### 5.2 問答沒有任何內容審核
使用者輸入直接顯示。後台可以刪，但沒有檢舉、沒有關鍵字過濾。高中生社群這塊要想一下。

估時：看要做多完整。

### 5.3 ✅ 沒有備份策略
**已做**：`.github/workflows/backup.yml` 每週一 03:00（台北）打 `GET /api/admin/export`，驗過 JSON 才存成 artifact，保留 90 天。因為 Action 沒辦法做 Discord 登入，export 路由多接受 `Authorization: Bearer $BACKUP_TOKEN`（timing-safe 比對）。

要用得先設好：repo secret `BACKUP_TOKEN`、repo variable `APP_URL`，以及部署環境的同名環境變數。沒設 `BACKUP_TOKEN` 時 bearer 這條路整條關閉。

### 5.4 沒有錯誤監控
線上出錯只會進 Vercel log，沒有人會發現。建議接 Sentry 免費層。

估時：30 分鐘。

---

## 接下來

1. **你來做**：0.2 填憑證 → 推 GitHub → 部署 Vercel
2. **開放前**：跑 `pnpm db:clean-demo --yes`
3. **最有價值**：3.1 三級認證（談補助用得到）
4. **有空再說**：4.4 測試、4.5 快取、5.2 內容審核、5.4 Sentry、P3 其他

## 一句話總結

**後台的設定頁現在真的會生效了**（P1 全清），**前台的功能缺口補完了**（P2 全清），**錯誤頁、骨架屏、SEO、限流、備份都有了**（P4.1-4.3、P5.1、P5.3）。剩下的是**憑證只有你能填**（P0.2）、**企劃書的三級認證還沒做**（P3.1），還有測試與快取這種有空再說的。
