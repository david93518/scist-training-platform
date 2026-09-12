"use client";

import { useState } from "react";
import { UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { SCHOOLS } from "@/data/schools";
import { api } from "@/lib/api";
import { refreshProfile, useProgress, type ServerProfile } from "@/store/progress";

export function ProfileForm() {
  const handle = useProgress((s) => s.handle);
  const displayName = useProgress((s) => s.displayName);
  const schoolId = useProgress((s) => s.schoolId);
  const schoolEditCount = useProgress((s) => s.schoolEditCount);
  const [name, setName] = useState(displayName || handle);
  const [school, setSchool] = useState(schoolId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // store 被 /api/me 回填時要跟著換一份草稿。用 render 期間比對而不是 effect，
  // 才不會多渲染一輪、也不會有一瞬間顯示舊值。
  const fromStore = [displayName, handle, schoolId].join("\u0000");
  const [synced, setSynced] = useState(fromStore);
  if (synced !== fromStore) {
    setSynced(fromStore);
    setName(displayName || handle);
    setSchool(schoolId);
  }

  const schoolLocked = Boolean(schoolId) && schoolEditCount >= 1;
  const canCorrectSchool = Boolean(schoolId) && schoolEditCount < 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setError("暱稱不能空白");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const nextSchool = schoolLocked ? schoolId : school;
      const profile = await api<ServerProfile>("/api/me", {
        method: "PATCH",
        body: { displayName: nextName, schoolId: nextSchool || null },
      });
      useProgress.getState().hydrateFromServer(profile);
      await refreshProfile(true);
      setMessage("個人資料已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法更新個人資料");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-line bg-bg-0 px-3 text-[13px] outline-none focus:border-accent/50";

  return (
    <form onSubmit={submit} className="card p-6">
      <div className="mb-1 flex items-center gap-2">
        <UserRound size={15} className="text-accent" />
        <h2 className="text-[15px] font-bold">個人資料</h2>
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-fg-3">
        帳號用來登入，不能改。暱稱會顯示在儀表板，可以填中文。
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">帳號</span>
          <input value={handle} readOnly className={inputClass + " font-mono text-fg-3"} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">暱稱</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="顯示給自己看的名字"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">學校</span>
          <select
            value={schoolLocked ? schoolId : school}
            disabled={schoolLocked}
            onChange={(e) => setSchool(e.target.value)}
            className={inputClass}
          >
            {!schoolId ? <option value="">先不填</option> : null}
            {SCHOOLS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short} · {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-fg-3">
        {schoolLocked
          ? "學校已不能自行更改，若填錯請找管理員。"
          : canCorrectSchool
            ? "學校之後還能再改一次。"
            : "未選學校會顯示「未填寫」，之後可以補填。"}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          儲存資料
        </Button>
        {message ? <span className="text-[12.5px] text-accent">{message}</span> : null}
        {error ? <span className="text-[12.5px] text-red">{error}</span> : null}
      </div>
    </form>
  );
}
