# Instancer

每位學員、每一題一個獨立的 Docker 容器。這是一個 200 行的 Node 服務，跑在企劃書裡那台 Cloud VPS 上，旁邊就是 Docker。平台用共享密鑰呼叫它，學員不會直接碰到它。

## 合約

所有請求都帶 `Authorization: Bearer {INSTANCER_SECRET}`。

| 方法 | 路徑 | 請求 | 回應 |
| --- | --- | --- | --- |
| `POST` | `/instances` | `{ image, port, ttlMinutes, labels: { userId, challengeId } }` | `201 { id, host, port, expiresAt }` |
| `GET` | `/instances/:id` | | `{ id, status, host, port, expiresAt }` |
| `DELETE` | `/instances/:id` | | `204` |
| `GET` | `/healthz` | 不需驗證 | `{ ok, mode, running }` |

平台端對應的程式在 `src/server/services/instancer.ts`，沒設定 `INSTANCER_URL` 時會回傳模擬的實例。

## 本機試跑（不需要 Docker）

```bash
cd instancer
npm install
npm run mock
```

```bash
curl -s -X POST http://localhost:8080/instances \
  -H "Authorization: Bearer dev-secret" -H "content-type: application/json" \
  -d '{"image":"ghcr.io/scist/sqli-login:latest","port":80,"ttlMinutes":30,"labels":{"userId":"u1","challengeId":"c1"}}'
```

## 部署到 VPS

1. 裝 Docker 與 Node 20。
2. 把 `instancer/` 複製到 VPS，`npm install --omit=dev`。
3. 用 systemd 跑：

```ini
[Unit]
Description=SCIST Gate instancer
After=docker.service

[Service]
Environment=INSTANCER_SECRET=換成長隨機字串
Environment=PUBLIC_HOST=靶機對外的 IP 或網域
Environment=PORT_RANGE=30000-32000
Environment=MAX_INSTANCES=100
WorkingDirectory=/opt/instancer
ExecStart=/usr/bin/node server.mjs
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

4. 防火牆開 `30000-32000/tcp` 給學員，`8080/tcp` 只開給平台伺服器的 IP（或用 Cloudflare Tunnel 包起來）。
5. 平台這邊設 `INSTANCER_URL=http://VPS_IP:8080`、`INSTANCER_SECRET` 相同的值。

## 安全預設

- 容器 `CapDrop: ALL`、`no-new-privileges`、256 MB 記憶體、半顆 CPU、PID 上限 256。
- 每個容器帶 `scist.expiresAt` 標籤，reaper 每分鐘清掉過期或前一次程序留下來的容器。
- 題目映像自己要做到「不能從容器逃出去」，這是出題者的責任；建議每題一個獨立映像，不要共用資料庫。

## 題目映像怎麼做

一個題目就是一個 Dockerfile，開一個 port。範例（Flask 的 SQL Injection 題）：

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir flask
ENV FLAG=SCIST{sql_1nj3ct10n_byp4ss3d}
EXPOSE 80
CMD ["python", "app.py"]
```

推到 GHCR 或任何 registry，在後台題目的「Docker 映像」填映像名稱、「容器 Port」填 80。
