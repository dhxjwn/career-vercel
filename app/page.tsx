"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const savedStudentId = localStorage.getItem("student_id");

    if (!savedStudentId) {
      window.location.href = "/login";
      return;
    }

    setStudentId(savedStudentId);
  }, []);

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
    window.location.href = "/chat";
  } catch {
    alert("系統發生錯誤，無法重新調配。");
  }
}

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black">Career AI Lab</h1>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                透過 AI 職涯探索聊天、整體分析與角色報告地圖，協助學生整理興趣、能力與未來職涯方向。
              </p>
              <p className="mt-2 text-sm text-slate-500">
                目前登入學號：{studentId || "讀取中..."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
  <button
    onClick={handleResetUser}
    className="rounded-2xl border border-orange-200 bg-white px-5 py-3 font-black text-orange-600 transition hover:bg-orange-50"
  >
    🔁 重新調配
  </button>

  <button
    onClick={handleLogout}
    className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"
  >
    登出
  </button>
</div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-200 bg-orange-50 p-7 shadow-sm">
            <div className="text-4xl">🧭</div>

            <h2 className="mt-5 text-2xl font-black">
              職涯探索聊天
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              透過自我探索、技能探索與職涯探索三個關卡，逐步整理自己的興趣、能力與未來想嘗試的方向。
            </p>

            <button
              onClick={() => (window.location.href = "/chat")}
              className="mt-7 w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-white transition hover:bg-orange-600"
            >
              開始職涯探索
            </button>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="text-4xl">🗺️</div>

            <h2 className="mt-5 text-2xl font-black">
              角色報告地圖
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              查看 AI 根據探索結果產生的三個推薦職業、能力值、任務清單與短中長期職涯規劃。
            </p>

            <button
              onClick={() => (window.location.href = "/map")}
              className="mt-7 w-full rounded-2xl bg-slate-900 px-5 py-4 font-black text-white transition hover:bg-slate-800"
            >
              查看角色報告地圖
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">使用流程</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-sm font-black text-orange-600">STEP 1</div>
              <h3 className="mt-2 font-black">完成職涯探索</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                回答三個關卡的問題，建立個人職涯探索資料。
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-sm font-black text-orange-600">STEP 2</div>
              <h3 className="mt-2 font-black">產生整體分析</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                由 AI 彙整你的興趣、能力與職涯傾向。
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-sm font-black text-orange-600">STEP 3</div>
              <h3 className="mt-2 font-black">查看角色地圖</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                依照推薦職業查看能力值、任務清單與下一步行動。
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}