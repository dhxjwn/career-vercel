"use client";
import FloatingUserMenu from "../components/FloatingUserMenu";
import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Progress = {
  topic1_count: number;
  topic2_count: number;
  topic3_count: number;
  unlocked_topic: number;
  topic1_percent: number;
  topic2_percent: number;
  topic3_percent: number;
};

const TOPICS = [
  { id: 1, title: "自我探索", desc: "興趣、投入感、喜歡做的事" },
  { id: 2, title: "技能探索", desc: "課程、專題、能力與經驗" },
  { id: 3, title: "職涯探索", desc: "想嘗試的產業、角色與工作型態" },
];

const EMPTY_PROGRESS: Progress = {
  topic1_count: 0,
  topic2_count: 0,
  topic3_count: 0,
  unlocked_topic: 1,
  topic1_percent: 0,
  topic2_percent: 0,
  topic3_percent: 0,
};

function getTopicPercent(progress: Progress, topic: number) {
  if (topic === 1) return progress.topic1_percent;
  if (topic === 2) return progress.topic2_percent;
  if (topic === 3) return progress.topic3_percent;
  return 0;
}

export default function ChatPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState(1);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("載入中...");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisText, setAnalysisText] = useState("");
  const [analysisJobs, setAnalysisJobs] = useState<string[]>([]);

  const currentTopicInfo = useMemo(() => {
    return TOPICS.find((item) => item.id === currentTopic) || TOPICS[0];
  }, [currentTopic]);

  useEffect(() => {
    const savedStudentId = localStorage.getItem("student_id");

    if (!savedStudentId) {
      window.location.href = "/login";
      return;
    }

    setStudentId(savedStudentId);
  }, []);

  useEffect(() => {
  if (!studentId) return;

  const currentStudentId = studentId;
  const currentTopicValue = currentTopic;

  async function loadChat() {
      setLoading(true);
      setMessage("");

      try {
        const query = new URLSearchParams({
  student_id: currentStudentId,
  topic: String(currentTopicValue),
});

        const res = await fetch(`/api/project-chat?${query.toString()}`);
        const data = await res.json();

        if (!data.ok) {
          setHistory([]);
          setMessage(data.message || "讀取聊天失敗。");
          return;
        }

        setHistory(data.history || []);
        setProgress(data.progress || EMPTY_PROGRESS);
        setCurrentTopic(Number(data.topic || currentTopicValue));
      } catch {
        setHistory([]);
        setMessage("系統發生錯誤，無法讀取聊天。");
      } finally {
        setLoading(false);
      }
    }

    loadChat();
  }, [studentId, currentTopic]);

  async function handleSend() {
    if (!studentId) {
      setMessage("請先登入。");
      return;
    }

    const currentStudentId = studentId;
    const currentTopicValue = currentTopic;

    const text = input.trim();

    if (!text) return;

    const optimisticHistory: ChatMessage[] = [
      ...history,
      { role: "user", content: text },
    ];

    setHistory(optimisticHistory);
    setInput("");
    setSending(true);
    setMessage("");

    try {
      const res = await fetch("/api/project-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  student_id: currentStudentId,
  topic: currentTopicValue,
  message: text,
}),
      });

      const data = await res.json();

      if (!data.ok) {
        setHistory([
          ...optimisticHistory,
          {
            role: "assistant",
            content: data.message || "AI 暫時無法回覆，請稍後再試。",
          },
        ]);
        return;
      }

      setHistory(data.history || []);
      setProgress(data.progress || EMPTY_PROGRESS);
      setCurrentTopic(Number(data.topic || currentTopicValue));
    } catch {
      setHistory([
        ...optimisticHistory,
        {
          role: "assistant",
          content: "系統發生錯誤，無法送出訊息。",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleTopicClick(topic: number) {
    if (topic > progress.unlocked_topic) {
      setMessage("這個關卡尚未解鎖，請先完成前一關。");
      return;
    }

    setCurrentTopic(topic);
    setInput("");
    setMessage("");
  }

  async function handleGenerateAnalysis() {
  if (!studentId) {
    setAnalysisMessage("請先登入。");
    return;
  }

  setAnalyzing(true);
  setAnalysisMessage("正在產生整體職涯分析與三個推薦職業，請稍候...");

  try {
    const res = await fetch("/api/project-analysis", {
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
      setAnalysisMessage(data.message || "產生整體分析失敗。");
      return;
    }

    setAnalysisMessage(
  `✅ ${data.message} 推薦職業：${(data.jobs || []).join("、")}`
);

setAnalysisText(data.analysis_text || "");
setAnalysisJobs(data.jobs || []);
  } catch {
    setAnalysisMessage("系統發生錯誤，無法產生整體分析。");
  } finally {
    setAnalyzing(false);
  }
}

  const allDone =
    progress.topic1_percent >= 100 &&
    progress.topic2_percent >= 100 &&
    progress.topic3_percent >= 100;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <FloatingUserMenu studentId={studentId} afterResetHref="/chat" />
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">專案一｜職涯探索聊天</h1>
              <p className="mt-2 text-sm text-slate-500">
                目前登入學號：{studentId || "讀取中..."}
              </p>
            </div>

            <button
              onClick={() => (window.location.href = "/")}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"
            >
              回首頁
            </button>
          </div>
        </section>

        <section className="sticky top-4 z-40 grid gap-4 rounded-3xl bg-slate-100/95 p-2 shadow-sm backdrop-blur md:grid-cols-3">
          {TOPICS.map((topic) => {
            const percent = getTopicPercent(progress, topic.id);
            const locked = topic.id > progress.unlocked_topic;
            const active = topic.id === currentTopic;

            return (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic.id)}
                className={`rounded-3xl p-5 text-left shadow-sm transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : locked
                    ? "bg-slate-200 text-slate-400"
                    : "bg-white text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-black">
                    {locked ? "🔒 " : percent >= 100 ? "✅ " : ""}
                    {topic.title}
                  </div>
                  <div className="rounded-full bg-black/10 px-3 py-1 text-xs font-black">
                    {percent}%
                  </div>
                </div>

                <p
                  className={`mt-3 text-sm leading-6 ${
                    active ? "text-white/90" : "text-slate-500"
                  }`}
                >
                  {topic.desc}
                </p>
              </button>
            );
          })}
        </section>

        {message && (
          <section className="rounded-2xl bg-yellow-50 px-5 py-4 text-sm font-bold text-yellow-800">
            {message}
          </section>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-black">
              💬 {currentTopicInfo.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              請依照 AI 的問題回答，完成後會逐步解鎖下一個關卡。
            </p>
          </div>

          <div className="max-h-[560px] space-y-4 overflow-y-auto rounded-3xl bg-slate-50 p-5">
            {loading ? (
              <div className="text-sm text-slate-500">聊天紀錄載入中...</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-slate-500">
                目前尚無聊天紀錄，系統會自動開始第一題。
              </div>
            ) : (
              history.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-7 shadow-sm ${
                      msg.role === "user"
                        ? "bg-orange-500 text-white"
                        : "bg-white text-slate-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="輸入你的回答，例如 A、B、C，或直接描述你的想法..."
              className="min-h-24 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />

            <button
              onClick={handleSend}
              disabled={sending || loading}
              className="w-28 rounded-2xl bg-orange-500 font-black text-white disabled:opacity-50"
            >
              {sending ? "送出中" : "送出"}
            </button>
          </div>
        </section>

        {allDone && (
  <section className="rounded-3xl bg-white p-6 shadow-sm">
    <h2 className="text-xl font-black">🎉 三個關卡已完成</h2>

    <p className="mt-3 text-sm leading-7 text-slate-600">
      你已完成自我探索、技能探索、職涯探索。現在可以產生整體職涯分析，系統會重新整理三個推薦職業、能力值、任務清單，並更新角色報告地圖。
    </p>

    {analysisMessage && (
      <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-7 text-slate-700">
        {analysisMessage}
      </div>
    )}

    {analysisJobs.length > 0 && (
  <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm leading-7 text-orange-800">
    <div className="font-black">推薦三個職業</div>
    <ol className="mt-2 list-inside list-decimal">
      {analysisJobs.map((job) => (
        <li key={job}>{job}</li>
      ))}
    </ol>
  </div>
)}

{analysisText && (
  <div className="mt-4 rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
    <div className="mb-3 text-base font-black text-slate-900">
      AI 整體職涯分析
    </div>

    <div className="whitespace-pre-wrap">{analysisText}</div>
  </div>
)}

    <div className="mt-5 flex flex-wrap gap-3">
      <button
        onClick={handleGenerateAnalysis}
        disabled={analyzing}
        className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50"
      >
        {analyzing ? "分析中..." : "產生整體分析與角色報告"}
      </button>

      <button
        onClick={() => (window.location.href = "/map")}
        className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"
      >
        前往角色報告地圖
      </button>
    </div>
  </section>
)}
      </div>
    </main>
  );
}