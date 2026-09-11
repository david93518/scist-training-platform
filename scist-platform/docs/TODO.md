# 待補清單

2026-09-09 全面盤點，同日做掉三輪。分成七級，P0 是上線前一定要做的，P1 是後台看得到但實際沒生效的東西，往下依序是功能、企劃書承諾、工程基礎、安全，P6 是實作過程中發現的既有問題與已知限制。

每一項都寫了**在哪個檔案**與**怎麼驗收**。✅ 是已經做完的，底下有一行寫實際改了什麼。

| 級別 | 狀態 |
| --- | --- |
| P0 上線前必做 | 0.1 ✅、0.3 ✅（腳本備好，等你按）、**0.2 憑證只有你能填**、0.4 出貨預設值要換掉 |
| P1 後台設定沒生效 | ✅ 五項全做完 |
| P2 前台功能缺口 | ✅ 五項全做完 |
| P3 企劃書承諾 | 3.1 ✅、3.2 ✅、3.3 ✅、3.5 ✅；3.4 校際競賽未做 |
| P4 工程基礎 | 4.1 ✅、4.2 ✅、4.3 ✅、4.5 ✅、4.6 ✅；4.4 測試未做 |
| P5 安全與維運 | 5.1 ✅、5.3 ✅、5.4 ✅；5.2 內容審核、5.5 token 權限過大未做 |
| P6 已知限制 | 6.1 ✅；其餘五項未做。都是能上線、但規模長大後會咬人的東西 |

**只有你能做的**：0.2 憑證、0.3 按下清資料、0.4 換掉出貨預設值。其他都是工程項目。

登入已改成帳號密碼，不再用選角色的開發流程。第一個註冊的人是管理員；正式站請設 `BOOTSTRAP_ADMIN_HANDLE` / `BOOTSTRAP_ADMIN_PASSWORD`。

### ✅ 帳號密碼登入與權限（取代開發選角色）
- `users.password_hash`、`POST /api/auth/register` / `login` / `password`、管理員重設密碼。
- 註冊不能自選角色。`/api/auth/dev` 與 `/admin?as=…` 預設關閉。
- 儀表板可改密碼；後台「學員與角色」可重設。

---

## P0 上線前必做（現在做不了部署）

### 0.1 ✅ 專案還不是 git repo
`D:\SCIST計畫` 底下沒有 `.git`。Vercel 部署需要 GitHub repo，而且現在所有修改都沒有版本紀錄，改壞了無法回溯。

**已做**：`git init` 在 `D:\SCIST計畫`（不是 `scist-platform`，這樣 docs 與 workflow 都進得去），根目錄 `.gitignore` 擋掉 `node_modules/`、`.next/`、`.data/`、`.env.local`，`.gitattributes` 統一換行為 LF，`scist-platform/.gitignore` 加 `!.env.example` 讓範本進版控。已推到 `github.com/david93518/scist-training-platform`（`main`）。

### 0.2 六項外部服務憑證全部未填 ⬅️ 只有你能做
目前全部跑模擬模式。步驟在 [INTEGRATIONS.md](INTEGRATIONS.md)，建議順序與時間：

| 服務 | 沒接的後果 | 時間 |
| --- | --- | --- |
| Neon（`DATABASE_URL`） | 部署到 Vercel 會失敗（serverless 不能用 PGlite） | 20 分 |
| `AUTH_SECRET` | production 啟動時直接 throw | 1 分 |
| Discord OAuth | 可選；沒接也能用帳號密碼登入 | 30 分 |
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

### 0.4 出貨用的預設值要換掉 ⬅️ 只有你能做
`src/lib/settings-defaults.ts` 裡有幾個為了 demo 好看而先填的值，正式開放前要在後台改掉。這些不改不會壞，但會讓正式站看起來像沒設定過。

| 設定 | 目前的值 | 要改成 |
| --- | --- | --- |
| `weekly.slug` | `"sqli-login"` | 當週真正要出的題，或清成空字串讓整個區塊不出現 |
| `site.launch` | `"2026-10"` | 真實的開放時間 |
| `site.discordInvite` | `https://discord.gg/scist` | 真的邀請連結（現在這個不一定有效） |
| `certifications` 的門檻 | 對齊現有 14 堂課的示範內容 | 課程上架完之後重新抓一次，不然課變多了門檻會太鬆 |

最後一項要特別注意：三級認證的預設條件（任兩條／任三條路徑完課）是按照**現在只有 14 堂課**的規模訂的。等真的課程上架，「完成三條路徑」的難度會完全不同，要回後台「設定與整合 → 學員認證」重訂。

驗收：後台改完，首頁徽章、本週挑戰區塊、儀表板認證卡片都跟著變。

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

### 2.2b ✅ 發文後不能編輯、補充，講師只能從後台回覆
**已做**：`questions` / `answers` 各加一欄 `edited_at`（migration `0004_qa_edits`），前台問答面板補上四件事。

- 自己的提問與回覆可以就地編輯，改過會顯示「已編輯」。只有作者能改內容——助教與講師能刪、能採納，但不能替別人改字，不然討論串會變成沒人知道原本寫了什麼。
- 每一串都有回覆框，任何登入者都能直接在前台回。助教以上不受「開放發問」開關與限流影響，所以講師不用再繞去後台。
- 刪除：自己的回覆隨時能刪；整串問題只有在還沒有別人回覆時作者才能撤回（已經有人花時間回答就擋下來，回 400），講師以上不受限。刪掉被採納的那則會一併清空 `acceptedAnswerId`。
- 標最佳解答**不代表討論結束**：採納後回覆框還在，作者可以改標別則或按「取消最佳解答」（`acceptedAnswerId: null`），後台問答頁同樣多了取消的按鈕。

未登入時發的問題只存在瀏覽器，也一樣能改能刪（`store/progress.ts` 的 `editQuestion` / `removeQuestion`）。

### 2.2c ✅ 停權帳號登入時看不出原因
**已做**：`loginWithPassword()` 拆成兩段——帳號不存在或密碼錯還是一律回 401「帳號或密碼不對」（不能拿來探帳號），**密碼驗過之後**才回 403 並說明已被停權，訊息帶站點設定裡的 Discord 邀請連結當求助管道。

說法統一寫在 `src/lib/ban-notice.ts`，另外兩條路也接上：Discord 登入遇到停權帳號不設 cookie，導回 `/?login=banned` 讓登入視窗畫紅色說明；用到一半被停權時 `GET /api/me` 回 `{ authenticated: false, banned: true }` 並清掉 cookie，前台自動彈出同一段說明（以前只會安靜地變成訪客）。

### 2.3 ✅ 課程沒有搜尋
**已做**：抽出 `src/components/learn/track-list.tsx`，搜尋比對課名、英文名、標語、產出、大綱與底下每一課的標題。

### 2.4 ✅ 靶機到期後狀態不會自己更新
**已做**：`repo/ops.ts` 加 `expireInstances()`，`getProfile()` 與 `listInstancesAdmin()` 進來時順手把 `expires_at < now()` 的標成 `stopped`。

### 2.5 ✅ 刪掉附件不會刪掉 R2 上的檔案
**已做**：`saveChallenge()` 比對前後的 `files`，`deleteChallenge()` 比對全部，消失的那些交給 `dropOrphanedObjects()` 呼叫 `deleteObject()`。

---

## P3 企劃書寫了但平台沒有

### 3.1 ✅ 學員三級認證（入門 / 進階 / 菁英）
企劃書第 111-124 行那張表，現在平台上找得到了。跟七級 XP 階級是分開的兩套：階級看累積分數，認證看完成了哪些課、解了幾題、擔任什麼角色。

**已做**：

- `src/lib/certifications.ts` 定義規則與判定。條件支援「指定路徑完課」、「任意幾條路徑完課」、「完成幾堂課」、「解出幾題」、「角色至少到某一級」，留白的項目就不檢查。
- 條件存在 `settings.certifications`，後台「設定與整合 → 學員認證」可改，包含名稱、顏色、能力指標與對應競賽目標。
- 儀表板新增「學員認證」卡片：三級並排，每一級逐項列出達成情形與「還差幾項」；已取得的那一級同時掛在帳號名稱旁邊當徽章。
- 內建預設對齊企劃書：入門＝Linux 與雜項完課 + 任兩條路徑 + 解出 1 題；進階＝任三條路徑 + 6 題；菁英＝五大領域全完課 + 12 題 + 助教以上。

驗收：`/dashboard` 看到三級卡片；把 `settings.certifications` 的門檻改小再重載，徽章要跟著出現。

### 3.2 ✅ 助教時數累積與兌換
企劃書第 109 行的「累積助教時數可兌換優先報名資深課程資格」，需要一個算得出來的貢獻數字。

**已做**：`listUsersAdmin()` 與 `getUserDetail()` 從 `answers` 統計每個人的回答數，再 join `questions.accepted_answer_id` 算出被採納數。後台「學員與角色」多一欄「助教貢獻」，上方另有「助教貢獻」榜依採納數排序，點下去直接開該學員的詳情。

兌換本身仍是人工決定：這裡提供的是判斷依據，不是自動發獎。

### 3.3 ✅ 每週解題挑戰
企劃書第 192 行「設立每週解題挑戰，前三名公告表揚」。

**已做**：

- `settings.weekly`（題目 slug、說明文字、前三名加分 XP），後台「設定與整合 → 本週挑戰」可改；slug 留空整個區塊就不出現。
- `getWeeklyChallenge()` 依 `leaderboard.weekStartsOn` 算本週區間，名次照「這一週第一次解出」的時間排，所以上週就解掉的人不佔名額。首頁與題庫頁置頂顯示。
- `settleWeeklyChallenge()` 發前三名加分並貼 Discord 戰報。加分寫進 `xp_ledger`，label 帶週起日，同一週重複觸發不會重複發。
- 觸發方式有兩個：後台「結算本週並公告」按鈕，或 `.github/workflows/weekly-settle.yml` 定時打 `POST /api/admin/weekly/settle`。跟備份一樣用 `Authorization: Bearer $BACKUP_TOKEN` 認證，因為 Action 沒辦法做 Discord 登入。
- cron 排在週日 14:00 UTC，也就是台北週日 22:00。週界線是台北時間（見 6.1），預設 `weekStartsOn = 0` 時即週日 00:00 台北。改起算日要記得一起改 cron。

驗收：後台指定一題 → 首頁與 `/challenges` 置頂出現該題 → 按「結算本週並公告」看 toast 與 Discord。

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

後來又多了兩個值得測的純函式，它們不碰資料庫，測起來最便宜：

- `src/lib/certifications.ts` 的 `evaluateCertifications()`：條件組合多，而且「留白＝不檢查」跟「空條件不得獎」這兩條規則很容易在改動時破掉。
- `src/lib/xp.ts` 的 `rankFor` / `rankProgress`：門檻是後台可改的，順序不保證。

估時：半天。

### 4.5 ✅ 快取
首頁一次打八個資料庫查詢，每個請求都重算。示範資料量小沒感覺，2000 人之後會慢。

**已做**：`src/server/cache.ts` 是一個帶 TTL 的 process 內 memo。存的是 promise 不是值，所以同時進來的請求共用一次查詢；查詢失敗會把 entry 丟掉，不會讓整個 TTL 內的人都吃到同一個錯誤。

- 內容（路徑、課程、題目、活動、講師）60 秒，後台存檔時 `invalidate()` 立刻失效。
- 首頁數字、排行榜、活動牆、本週挑戰 30 秒，讓它自然過期。
- 設定 60 秒，`saveSettings()` 存完全部清掉。
- 開發環境整個關閉，不然改完內容要等 TTL 過才看得到。

刻意不用 `unstable_cache` / `"use cache"`：那需要開 `cacheComponents`，會改動每一頁的 render 語意，還要補 Suspense 邊界。這裡每一個 key 都是公開讀取，最壞情況只是舊幾秒，不放任何跟使用者有關的資料。

⚠️ 這個快取是 **process 內**的，不跨 instance。限制寫在 6.2。

### 4.6 ✅ CI
GitHub 上原本只有備份與週結算，push 壞掉的 code 沒人擋。

**已做**：`.github/workflows/ci.yml` 在 push 到 `main` 與每個 PR 跑 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm build`。working-directory 是 `scist-platform`。build 不需要真的資料庫，`getSettingsSafe()` 會退回預設值。

---

## P5 安全與維運

### 5.1 ✅ 發問沒有限流
**已做**：`createQuestion()` / `createAnswer()` 都加「每人每 10 分鐘最多 5 則」，助教以上從後台回答不受限。

### 5.2 問答沒有任何內容審核
使用者輸入直接顯示。後台可以刪，但沒有檢舉、沒有關鍵字過濾。高中生社群這塊要想一下。

估時：看要做多完整。

### 5.3 ✅ 沒有備份策略
**已做**：`.github/workflows/backup.yml` 每週一 03:00（台北）打 `GET /api/admin/export`，驗過 JSON 才存成 artifact，保留 90 天。因為 Action 沒辦法做 Discord 登入，改用 `Authorization: Bearer $BACKUP_TOKEN`（timing-safe 比對，共用邏輯在 `hasAutomationToken()`）。3.3 的每週結算走同一條路。

要用得先設好：repo secret `BACKUP_TOKEN`、repo variable `APP_URL`，以及部署環境的同名環境變數。沒設 `BACKUP_TOKEN` 時 bearer 這條路整條關閉。

### 5.4 ✅ 錯誤監控
線上出錯只會進 Vercel log，沒有人會發現。

**已做**：接 `@sentry/nextjs`，沒設 DSN 時整套關閉，本機與 CI 不必申請帳號。

- `src/instrumentation.ts` 的 `register()` + `onRequestError` 抓 Server Component / Route Handler 的錯。
- `src/instrumentation-client.ts` 抓瀏覽器端。
- `error.tsx` / `global-error.tsx` 額外 `captureException`，digest 仍顯示在畫面上方便對照。
- 不上報個資、不開 Session Replay、不上傳 source map（所以不必 `SENTRY_AUTH_TOKEN`）。
- 後台「設定與整合」多一列，填了 `SENTRY_DSN` 或 `NEXT_PUBLIC_SENTRY_DSN` 就亮。

驗收：Vercel 填同一個 DSN 到兩個變數，故意讓一頁炸掉，Sentry 專案裡出現那筆。

### 5.5 `BACKUP_TOKEN` 現在也能發 XP
原本這個 token 只給 `GET /api/admin/export` 用，是唯讀的。3.3 的週結算也接受同一個 token（`hasAutomationToken()`），而那支端點會**寫 xp_ledger**。等於這個字串外洩的後果從「資料被讀走」變成「資料被讀走，而且對方能發 XP」。

以現況可以接受：結算端點沒有參數，只會照後台設定好的題目發固定分數給前三名，而且同一週不重複發，所以最壞情況是有人幫你按了那顆按鈕。但這是一條要記著的線。

要補（擇一）：

1. 拆成兩個 token，`BACKUP_TOKEN`（唯讀）與 `AUTOMATION_TOKEN`（可寫），`hasAutomationToken()` 收一個參數決定比對哪一個。
2. 或者把週結算改成 Vercel Cron + 內部呼叫，完全不開 HTTP 端點。

估時：30 分鐘。

---

## P6 實作中發現的既有問題與已知限制

這一節不是「功能沒做」，是「做完之後才看清楚的東西」。全部都不影響現在上線，但規模長大或環境改變時會咬人，先寫下來免得之後查半天。

### 6.1 ✅ 週的邊界用伺服器時區，不是台北時區
`weekStart()` 原本用 `Date#setHours(0,0,0,0)`，看的是伺服器本地時間。Vercel 是 UTC，週榜會在台北週日早上 08:00 才歸零。同一個檔案的連續登入卻手動 `+8 小時`，兩套並存。

**已做**：`src/lib/timezone.ts` 用 `Intl` 算台北日曆。`weekStart()`、`learner.ts` 的週榜、`streakOf` 都改讀它。`weekly-settle.yml` 改排台北週日 22:00（14:00 UTC），卡在下一週開始之前。排行榜文案與後台「週榜起算日」都寫明是台北凌晨。

### 6.2 快取不跨 instance
4.5 的快取是一個 process 內的 `Map`。在 Vercel 上每個 lambda instance 各有一份，所以：

- 後台存檔時的 `invalidate()` **只清掉處理那個請求的那一台**。其他 instance 要等 TTL 到期（內容 60 秒、設定 60 秒）才會看到新內容。
- 也就是「後台改完，前台可能要等最多 60 秒才全部一致」。
- 流量低的時候 instance 少，幾乎感覺不到；流量高的時候 instance 多，不一致的視窗反而更明顯。

以現況可以接受：改內容的頻率很低，而且晚 60 秒沒有人會受傷。

要補（規模到了再說）：換成 Upstash Redis 之類的共享快取，或改用 Next 的 `revalidateTag()`（但那要開 `cacheComponents`，見 4.5 的說明）。

### 6.3 三級認證只在瀏覽器算，伺服器沒有紀錄
`evaluateCertifications()` 跑在 client，資料來自 zustand store。後果：

- **後台看不到誰拿到哪一級**。要一份「已取得進階認證的學員名單」拿去談 AIS3 補助，現在調不出來。
- 沒有「取得時間」，所以做不出「本學期新增 N 位進階認證」這種數字。
- 沒有發證的概念：不能發編號、不能產生可分享的證書頁或 PDF。
- 學員自己改瀏覽器狀態就能讓徽章亮起來（純顯示，不影響任何權限，所以現在無害）。

要補：`certifications` 判定搬一份到 server（`repo/learner.ts` 或新的 `repo/certifications.ts`），加一張 `user_certifications` 表記錄 `userId / certId / earnedAt`，在解題與完課的路徑上檢查並補寫。後台「學員與角色」多一欄，數據頁多一個「各級認證人數」。

估時：一天。這件事在要「拿名單去談補助」的那一刻會變成 P0。

### 6.4 助教「時數」其實是回答數，不是時數
企劃書第 109 行寫的是**時數**，3.2 做出來的是**回答數與被採納數**。兩者不等價：

- 線下帶課、Discord 上即時回答、幫忙出題，這些都不會進 `answers`，等於白做。
- 也沒有「已兌換」的紀錄，兌換過的人下次還是顯示同樣的數字。

要補：一張 `ta_hours` 表（`userId / hours / kind / note / loggedBy / at`），後台可以手動登記線下時數，跟自動算出來的回答數並列；再加一個 `ta_redemptions` 記錄兌換掉多少。

估時：半天。

### 6.5 沒有公開的個人頁
只有 `/dashboard`，而且只看得到自己。排行榜上的名字點不進去，認證徽章沒辦法分享給別人看。

對 3.1 的認證來說這是個缺口：拿到「菁英認證」卻只有自己看得到，激勵效果少一半。

要補：`/u/[handle]` 公開頁，顯示階級、認證徽章、解題數、所屬學校，不顯示 email 與進度細節。要先想清楚隱私預設值——高中生的資料，預設應該是**不公開**，由學員自己在儀表板開啟。

估時：半天，加上隱私設計的討論時間。

### 6.6 OG 分享圖沒有中文
已經寫在 4.3 的 ⚠️ 裡，這裡再列一次因為它是「看得到但沒解決」的：`ImageResponse` 底層的 Satori 內建字型沒有 CJK 字符，所以分享預覽圖現在是純英文的。

要補：把 Noto Sans TC 的 `.ttf`（subset 過，不然檔案很大）放進 `src/app/assets/`，在 `opengraph-image.tsx` 的 `fonts` 傳進去，然後就能把標語換成中文。

估時：1 小時，主要花在 subset 字型。

---

## 接下來

### 你來做（工程做不了）

1. 0.2 填六項憑證 → 部署 Vercel
2. 0.4 後台換掉出貨預設值（本週挑戰的題目、開放時間、Discord 邀請、認證門檻）
3. 開放前跑 `pnpm db:clean-demo --yes`

### 上線前建議補完

| 項目 | 為什麼 | 估時 |
| --- | --- | --- |
| 5.5 拆 token | 週結算讓備份 token 從唯讀變成能寫 | 30 分 |
| 5.4 填 Sentry DSN | 程式接好了，沒填變數還是不會上報 | 10 分 |

### 開站後看情況

| 項目 | 什麼時候會變急 | 估時 |
| --- | --- | --- |
| 6.3 認證存到資料庫 | **要拿認證名單去談補助的那一刻** | 一天 |
| 5.2 內容審核 | 第一次有人在問答區亂發東西 | 看做多完整 |
| 4.4 測試 | 要動 flag 比對或 XP 計算的時候 | 半天 |
| 6.5 公開個人頁 | 學員想炫耀認證徽章 | 半天 |
| 6.4 助教時數 | 真的要開始兌換的時候 | 半天 |
| 6.2 共享快取 | 同時上線人數把 instance 撐到很多台 | 看選哪個方案 |
| 3.4 SCIST 盃計分 | 第一屆要辦之前 | 一到三天 |
| 6.6 OG 中文字型 | 想讓分享預覽圖有中文 | 1 小時 |

## 一句話總結

**後台的設定頁真的會生效**（P1 全清），**前台功能缺口補完**（P2 全清），**企劃書承諾的三級認證、助教貢獻統計、每週挑戰都做出來了**（P3 只剩 3.4 校際競賽），**錯誤頁、骨架屏、SEO、限流、備份、快取、CI、Sentry、台北時區週界都有了**（P4 只剩測試）。

剩下的分三類：**只有你能做的**是憑證、Sentry DSN 與出貨預設值（0.2、0.4、5.4 的填值）；**上線前還能再補的**是拆 token（5.5）；**已知但可以先扛著的**是 P6 其餘五項，其中 6.3（認證只在瀏覽器算，後台調不出名單）最可能在談補助時突然變成擋路的東西。
