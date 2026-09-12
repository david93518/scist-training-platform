"""Rotate admin password and publish the VM via Cloudflare quick tunnel + nginx."""
from __future__ import annotations

import json
import os
import re
import secrets
import string
import time
import urllib.error
import urllib.request

import paramiko

HOST = os.environ.get("SCIST_SSH_HOST", "192.168.66.42")
USER = os.environ.get("SCIST_SSH_USER", "david")
OLD = os.environ["SCIST_SSH_PASS"]
ALPH = string.ascii_letters + string.digits
NEW = "S" + "".join(secrets.choice(ALPH) for _ in range(15))
BASE = f"http://{HOST}:3000"


def ssh() -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, OLD, timeout=20, allow_agent=False, look_for_keys=False)
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120) -> tuple[int, str]:
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, (out + ("\n" + err if err.strip() else "")).strip()


def sudo(c: paramiko.SSHClient, cmd: str, timeout: int = 180) -> tuple[int, str]:
    wrapped = "echo " + json.dumps(OLD) + " | sudo -S -p '' bash -lc " + json.dumps(cmd)
    return run(c, wrapped, timeout=timeout)


def change_password() -> None:
    req = urllib.request.Request(
        BASE + "/api/auth/login",
        data=json.dumps({"handle": "david", "password": OLD}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        cookie = r.headers.get("set-cookie", "")
    m = re.search(r"scist_session=([^;]+)", cookie)
    if not m:
        raise RuntimeError("login did not set session cookie")
    req = urllib.request.Request(
        BASE + "/api/auth/password",
        data=json.dumps({"current": OLD, "next": NEW}).encode(),
        headers={"Content-Type": "application/json", "Cookie": "scist_session=" + m.group(1)},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        if r.status != 200:
            raise RuntimeError("password change failed " + str(r.status))
    req = urllib.request.Request(
        BASE + "/api/auth/login",
        data=json.dumps({"handle": "david", "password": NEW}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        if r.status != 200:
            raise RuntimeError("new password login failed")


def main() -> None:
    print("changing website password")
    change_password()
    c = ssh()
    # keep .env bootstrap in sync; do not print the file
    code, out = run(
        c,
        "python3 - <<'PY'\n"
        "from pathlib import Path\n"
        "p=Path('/home/david/scist/.env')\n"
        "t=p.read_text()\n"
        "lines=[]\n"
        "for line in t.splitlines():\n"
        "    if line.startswith('BOOTSTRAP_ADMIN_PASSWORD='):\n"
        "        lines.append('BOOTSTRAP_ADMIN_PASSWORD=' + " + json.dumps(NEW) + ")\n"
        "    else:\n"
        "        lines.append(line)\n"
        "p.write_text('\\n'.join(lines)+'\\n')\n"
        "print('env-updated')\n"
        "PY",
    )
    print("env", code, out)
    print("install nginx + cloudflared")
    sudo(c, "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx")
    nginx = """
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 32m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
"""
    sftp = c.open_sftp()
    with sftp.file("/tmp/scist-nginx.conf", "w") as f:
        f.write(nginx)
    sftp.close()
    sudo(
        c,
        "rm -f /etc/nginx/sites-enabled/default; "
        "install -m 644 /tmp/scist-nginx.conf /etc/nginx/sites-available/scist; "
        "ln -sfn /etc/nginx/sites-available/scist /etc/nginx/sites-enabled/scist; "
        "nginx -t && systemctl enable --now nginx && systemctl reload nginx; "
        "ufw allow 80/tcp || true; ufw allow 443/tcp || true; ufw allow 3000/tcp || true",
    )
    run(c, "mkdir -p /home/david/.local/bin")
    code, _ = run(c, "test -x /home/david/.local/bin/cloudflared && echo HAS || echo NO")
    if "HAS" not in _:
        print("download cloudflared")
        code, out = run(
            c,
            "python3 -c \"import urllib.request; urllib.request.urlretrieve('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64','/home/david/.local/bin/cloudflared')\" && chmod +x /home/david/.local/bin/cloudflared && /home/david/.local/bin/cloudflared --version",
            timeout=180,
        )
        print(out)
    unit = """[Unit]
Description=SCIST Cloudflare tunnel
After=network.target

[Service]
ExecStart=/home/david/.local/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
"""
    sftp = c.open_sftp()
    c.exec_command("mkdir -p /home/david/.config/systemd/user")
    time.sleep(0.2)
    with sftp.file("/home/david/.config/systemd/user/scist-tunnel.service", "w") as f:
        f.write(unit)
    sftp.close()
    run(c, "systemctl --user daemon-reload && systemctl --user enable --now scist-tunnel")
    url = ""
    for _i in range(24):
        time.sleep(3)
        _code, log = run(c, "journalctl --user -u scist-tunnel -n 40 --no-pager")
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", log)
        if m:
            url = m.group(0)
            break
    if url:
        run(
            c,
            "python3 - <<'PY'\n"
            "from pathlib import Path\n"
            "p=Path('/home/david/scist/.env')\n"
            "t=p.read_text().splitlines()\n"
            "out=[]\n"
            "for line in t:\n"
            "    if line.startswith('APP_URL='):\n"
            "        out.append('APP_URL=" + url + "')\n"
            "    else:\n"
            "        out.append(line)\n"
            "p.write_text('\\n'.join(out)+'\\n')\n"
            "print('app-url')\n"
            "PY",
        )
        run(c, "systemctl --user restart scist")
        time.sleep(4)
    _code, egress = run(c, "python3 -c \"import urllib.request; print(urllib.request.urlopen('https://ifconfig.me/ip', timeout=10).read().decode())\"")
    print("TUNNEL", url)
    print("EGRESS", egress)
    print("LAN80", f"http://{HOST}/")
    print("PASS", NEW)
    # verify new login
    req = urllib.request.Request(
        BASE + "/api/auth/login",
        data=json.dumps({"handle": "david", "password": NEW}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        print("LOGIN_OK", r.status)
    if url:
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                print("PUBLIC", r.status, len(r.read()))
        except Exception as e:
            print("PUBLIC_ERR", type(e).__name__, e)
    c.close()


if __name__ == "__main__":
    main()
