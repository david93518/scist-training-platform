# API 合約

所有端點都在 `/api/*`，回 JSON。輸入驗證在 `src/server/validators.ts`，實作在 `src/app/api/**/route.ts`，邏輯在 `src/server/repo/*`。

## 通用

- 需要登入的端點沒有 session 回 `401 { "error": "需要登入" }`；權限不足回 `403`。
- 輸入不合法回 `400 { "error": "invalid body: …" }`。
- 找不到回 `404`；伺服器錯誤回 `500 { "error": "internal error" }`。
- 成功刪除回 `204` 無內容。
- 所有時間都是 ISO 8601 字串（UTC）。
- Session 在 httpOnly cookie `scist_session`，瀏覽器會自動帶；用 curl 要 `-c jar -b jar`。

## 登入

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/api/auth/discord?next=/admin` | 導向 Discord 授權頁；未設定時回 503。`next` 只接受站內路徑（`/` 開頭、非 `//`），記在 `scist_oauth_next` cookie 十分鐘 |
| `GET` | `/api/auth/discord/callback?code&state` | Discord 回來的地方；建立或更新使用者，設 cookie，導向 `next`（沒有就 `/dashboard`） |
| `POST` | `/api/auth/dev` | **僅開發環境**。`{ handle, schoolId?, role }` → 設 cookie |
| `GET` | `/api/auth/dev?role=admin&handle=dev-admin&next=/admin` | **僅開發環境**。同上但用連結，`/admin?as=admin` 的守門會導到這裡 |
| `POST` | `/api/auth/logout` | 清 cookie |
| `GET` | `/api/me` | 未登入 `{ authenticated: false }`；登入後回 profile（見下） |

`/api/me` 的回應跟 `src/store/progress.ts` 的狀態同形狀，`ProgressSync` 直接拿它覆蓋本機 store：

```json
{
  "authenticated": true,
  "user": { "id": "…", "handle": "tester", "displayName": "tester", "avatarUrl": null, "role": "admin", "schoolId": "tnfsh", "school": "南一中" },
  "xp": 330,
  "watched": { "web-security/sql-injection": 0.62 },
  "completedLessons": ["web-security/http-basics"],
  "checkpoints": { "web-security/sql-injection": [0, 1] },
  "notes": { "web-security/sql-injection": "…" },
  "solved": { "welcome": ["flag"], "box-anping": ["user"] },
  "revealedHints": { "sqli-login": ["c-sqli-h1"] },
  "instances": { "sqli-login": { "host": "10.31.4.21", "port": 31201, "expiresAt": "…", "startedAt": 1757… } },
  "registeredEvents": ["e1"],
  "log": [{ "id": "…", "kind": "solve", "label": "解出 Welcome to the Gate", "xp": 50, "at": "…" }]
}
```

## 學員端

### `POST /api/progress`（需登入）

一支端點處理課程進度，用 `action` 區分：

```json
{ "action": "watched",    "track": "web-security", "lesson": "sql-injection", "value": 0.62 }
{ "action": "checkpoint", "track": "web-security", "lesson": "sql-injection", "index": 1 }
{ "action": "complete",   "track": "web-security", "lesson": "sql-injection" }
{ "action": "note",       "track": "web-security", "lesson": "sql-injection", "note": "…" }
```

回應：`watched` → `{ watched }`；`checkpoint` → `{ awarded, checkpointsDone }`（重複答同一站 `awarded` 為 0）；`complete` → `{ awarded }`（檢查站沒過完回 400）；`note` → `{ ok }`。

### `POST /api/challenges/{slug}/attempt`（需登入）

```json
→ { "flag": "SCIST{w3lc0m3_t0_th3_g4t3}" }
← { "status": "correct", "message": "正確！", "flagId": "flag", "points": 50, "firstBlood": false }
← { "status": "incorrect", "message": "Flag 不對。…" }
← { "status": "already_solved", "message": "這個 flag 你已經交過了。", "flagId": "flag", "points": 0 }
```

五分鐘內同一題超過 20 次回 `429`。錯誤的提交只留雜湊。First Blood 會打 Discord webhook。

### `POST /api/challenges/{slug}/hints/{hintId}`（需登入）

`← { text, cost }`。要依序解鎖；已解鎖過 `cost` 為 0。XP 從 ledger 扣。

### `POST | DELETE /api/challenges/{slug}/instance`（需登入）

```json
POST ← 201 { "id": "…", "host": "10.31.4.21", "port": 31201, "expiresAt": "…", "type": "http", "shared": false }
POST ← 201 { "host": "nc ecb.gate.scist.org 32001", "port": null, "expiresAt": null, "type": "nc", "shared": true }   // 題目沒有 Docker 映像，只有固定連線資訊
DELETE ← { "stopped": 1 }
```

### `GET /api/leaderboard?scope=weekly|alltime|schools`

```json
{ "scope": "weekly", "entries": [ { "id", "handle", "schoolId", "school", "role", "xp", "solves", "isAssistant" } ] }
{ "scope": "schools", "entries": [ { "schoolId", "school", "xp", "members", "solves" } ] }
```

### 問答

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/api/questions?scope=lesson\|challenge&ref=…` | 該課或該題的問題，形狀同 `src/data/questions.ts` |
| `POST` | `/api/questions` | 需登入。`{ scope, refId, title, body }` → 201，同時打 Discord webhook |
| `POST` | `/api/questions/{id}/answers` | 需登入。`{ body }` → 201 `{ id }` |

### `POST /api/events/{id}/register`（需登入）

`{ on: true|false }` → `{ registered }`。額滿回 409。

## 後台（`/api/admin/*`，需講師以上；標註者需管理員）

回傳與接受的物件形狀就是 `src/admin/types.ts` 裡的 `AdminTrack`、`AdminLesson`、`AdminChallenge`、`AdminEvent`、`AdminInstructor`、`AdminUser`、`AdminUserDetail`、`AdminQuestion`、`AdminInstance`、`AuditEntry`、`AdminAnalytics`、`AdminSettings`。後台的 `httpApi`（`src/admin/api.ts`）已經照這張表呼叫。每一個寫入都會在 `audit_log` 留一筆（誰、動作、對象、說明），`GET /audit` 讀得到。

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/status` | 整合狀態：資料庫種類、各服務是否設定 |
| `GET` | `/stats` | 總覽數字、卡關點、最近更新 |
| `GET` | `/tracks` | 路徑（含章節） |
| `PUT` | `/tracks/{id}` | 建立或更新；body 的 `id` 必須等於路徑 |
| `DELETE` | `/tracks/{id}` | **管理員**。連同課程一起刪 |
| `GET` | `/lessons` | 全部課程 |
| `PUT` | `/lessons/{id}` | 建立或更新 |
| `DELETE` | `/lessons/{id}` | |
| `POST` | `/lessons/reorder` | `{ moduleId, ids }` 依序設定 sortOrder |
| `GET` | `/challenges` | 全部題目（含 flags 的雜湊、提示、附件） |
| `PUT` | `/challenges/{id}` | flags 可帶 `plaintext`，伺服器算 SHA-256 後丟掉明文；沒帶就沿用 `sha256` |
| `DELETE` | `/challenges/{id}` | |
| `GET` | `/events` | |
| `PUT` | `/events/{id}` | |
| `DELETE` | `/events/{id}` | |
| `GET` | `/users` | 帳號、角色、XP、解題數 |
| `PATCH` | `/users/{id}` | **管理員**。`{ role? , banned? }` |
| `GET` | `/questions` | 全部問題含回覆 |
| `PATCH` | `/questions/{id}` | 助教以上。`{ acceptedAnswerId }` |
| `DELETE` | `/questions/{id}` | |
| `POST` | `/questions/{id}/answers` | 助教以上。`{ body }` |
| `GET` | `/settings` | 含 `site`、`ranks`、`certifications`、`xp`、`leaderboard`、`weekly`、`features` |
| `PUT` | `/settings` | **管理員** |
| `POST` | `/uploads/video` | `{ lessonId, name, size, type }` → 201 `{ mode: "direct"\|"mock", uploadUrl?, id }`。`direct` 時瀏覽器把檔案以 multipart `file` 欄位 POST 到 `uploadUrl` |
| `GET` | `/uploads/video/{id}` | `{ id, status }`，status ∈ uploading / processing / ready / error；順便寫回 lessons |
| `POST` | `/uploads/file` | `{ challengeId, name, size, type }` → 201 `{ mode, uploadUrl?, id, objectKey }`。`direct` 時瀏覽器 PUT 檔案內容到 `uploadUrl` |
| `POST` | `/import/ctfd` | CTFd 匯出 JSON → `{ imported, skipped }`，題目以草稿建立 |
| `GET` | `/export` | 全部內容 JSON。也接受 `Authorization: Bearer $BACKUP_TOKEN`，給每週備份的 Action 用 |
| `POST` | `/weekly/settle` | 結算本週挑戰：發前三名加分 + 貼 Discord 戰報 → `{ ok, message, awarded, posted }`。同一週重複打不會重複發分。也接受 `BACKUP_TOKEN` |
| `GET` | `/instructors` | 講師名單（助教以上） |
| `PUT` | `/instructors/{id}` | 建立或更新講師；`userId` 綁定已登入的 Discord 帳號 |
| `DELETE` | `/instructors/{id}` | **管理員**。同時清掉路徑、題目、活動上的講師欄位 |
| `GET` | `/users/{id}` | 學員詳情 `{ user, joinedAt, ledger, solves, lessons, questions }`（助教以上）。`user` 含 `answers` 與 `accepted`，即助教貢獻 |
| `POST` | `/users/{id}/xp` | **管理員**。`{ delta, reason }` → `{ xp }`；寫一筆 reason = admin 的 xp_ledger |
| `GET` | `/instances` | 運行中的靶機環境（助教以上） |
| `DELETE` | `/instances/{id}` | 關閉一個環境：通知 instancer 刪容器，狀態改 stopped（助教以上） |
| `DELETE` | `/instances` | 全部關閉 → `{ stopped }` |
| `GET` | `/audit?limit=200` | 操作紀錄，最新在前，最多 500 筆 |
| `GET` | `/analytics` | KPI：12 週趨勢、學習漏斗、各路徑完課率、各類別解題率、各校、卡關課程（助教以上） |

## 一段可以直接跑的流程

```bash
J=/tmp/jar
curl -s -c $J -X POST localhost:3000/api/auth/dev -H 'content-type: application/json' -d '{"handle":"tester","role":"admin"}'
curl -s -b $J localhost:3000/api/me
curl -s -b $J localhost:3000/api/admin/stats
curl -s -b $J -X POST localhost:3000/api/challenges/welcome/attempt -H 'content-type: application/json' -d '{"flag":"SCIST{w3lc0m3_t0_th3_g4t3}"}'
curl -s -b $J -X POST localhost:3000/api/progress -H 'content-type: application/json' -d '{"action":"checkpoint","track":"web-security","lesson":"sql-injection","index":0}'
curl -s localhost:3000/api/leaderboard?scope=weekly | head -c 300
```
