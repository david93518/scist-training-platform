# 外部服務怎麼接

每一項都是獨立的：沒設定就跑模擬模式，設定了就變真的。程式碼位置都標在標題旁。變數填在專案根目錄的 `.env.local`（範本在 `.env.example`），改完重啟 `pnpm dev`。後台「設定與整合」頁會顯示每一項有沒有接上。

## 1. 資料庫 — `src/server/db/index.ts`

**本機**：什麼都不用做，`pnpm dev` 會在 `.data/pglite` 建一個內嵌 Postgres，空資料庫會自動灌示範內容（`pnpm db:seed --force` 可以重灌）。

**正式**（擇一）：

- **Neon**（推薦，免費層夠用）：neon.tech 建專案 → 複製 connection string → `DATABASE_URL=postgres://…?sslmode=require`。
- **Supabase**：Project Settings → Database → URI（用 pooler 的那條，port 6543）。
- **VPS 自架**：`docker run -d -e POSTGRES_PASSWORD=… -p 5432:5432 postgres:16`。

之後：

```bash
DATABASE_URL=… pnpm db:migrate
DATABASE_URL=… pnpm db:seed
```

驗收：後台總覽的整合狀態顯示資料庫 `postgres`。

## 2. Discord 登入 — `src/server/auth.ts`、`src/app/api/auth/discord/*`

1. https://discord.com/developers/applications → New Application。
2. OAuth2 → Redirects 加 `https://你的網域/api/auth/discord/callback`（本機是 `http://localhost:3000/api/auth/discord/callback`）。
3. 複製 Client ID 與 Client Secret。
4. 找出你自己的 Discord user ID（使用者設定 → 進階 → 開發者模式 → 右鍵自己 → 複製 ID）。

```env
DISCORD_CLIENT_ID=…
DISCORD_CLIENT_SECRET=…
ADMIN_DISCORD_IDS=你的ID,另一位管理員的ID
APP_URL=http://localhost:3000
AUTH_SECRET=至少32個隨機字元
NEXT_PUBLIC_DISCORD_LOGIN=1
```

`NEXT_PUBLIC_DISCORD_LOGIN=1` 讓前台的「用 Discord 登入」按鈕生效。`ADMIN_DISCORD_IDS` 裡的人第一次登入就是管理員，其他人是學員，之後在後台「學員與角色」改。

流程：`/api/auth/discord` 設一個 state cookie 並導向 Discord → 使用者同意 → Discord 帶 `code` 回 `/callback` → 伺服器用 code 換 token → 抓 `/users/@me` → 建立或更新 `users` → 簽 JWT 放 cookie → 導向 `/dashboard`。

驗收：登入後 `GET /api/me` 有 `authenticated: true`，`users` 表多一列。

## 3. Discord Webhook — `src/server/services/discord.ts`

Discord 頻道設定 → 整合 → Webhook → 新增 → 複製 URL。

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/…
```

會送兩種訊息：新問題（含連結）、First Blood。想加更多，呼叫 `notifyDiscord(content, embeds)`。

## 4. Cloudflare Stream 影片 — `src/server/services/stream.ts`、後台 `uploads.tsx`

1. Cloudflare Dashboard → Stream → 啟用（需要綁付款方式，前 1000 分鐘儲存不收費）。
2. My Profile → API Tokens → Create Token → 模板 "Stream: Edit" → 複製 token。
3. Account ID 在 Dashboard 首頁右側。
4. Stream 頁面右側有 "Customer subdomain"：`customer-XXXX.cloudflarestream.com`，`XXXX` 就是 customer code。

```env
CF_ACCOUNT_ID=…
CF_STREAM_API_TOKEN=…
CF_STREAM_CUSTOMER_CODE=XXXX
```

流程（已實作）：
1. 後台選檔 → `POST /api/admin/uploads/video` → 伺服器向 Cloudflare 要一次性的 `uploadURL`（direct creator upload，最長 2 小時影片）。
2. 瀏覽器把檔案以 multipart 欄位 `file` **直接 POST 到 Cloudflare**，不經過我們的伺服器；有進度條。
3. 後台每次按「重新檢查」打 `GET /api/admin/uploads/video/{uid}`，伺服器查 Cloudflare 的 `readyToStream`。
4. 課程存 `videoProvider = "stream"`、`videoId = uid`。

播放（已實作在 `src/components/learn/video-stage.tsx`）：課程頁用 `playbackUrl(uid)` 算出 iframe 網址，播放器載入 Stream 的 Player SDK 讀 `currentTime / duration`，播到檢查站就暫停出題。原理是：

```html
<script src="https://embed.cloudflarestream.com/embed/sdk.latest.js"></script>
<script>
  const player = Stream(document.getElementById("stream-player"));
  player.addEventListener("timeupdate", () => {
    const pct = player.currentTime / player.duration; // 拿這個值餵給 lesson-player 的 position
  });
</script>
```

YouTube 的話不用任何設定，後台貼影片 ID 即可；同一個播放器用 IFrame API 的 `getCurrentTime() / getDuration()` 做同一件事。

驗收：後台上傳一支短片，狀態走到 `ready`；Cloudflare Stream 頁面看得到那支影片。

## 5. Cloudflare R2 附件 — `src/server/services/r2.ts`

1. R2 → Create bucket，名稱例如 `scist-gate`。
2. R2 → Manage R2 API Tokens → Create → 權限 "Object Read & Write" → 複製 Access Key ID / Secret。
3. bucket → Settings → Public access：綁自訂網域（例如 `files.gate.scist.org`）或啟用 r2.dev 網址。
4. **一定要設 CORS**，不然瀏覽器直傳會被擋。bucket → Settings → CORS policy：

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://gate.scist.org"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

```env
R2_ACCOUNT_ID=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=scist-gate
R2_PUBLIC_URL=https://files.gate.scist.org
```

流程（已實作）：`POST /api/admin/uploads/file` 回一個 15 分鐘有效的預簽名 PUT 網址 → 瀏覽器 PUT 檔案 → 資料庫記 `object_key = challenges/{slug}/{檔名}`。前台下載連結是 `R2_PUBLIC_URL + "/" + object_key`（`getChallengesPublic()` 已經算好放在 `fileUrls`）。

驗收：後台在某題附件區上傳一個檔案，狀態變「已上傳」，用 `R2_PUBLIC_URL/challenges/…` 能下載。

## 6. 靶機 Instancer — `src/server/services/instancer.ts`、`instancer/`

看 [instancer/README.md](../instancer/README.md)，那邊有完整的部署步驟與 systemd 設定。平台這邊只要：

```env
INSTANCER_URL=http://VPS_IP:8080
INSTANCER_SECRET=跟 VPS 上一樣的密鑰
```

沒設定時 `POST /api/challenges/{slug}/instance` 回一個假的 `10.31.4.x` 位址，UI 流程照走。

驗收：題目頁按「啟動環境」拿到真實 IP:port，能連線；後台題目設定裡有填 Docker 映像。

## 7. 部署到 Vercel

1. `git init && git add . && git commit`，推到 GitHub。
2. Vercel → New Project → 選 repo → Root Directory 設 `scist-platform`（如果整個 `SCIST計畫` 資料夾是 repo）。
3. Environment Variables 把上面所有 `.env.local` 的內容貼上；`APP_URL` 改成正式網域；`NODE_ENV` 不用設。
4. Build Command 用預設 `pnpm build`。migration 在第一次請求時自動跑，也可以在 Vercel 的 build command 前面加 `pnpm db:migrate &&`。第一次部署把 `AUTO_SEED=1` 打開，正式資料庫就會灌入示範內容；之後移除。
5. Discord OAuth 的 redirect 記得加正式網域那條。

Vercel 是 serverless：**不能**用 PGlite（每個請求的檔案系統不保證保留），一定要設 `DATABASE_URL`。

## 8. 用 VPS 一台包辦

也可以全部放同一台 VPS：`pnpm build && pnpm start`（port 3000）+ 前面 Caddy 反向代理做 HTTPS + Postgres 容器 + instancer。Cloudflare Stream / R2 / Discord 照樣接。這樣 `DATABASE_URL=postgres://…@localhost:5432/scist`。
