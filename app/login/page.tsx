"use client";

import { useState } from "react";

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setMessage("");

    if (!studentId.trim() || !password.trim()) {
      setMessage("請輸入學號與密碼。");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
  mode === "login"
    ? "/api/auth/login"
    : mode === "register"
    ? "/api/auth/register"
    : "/api/auth/reset-password";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "操作失敗。");
        return;
      }

      setMessage(data.message || "成功。");

if (mode === "reset") {
  setMode("login");
  setPassword("");
  return;
}

localStorage.setItem("student_id", data.student_id);
window.location.href = "/";

    } catch (err) {
      setMessage("系統發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
              🧬
            </div>

            <h1 className="text-3xl font-black">Career AI Lab</h1>
            <p className="mt-2 text-sm text-slate-500">
              Vercel 版職涯探索系統
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`rounded-xl py-2 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600"
              }`}
            >
              登入
            </button>

            <button
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={`rounded-xl py-2 text-sm font-bold transition ${
                mode === "register"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600"
              }`}
            >
              註冊
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold">學號</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="請輸入 9 碼學號"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
  {mode === "reset" ? "新密碼" : "密碼"}
</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={mode === "reset" ? "請輸入新密碼" : "請輸入密碼"}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
              />
            </div>

            <div className="flex justify-end">
  {mode === "login" ? (
    <button
      type="button"
      onClick={() => {
        setMode("reset");
        setMessage("");
        setPassword("");
      }}
      className="text-sm font-bold text-orange-600 hover:text-orange-700"
    >
      忘記密碼？
    </button>
  ) : mode === "reset" ? (
    <button
      type="button"
      onClick={() => {
        setMode("login");
        setMessage("");
        setPassword("");
      }}
      className="text-sm font-bold text-slate-500 hover:text-slate-700"
    >
      返回登入
    </button>
  ) : null}
</div>

            {message && (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl bg-orange-500 py-3 font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
            >
              {loading
  ? "處理中..."
  : mode === "login"
  ? "登入"
  : mode === "register"
  ? "註冊"
  : "重設密碼"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs leading-6 text-slate-400">
            {mode === "reset"
  ? "重設後請使用新密碼重新登入。"
  : "登入後會進入職涯探索主畫面。"}
          </p>
        </div>
      </div>
    </main>
  );
}