"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedStudentId = localStorage.getItem("student_id");

    if (!savedStudentId) {
      window.location.href = "/login";
      return;
    }

    setStudentId(savedStudentId);
    setLoaded(true);
  }, []);

  function handleLogout() {
    localStorage.removeItem("student_id");
    window.location.href = "/login";
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        載入中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black">Career AI Lab</h1>
            <p className="mt-1 text-sm text-slate-500">
              目前登入學號：{studentId}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
          >
            登出
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
            <div className="mb-4 text-4xl">🧭</div>
            <h2 className="text-xl font-black">專案一｜職涯探索聊天</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              這裡會放原本 Hugging Face 第一個系統的三關卡聊天：
              自我探索、技能探索、職涯探索。
            </p>

            <button
              onClick={() => alert("下一步會開始做三關卡聊天畫面")}
              className="mt-5 w-full rounded-2xl bg-orange-500 py-3 font-black text-white shadow-sm"
            >
              開始職涯探索
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 text-4xl">🗺️</div>
            <h2 className="text-xl font-black">專案二｜角色報告地圖</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              這裡會放三個推薦職業、能力值、任務進度、職業聊天與進階分析。
            </p>

            <button
              onClick={() => (window.location.href = "/map")}
              className="mt-5 w-full rounded-2xl bg-slate-800 py-3 font-black text-white shadow-sm"
            >
              查看角色報告地圖
            </button>
          </section>
        </div>

        <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">目前遷移進度</h2>

          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-emerald-50 p-4">
              ✅ Next.js / Vercel 專案骨架已建立
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              ✅ Supabase 連線成功
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              ✅ Groq API 連線成功
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              ✅ 登入 / 註冊 API 已建立
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              下一步：搬三關卡聊天畫面與 messages / progress 資料
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}