"use client";

import { useState } from "react";

type FloatingUserMenuProps = {
  studentId: string | null;
  afterResetHref?: string;
};

export default function FloatingUserMenu({
  studentId,
  afterResetHref = "/chat",
}: FloatingUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  function handleLogout() {
    localStorage.removeItem("student_id");
    window.location.href = "/login";
  }

  async function handleResetUser() {
    if (!studentId) {
      alert("找不到登入學號，請重新登入。");
      return;
    }

    const confirmed = window.confirm(
      "重新調配會清除所有三關卡對話、整體分析、推薦職業、能力值、任務清單與職涯顧問聊天紀錄，且無法復原。\n\n確定要重新開始嗎？"
    );

    if (!confirmed) return;

    setResetting(true);

    try {
      const res = await fetch("/api/reset-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.message || "重新調配失敗。");
        return;
      }

      alert("重新調配完成，接下來會回到職涯探索聊天重新開始。");
      window.location.href = afterResetHref;
    } catch {
      alert("系統發生錯誤，無法重新調配。");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="fixed right-5 top-5 z-50">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-md ring-1 ring-slate-200 transition hover:bg-orange-50"
        title="帳號選單"
      >
        👤
      </button>

      {open && (
        <div className="mt-3 w-48 rounded-3xl border border-orange-100 bg-white p-4 shadow-xl">
          <div className="text-sm text-slate-500">帳號</div>
          <div className="mt-1 break-all text-lg font-black text-slate-900">
            {studentId || "讀取中..."}
          </div>

          <button
            onClick={handleResetUser}
            disabled={resetting}
            className="mt-4 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-black text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
          >
            🔁 {resetting ? "重設中..." : "重新調配"}
          </button>

          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}