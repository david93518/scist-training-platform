# 待補清單

2026-09-09 全面盤點。分成六級，P0 是上線前一定要做的，P1 是我做到一半、後台看得到但實際沒生效的東西，往下依序是功能、企劃書承諾、工程基礎、安全。

每一項都寫了**在哪個檔案**與**怎麼驗收**，可以直接照著做。

---

## P0 上線前必做（現在做不了部署）

### 0.1 專案還不是 git repo
`D:\SCIST計畫` 底下沒有 `.git`。Vercel 部署需要 GitHub repo，而且現在所有修改都沒有版本紀錄，改壞了無法回溯。

```bash
cd "D:/SCIST計畫"
git init
printf 'node_modules/\n.next/\n.data/\n.env.local\n' > .gitignore
git add . && git commit -m "SCIST Gate: 平台初版"
```

驗收：`git log` 有一筆；GitHub 上看得到 repo。

### 0.2 六項外部服務憑證全部未填
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

驗收：後台「設定與整合」六列全部變成「已設定」。

### 0.3 示範資料要清掉
正式開放前必須處理，不然假帳號會出現在真的排行榜上。

- **示範帳號**：`users` 裡 id 為 `p1`…`p30` 的 30 個人，還有測試留下的 `tester`、`helper`、`dev-admin`、`e2e-user`。
- **示範 XP**：`xp_ledger` 裡 `reason = 'admin'` 且 label 含「示範資料」的 60 筆。
- **假解題紀錄**：seed 產生的 `solves`。
- **初始顯示數據**：每一題的 `base_solves`、每個活動的 `base_registered`，這兩個數字會**加到**真實數字上，不歸零的話解題數永遠灌水。

```sql
delete from xp_ledger where reason = 'admin' and label like '示範資料%';
delete from users where id like 'p%' or handle in ('tester','helper','dev-admin','e2e-user');
update challenges set base_solves = 0, rating = 0;
update events set base_registered = 0;
```

驗收：排行榜是空的，題目卡片顯示 0 人解出。

---

## P1 後台改得到、但實際沒生效（我做的東西不完整）

這五項是後台設定頁上看得到、存得進資料庫，但**前台完全沒讀**的東西。改了不會有任何效果，最容易讓人誤會。

### 1.1 階級門檻改了沒用 ⚠️ 影響最大
後台「階級門檻」可以改七個階級的名稱、XP 門檻、顏色，存進 `settings.ranks`。但前台的排行榜、儀表板、頁首、後台學員詳情**全部讀 `src/lib/xp.ts` 的硬編碼 `RANKS`**。

要補：
1. `src/lib/xp.ts` 的 `rankFor` / `nextRank` / `rankProgress` 改成接受 `ranks` 參數，`RANKS` 只當 fallback 預設值。
2. Server Component（`/leaderboard`、`/dashboard`）用 `getSettings()` 取 ranks 傳進去。
3. 頁首與 `HexAvatar` 之類的 client 元件，透過一個 `SettingsProvider`（新增 `src/components/settings-provider.tsx`）從根 layout 注入。

驗收：後台把「駭客」門檻從 1000 改成 500，排行榜側欄的階級表立刻變。

### 1.2 XP 預設值沒有被用
`settings.xp.checkpointDefault`（25）與 `lessonDefault`（80）存了，但 `src/components/admin/lesson-editor.tsx` 新增課程時寫死 `xp: 80`、新增檢查站寫死 `xp: 25`。

要補：`lesson-editor.tsx` 的 `blankLesson()` 與檢查站 `make()` 改讀後台設定。

驗收：後台把完成課程預設 XP 改成 100，新增課程時「完成 XP」欄預填 100。

### 1.3 「解出後退還提示扣的 XP」完全沒實作
`settings.xp.hintRefundOnSolve` 這個開關存了，但沒有任何程式讀它。打開也不會退。

要補：`src/server/repo/learner.ts` 的 `attemptFlag()` 在成功解出後，若設定開啟，查該題已解鎖的提示，寫一筆正數 `xp_ledger`（reason 用 `hint`，label 寫「解出後退還提示 XP」）。

驗收：打開開關，解鎖提示再解題，XP 回到扣之前。

### 1.4 三個功能開關沒有任何作用
`settings.features` 的三個開關存了但沒人讀：

| 開關 | 應該要做的事 | 改哪裡 |
| --- | --- | --- |
| `guestProgress` | 關掉時，未登入者看課不記進度，改顯示「登入才能記錄」 | `src/store/progress.ts`、`lesson-player.tsx` |
| `instances` | 關掉時，題目頁不顯示「啟動環境」，只顯示固定連線資訊 | `src/components/challenges/instance-panel.tsx` |
| `questions` | 關掉時，問答區只能看不能發 | `src/components/community/qa-panel.tsx` |

驗收：關掉「開放發問」，題目頁的發問表單消失。

### 1.5 站點名稱與標語沒有套用
`settings.site.name`、`tagline`、`launch` 存了，但 `src/app/layout.tsx` 的 metadata、首頁的「2026.10 正式開放」徽章都是寫死的。

要補：`layout.tsx` 改成 `generateMetadata()` 讀 `getSettings()`；首頁徽章用 `settings.site.launch`。

驗收：後台把標語改掉，瀏覽器分頁標題跟著變。

---

## P2 功能缺口（前台）

### 2.1 問答不能投票
`qa-panel.tsx` 顯示 `q.votes` 與 `a.votes`，但沒有任何按鈕，數字永遠是 0（新問題）或 seed 值。資料庫的 `votes` 欄位也沒有防重複投票的表。

要補：新增 `question_votes` / `answer_votes` 表（userId + 目標 id 唯一），`POST /api/questions/[id]/vote`，前台把數字改成可點的按鈕。

估時：2 小時。

### 2.2 發問者不能自己採納最佳解答
只有後台（助教以上）能採納。發問者自己應該也能標記哪個回答解決了他的問題。

要補：`PATCH /api/questions/[id]` 放寬成「助教以上**或**問題作者本人」，前台每則回答加一個「這個解決了我的問題」按鈕。

估時：1 小時。

### 2.3 課程沒有搜尋
題庫有搜尋與篩選，`/learn` 只有一張列表。課程多了之後不好找。

要補：`/learn` 加一個搜尋框（比對課名、摘要、大綱關鍵字），做法照抄 `arena.tsx`。

估時：1 小時。

### 2.4 靶機到期後狀態不會自己更新
`getProfile()` 只看 `status = 'running'`，不管 `expires_at` 過了沒。VPS 上的 instancer 會回收容器，但資料庫那筆還是 running，前台就一直顯示 RUNNING（文字有寫「已到期」，但狀態沒清）。

要補：
1. `getProfile()` 與 `listInstancesAdmin()` 過濾掉 `expires_at < now()`。
2. 加一個 `expireInstances()` 到 `src/server/repo/ops.ts`，在 `getProfile()` 時順手把過期的標成 `stopped`。

估時：30 分鐘。

### 2.5 刪掉附件不會刪掉 R2 上的檔案
後台題目編輯器的附件「移除」只是把它從清單拿掉，R2 上的物件永遠留著（會一直算儲存費）。`deleteObject()` 已經寫好但沒人呼叫。

要補：`saveChallenge()` 比對前後的 `files`，對消失的那些呼叫 `deleteObject()`。

估時：30 分鐘。

---

## P3 企劃書寫了但平台沒有

### 3.1 學員三級認證（入門 / 進階 / 菁英）
企劃書第 111-124 行明訂三個等級，每級有**能力指標**與**對應競賽目標**：

| 等級 | 能力指標 | 對應競賽目標 |
| --- | --- | --- |
| 入門 | 完成 Linux 基礎 + 任一領域入門課程 | MyFirstCTF 參賽 |
| 進階 | 完成 3 個以上領域課程，具備解題能力 | AIS3 Pre-Exam 前 75 名 |
| 菁英 | 全五領域精通，具備出題與教學能力 | 成為 SCIST 講師/助教 |

平台目前只有**七級 XP 階級**（新手到傳說），那是遊戲化的分數階級，跟這個以「完成哪些課程」為條件的認證是兩回事。企劃書拿這張表去談 AIS3 補助，平台上卻找不到，這是最明顯的落差。

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

### 3.5 KPI 目標線沒有標在數據頁
企劃書的 KPI 有明確目標（6 個月 500 人註冊、40% 完課率；12 個月 2000 人、60%）。後台數據頁算了實際值，但沒有跟目標對照。

要補：`analytics-admin.tsx` 的 KPI 卡加一條目標線與達成率。

估時：1 小時。

---

## P4 工程基礎（品質，不影響功能）

### 4.1 沒有錯誤頁
缺 `src/app/error.tsx` 與 `src/app/global-error.tsx`。資料庫斷線時使用者看到的是 Next.js 預設的白底錯誤畫面，跟整站風格完全不搭。

估時：30 分鐘。

### 4.2 沒有 loading 骨架
所有頁面都是 `force-dynamic`，每次切換頁面要等資料庫查完才有畫面。缺 `loading.tsx`，中間是空白。

要補：`src/app/loading.tsx` 加一個 hex 風格的骨架屏；`/learn`、`/challenges` 各自加一個更貼近版面的。

估時：1 小時。

### 4.3 SEO 與分享預覽
- 缺 `src/app/sitemap.ts`：搜尋引擎收不到課程與題目頁。
- 缺 `src/app/robots.ts`：`/admin` 沒有明確擋掉（layout 有 `robots: noindex` 但沒有 robots.txt）。
- 缺 `opengraph-image`：貼到 Discord / IG 沒有預覽圖，企劃書的行銷策略要用到。

估時：2 小時。

### 4.4 沒有任何測試
一個測試都沒有。改動 flag 比對、XP 計算、進度合併這種邏輯時沒有任何保護。

建議至少補：`repo/learner.ts` 的 `attemptFlag`、`answerCheckpoint`、`unlockHint` 三個函式的單元測試（用 PGlite 跑，很快）。

估時：半天。

### 4.5 快取
首頁一次打七個資料庫查詢，每個請求都重算。示範資料量小沒感覺，2000 人之後會慢。

要補：`getSiteStats()`、`getRecentActivity()`、`getInstructorsPublic()` 這種不常變的加 `unstable_cache`（60 秒）。

估時：1 小時。

---

## P5 安全與維運

### 5.1 發問沒有限流
解題有限流（5 分鐘 20 次），但發問、回答、報名都沒有。一個人可以無限發問洗版，而且每一則都會打 Discord webhook。

要補：`createQuestion()` / `createAnswer()` 加「每人每 10 分鐘最多 5 則」。

估時：30 分鐘。

### 5.2 問答沒有任何內容審核
使用者輸入直接顯示。後台可以刪，但沒有檢舉、沒有關鍵字過濾。高中生社群這塊要想一下。

估時：看要做多完整。

### 5.3 沒有備份策略
Neon 免費層有 7 天 point-in-time restore，但沒有定期匯出。後台有「匯出全部內容（JSON）」，但要人手動按。

要補：一個 GitHub Action 每週打 `GET /api/admin/export` 存成 artifact。

估時：1 小時。

### 5.4 沒有錯誤監控
線上出錯只會進 Vercel log，沒有人會發現。建議接 Sentry 免費層。

估時：30 分鐘。

---

## 建議順序

1. **這週**：P0 全部（git、憑證、清示範資料）→ 可以部署
2. **下週**：P1 全部（後台設定生效）→ 後台才名副其實
3. **開放前**：P4.1 錯誤頁、P4.3 SEO 與預覽圖、P5.1 發問限流
4. **開放後**：P2 功能缺口、P3.1 三級認證（這個對申請補助最有用）
5. **有空再說**：P3 其他、P4.4 測試、P4.5 快取

## 一句話總結

**能跑，但後台的「設定」頁有一半是裝飾用的**（P1），**企劃書承諾的三級認證還沒做**（P3.1），**而且還沒進版控、憑證全空所以還不能部署**（P0）。
