"""Upload the standalone build to the SCIST VM and start it. Secrets stay in env."""
from __future__ import annotations

import os
import secrets
import shutil
import sys
import tarfile
import tempfile
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("SCIST_SSH_HOST", "192.168.66.42")
USER = os.environ.get("SCIST_SSH_USER", "david")
PASSWORD = os.environ["SCIST_SSH_PASS"]
REMOTE = "/home/david/scist"
NODE_VER = "v22.18.0"
NODE_TARBALL = f"node-{NODE_VER}-linux-x64.tar.xz"


def env_text() -> str:
    return "\n".join(
        [
            "NODE_ENV=production",
            "HOSTNAME=0.0.0.0",
            "PORT=3000",
            f"AUTH_SECRET={secrets.token_urlsafe(36)}",
            f"APP_URL=http://{HOST}:3000",
            "AUTO_SEED=1",
            "BOOTSTRAP_ADMIN_HANDLE=david",
            f"BOOTSTRAP_ADMIN_PASSWORD={PASSWORD}",
            "PGLITE_DIR=.data/pglite",
            "",
        ]
    )


def rmtree_long(path: Path) -> None:
    import subprocess

    if not path.exists():
        return
    empty = Path(r"D:\s\_empty")
    empty.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["robocopy", str(empty), str(path), "/MIR", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np", "/R:0", "/W:0"],
        check=False,
    )
    shutil.rmtree(path, ignore_errors=True)


def robocopy(src: Path, dst: Path) -> None:
    import subprocess

    dst.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["robocopy", str(src), str(dst), "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np", "/R:1", "/W:1"],
        check=False,
    )
    if not dst.exists() or not any(dst.iterdir()):
        raise RuntimeError("robocopy failed: " + str(src) + " -> " + str(dst))


def make_tar(tar_path: Path, env_file: Path) -> None:
    stage = Path(r"D:\s\scist")
    rmtree_long(stage)
    print("robocopy standalone")
    robocopy(ROOT / ".next" / "standalone", stage)
    robocopy(ROOT / ".next" / "static", stage / ".next" / "static")
    robocopy(ROOT / "drizzle", stage / "drizzle")
    public = ROOT / "public"
    if public.exists() and any(public.iterdir()):
        robocopy(public, stage / "public")
    pglite = ROOT / "node_modules" / "@electric-sql" / "pglite"
    if pglite.exists():
        robocopy(pglite.resolve(), stage / "node_modules" / "@electric-sql" / "pglite")
    pg = ROOT / "node_modules" / "postgres"
    if pg.exists():
        robocopy(pg.resolve(), stage / "node_modules" / "postgres")
    # Next standalone 不會把這個 peer 收進去，正式機 server.js 一啟動就會炸
    swc = ROOT / "node_modules" / ".pnpm" / "@swc+helpers@0.5.23" / "node_modules" / "@swc" / "helpers"
    if swc.exists():
        robocopy(swc.resolve(), stage / "node_modules" / "@swc" / "helpers")
    copy_next_peers(stage)
    copy_hook_peers(stage)
    copy_integration_peers(stage)
    shutil.copy2(env_file, stage / ".env")
    if tar_path.exists():
        tar_path.unlink()
    print("write tar from", stage)
    with tarfile.open(tar_path, "w:gz") as tar:
        add_tree(tar, stage, "scist")


def copy_next_peers(stage: Path) -> None:
    """standalone 常漏 @next/env、styled-jsx，從最短的 next@16 目錄補上。"""
    cands = sorted(
        (ROOT / "node_modules" / ".pnpm").glob("next@16*/node_modules"),
        key=lambda p: len(str(p)),
    )
    if not cands:
        return
    src = cands[0]
    print("next peers from", src.parent.name)
    for name in ("@next", "styled-jsx"):
        item = src / name
        if item.exists():
            dest = stage / "node_modules" / name
            robocopy(item.resolve(), dest)


def copy_hook_peers(stage: Path) -> None:
    """Sentry / OTel 會要求這些套件，沒設 DSN 時 Next 還是可能去 load external。"""
    pnpm = ROOT / "node_modules" / ".pnpm"
    specs = (
        "debug@4.4.3",
        "require-in-the-middle@8.0.1",
        "import-in-the-middle@3.5.0",
    )
    dest_nm = stage / "node_modules"
    for spec in specs:
        src = pnpm / spec / "node_modules"
        if not src.exists():
            continue
        print("hook peers from", spec)
        for child in src.iterdir():
            if child.name.startswith("."):
                continue
            robocopy(child.resolve(), dest_nm / child.name)


def copy_integration_peers(stage: Path) -> None:
    """R2 上傳與 Sentry 需要這些套件；Windows 打包時 Next 有時追不齊，從 pnpm 補上。"""
    pnpm = ROOT / "node_modules" / ".pnpm"
    dest_nm = stage / "node_modules"
    globs = (
        "@aws-sdk+client-s3@*",
        "@aws-sdk+s3-request-presigner@*",
        "@sentry+nextjs@*",
    )
    for pattern in globs:
        matches = sorted(pnpm.glob(pattern), key=lambda p: len(str(p)))
        if not matches:
            continue
        src = matches[0] / "node_modules"
        if not src.exists():
            continue
        print("integration peers from", matches[0].name)
        for child in src.iterdir():
            if child.name.startswith("."):
                continue
            robocopy(child.resolve(), dest_nm / child.name)


def add_tree(tar: tarfile.TarFile, src: Path, arcname: str) -> None:
    src = src.resolve()
    for dirpath, _dirnames, filenames in os.walk(src):
        for name in filenames:
            full = Path(dirpath) / name
            rel = full.relative_to(src).as_posix()
            long = "\\\\?\\" + str(full)
            tar.add(long, arcname=arcname + "/" + rel, recursive=False)


def connect() -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120, sudo: bool = False) -> str:
    if sudo:
        cmd = "sudo -S -p '' " + cmd
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout, get_pty=True)
    if sudo:
        stdin.write(PASSWORD + "\n")
        stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + ("\n" + err if err.strip() else "")).strip()
    if code != 0:
        raise RuntimeError(f"exit {code}: {cmd}\n{text}")
    return text


def upload(c: paramiko.SSHClient, local: Path, remote: str) -> None:
    sftp = c.open_sftp()
    sftp.put(str(local), remote)
    sftp.close()


def main() -> None:
    work = Path(tempfile.mkdtemp(prefix="scist-bundle-"))
    tar_path = work / "scist.tgz"
    env_file = work / ".env"
    env_file.write_text(env_text(), encoding="utf-8")
    print("tar")
    make_tar(tar_path, env_file)
    print("tar size", tar_path.stat().st_size)
    c = connect()
    print("connected")
    run(c, "mkdir -p /tmp /home/david/.local")
    print("upload tarball")
    upload(c, tar_path, "/tmp/scist.tgz")
    # 先停服務再換檔，並把遠端的 .env / 資料庫搬開，免得每次更新把帳號跟 AUTH_SECRET 洗掉
    run(c, "sudo -n systemctl stop scist 2>/dev/null || systemctl --user stop scist 2>/dev/null || true", timeout=60)
    run(
        c,
        "mkdir -p /tmp/scist-keep && "
        "if [ -f /home/david/scist/.env ]; then cp /home/david/scist/.env /tmp/scist-keep/.env; fi && "
        "if [ -d /home/david/scist/.data ]; then cp -a /home/david/scist/.data /tmp/scist-keep/.data; fi && "
        "rm -rf /home/david/scist && tar -xzf /tmp/scist.tgz -C /home/david && "
        "if [ -f /tmp/scist-keep/.env ]; then cp /tmp/scist-keep/.env /home/david/scist/.env; fi && "
        "if [ -d /tmp/scist-keep/.data ]; then rm -rf /home/david/scist/.data && cp -a /tmp/scist-keep/.data /home/david/scist/.data; fi && "
        "chmod 600 /home/david/scist/.env && rm -rf /tmp/scist.tgz /tmp/scist-keep",
        timeout=180,
    )
    node_bin = "/home/david/.local/node/bin/node"
    try:
        ver = run(c, f"test -x {node_bin} && {node_bin} -v")
        print("node", ver)
    except RuntimeError:
        print("download node")
        url = f"https://nodejs.org/dist/{NODE_VER}/{NODE_TARBALL}"
        run(
            c,
            "python3 -c \"import urllib.request; urllib.request.urlretrieve('"
            + url
            + "', '/tmp/"
            + NODE_TARBALL
            + "')\" && tar -xJf /tmp/"
            + NODE_TARBALL
            + " -C /home/david/.local && rm -rf /home/david/.local/node && mv /home/david/.local/node-"
            + NODE_VER
            + "-linux-x64 /home/david/.local/node && rm /tmp/"
            + NODE_TARBALL,
            timeout=180,
        )
        print(run(c, f"{node_bin} -v"))

    unit = f"""[Unit]
Description=SCIST Gate
After=network.target

[Service]
Type=simple
WorkingDirectory={REMOTE}
EnvironmentFile={REMOTE}/.env
ExecStart={node_bin} server.js
Restart=on-failure
RestartSec=4

[Install]
WantedBy=default.target
"""
    sftp = c.open_sftp()
    with sftp.file("/tmp/scist.service", "w") as f:
        f.write(unit)
    sftp.close()
    # 這台 polkit 過不了系統層 systemd，實際跑的是 user unit
    run(c, "mkdir -p /home/david/.config/systemd/user")
    run(c, "cp /tmp/scist.service /home/david/.config/systemd/user/scist.service && rm /tmp/scist.service")
    run(c, "systemctl --user daemon-reload && systemctl --user enable --now scist", timeout=60)
    print("waiting for listen")
    ok = False
    last = ""
    for _ in range(24):
        time.sleep(5)
        last = run(c, "systemctl --user is-active scist || true; ss -lntp | grep 3000 || true")
        print(last)
        if ":3000" in last and "active" in last:
            ok = True
            break
    if not ok:
        journal = run(c, "journalctl --user -u scist -n 80 --no-pager")
        print(journal)
        raise SystemExit("service did not come up")
    print(run(c, "curl -sI --max-time 20 http://127.0.0.1:3000/ | head -20"))
    print("DONE http://%s:3000" % HOST)
    c.close()
    shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR", e, file=sys.stderr)
        sys.exit(1)
