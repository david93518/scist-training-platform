"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { refreshProfile, useProgress } from "@/store/progress";

export function PasswordForm() {
  const hasPassword = useProgress((s) => Boolean(s.hasPassword));
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      setError("新密碼至少 8 個字");
      return;
    }
    if (next !== confirm) {
      setError("兩次輸入的新密碼不一樣");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api("/api/auth/password", { body: { current: current || undefined, next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage(hasPassword ? "密碼已更新" : "已為這個帳號設定密碼，之後可以用帳號密碼登入");
      await refreshProfile(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法更新密碼");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-line bg-bg-0 px-3 font-mono text-[13px] outline-none focus:border-accent/50";

  return (
    <form onSubmit={submit} className="card p-6">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound size={15} className="text-accent" />
        <h2 className="text-[15px] font-bold">{hasPassword ? "變更密碼" : "設定密碼"}</h2>
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-fg-3">
        {hasPassword ? "改完之後，下次請用新密碼登入。" : "這個帳號還沒有密碼（例如從 Discord 進來）。設好之後就能用帳號密碼登入。"}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {hasPassword ? (
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">目前密碼</span>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={inputClass} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">新密碼</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">再輸入一次</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !next}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          {hasPassword ? "更新密碼" : "設定密碼"}
        </Button>
        {message ? <span className="text-[12.5px] text-accent">{message}</span> : null}
        {error ? <span className="text-[12.5px] text-red">{error}</span> : null}
      </div>
    </form>
  );
}
