"use client";

import { useEffect, useMemo, useState } from "react";

type JobPlan = {
  job_name: string;
  short_term: string;
  mid_term: string;
  long_term: string;
  course_resources: string[];
  workshop_resources: string[];
  cert_resources: string[];
  career_center_resources: string[];
};

type Skill = {
  skill_name: string;
  skill_type: string;
  score: number;
  max_score: number;
  ai_reason: string;
  suggestion: string;
};

type Task = {
  task_title: string;
  task_stage: string;
  task_type: string;
  task_score: number;
  is_completed: boolean;
};

type JobDetail = {
  skills: Skill[];
  tasks: Task[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function ResourceList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="font-black">{title}</div>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-slate-700">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function getReadinessStage(avgScore: number) {
  if (avgScore < 3) {
    return {
      stage: "探索期",
      desc: "目前仍在建立基礎認識，建議先從入門任務、基礎課程與小練習開始。",
    };
  }

  if (avgScore < 5) {
    return {
      stage: "入門準備期",
      desc: "已具備初步方向，建議持續完成短期任務，累積可展示的基礎成果。",
    };
  }

  if (avgScore < 7) {
    return {
      stage: "能力累積期",
      desc: "已有一定準備度，建議開始做作品、專題或實習準備，讓能力具體化。",
    };
  }

  if (avgScore < 8.5) {
    return {
      stage: "準備投遞期",
      desc: "已接近可求職狀態，建議整理履歷、作品集，並嘗試投遞實習或初階職缺。",
    };
  }

  return {
    stage: "高競爭挑戰期",
    desc: "準備度高，可以挑戰競爭較高的職缺，同時補強面試表達與作品深度。",
  };
}

function ReadinessCard({ skills }: { skills: Skill[] }) {
  if (!skills || skills.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">🎯 總準備度</h2>
        <p className="mt-3 text-sm text-slate-600">
          目前尚無能力值資料，無法計算總準備度。
        </p>
      </section>
    );
  }

  const avgScore =
    skills.reduce((sum, item) => sum + Number(item.score || 0), 0) /
    skills.length;

  const stage = getReadinessStage(avgScore);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">🎯 總準備度</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-orange-50 p-4">
          <div className="text-sm font-bold text-slate-500">目前分數</div>
          <div className="mt-2 text-3xl font-black">
            {avgScore.toFixed(1)} / 10
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-500">目前階段</div>
          <div className="mt-2 text-xl font-black">{stage.stage}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 md:col-span-1">
          <div className="text-sm font-bold text-slate-500">階段建議</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{stage.desc}</p>
        </div>
      </div>
    </section>
  );
}

function SkillBar({ skill }: { skill: Skill }) {
  const score = Number(skill.score || 0);
  const maxScore = Number(skill.max_score || 10);
  const percent =
    maxScore <= 0 ? 0 : Math.max(0, Math.min((score / maxScore) * 100, 100));

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-black">{skill.skill_name}</div>
        <div className="text-sm font-bold text-slate-500">
          {score.toFixed(1)} / {maxScore.toFixed(0)}
        </div>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-orange-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        <span className="font-bold">判斷依據：</span>
        {skill.ai_reason || "尚無資料"}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        <span className="font-bold">建議提升：</span>
        {skill.suggestion || "尚無資料"}
      </p>
    </div>
  );
}

function SkillsSection({ skills }: { skills: Skill[] }) {
  if (!skills || skills.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">角色碎片｜能力值</h2>
        <p className="mt-3 text-sm text-slate-600">目前尚無能力值資料。</p>
      </section>
    );
  }

  const functional = skills.filter((item) => item.skill_type === "職能");
  const traits = skills.filter((item) => item.skill_type === "特質");

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">🛠️ 角色碎片｜能力值</h2>

      {functional.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 font-black">職能</h3>
          <div className="grid gap-4">
            {functional.map((skill) => (
              <SkillBar key={`${skill.skill_type}-${skill.skill_name}`} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {traits.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 font-black">特質</h3>
          <div className="grid gap-4">
            {traits.map((skill) => (
              <SkillBar key={`${skill.skill_type}-${skill.skill_name}`} skill={skill} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function stageLabel(stage: string) {
  const value = String(stage || "").toLowerCase();

  if (value === "short") return "短期任務";
  if (value === "mid") return "中期任務";
  if (value === "long") return "長期任務";

  return "其他任務";
}

function stageOrder(stage: string) {
  const value = String(stage || "").toLowerCase();

  if (value === "short") return 1;
  if (value === "mid") return 2;
  if (value === "long") return 3;

  return 9;
}

function TasksSection({
  tasks,
  onComplete,
  completingTaskTitle,
}: {
  tasks: Task[];
  onComplete: (task: Task) => void;
  completingTaskTitle: string | null;
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">✅ 任務清單</h2>
        <p className="mt-3 text-sm text-slate-600">目前尚無任務資料。</p>
      </section>
    );
  }

  const stages = Array.from(new Set(tasks.map((item) => item.task_stage))).sort(
    (a, b) => stageOrder(a) - stageOrder(b)
  );

  const doneCount = tasks.filter((item) => item.is_completed).length;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">✅ 任務清單</h2>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
          已完成 {doneCount} / {tasks.length}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {stages.map((stage) => {
          const stageTasks = tasks.filter((item) => item.task_stage === stage);

          return (
            <div key={stage} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black">{stageLabel(stage)}</h3>

              <div className="mt-3 grid gap-3">
                {stageTasks.map((task) => (
                  <div
                    key={`${task.task_stage}-${task.task_title}`}
                    className="rounded-2xl bg-white p-4 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold leading-6">
                        {task.is_completed ? "✅" : "⬜"} {task.task_title}
                      </div>

                      <div className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                        +{Number(task.task_score || 0).toFixed(1)}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      類型：{task.task_type || "練習"}
                    </div>

                    <div className="mt-3">
                      {task.is_completed ? (
                        <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          已完成
                        </div>
                      ) : (
                        <button
                          onClick={() => onComplete(task)}
                          disabled={completingTaskTitle === task.task_title}
                          className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          {completingTaskTitle === task.task_title
                            ? "更新中..."
                            : "完成任務"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function JobChatSection({
  jobName,
  chatHistory,
  chatInput,
  setChatInput,
  chatLoading,
  onSend,
}: {
  jobName: string;
  chatHistory: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  chatLoading: boolean;
  onSend: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black">💬 {jobName}｜職涯顧問聊天</h2>
        <p className="mt-2 text-sm text-slate-500">
          你可以針對這個職業詢問學習路線、作品集、實習、履歷或面試準備。
        </p>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
        {chatHistory.length === 0 ? (
          <div className="text-sm text-slate-500">
            目前尚無聊天紀錄，可以先問：「我現在第一步該做什麼？」
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                  msg.role === "user"
                    ? "bg-orange-500 text-white"
                    : "bg-white text-slate-800 shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="輸入你想問這個職業的問題..."
          className="min-h-24 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
        />

        <button
          onClick={onSend}
          disabled={chatLoading}
          className="w-28 rounded-2xl bg-orange-500 font-black text-white disabled:opacity-50"
        >
          {chatLoading ? "回覆中" : "送出"}
        </button>
      </div>
    </section>
  );
}

export default function MapPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobPlan[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detail, setDetail] = useState<JobDetail>({ skills: [], tasks: [] });
  const [message, setMessage] = useState("載入中...");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [completingTaskTitle, setCompletingTaskTitle] = useState<string | null>(
  null
);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const selectedJob = useMemo(() => {
    return jobs[selectedIndex] || null;
  }, [jobs, selectedIndex]);

  useEffect(() => {
    const savedStudentId = localStorage.getItem("student_id");

    if (!savedStudentId) {
      window.location.href = "/login";
      return;
    }

    setStudentId(savedStudentId);

    async function loadJobs() {
      try {
        const res = await fetch(`/api/jobs?student_id=${savedStudentId}`);
        const data = await res.json();

        if (!data.ok) {
          setMessage(data.message || "讀取職業資料失敗。");
          return;
        }

        setJobs(data.jobs || []);

        if (!data.jobs || data.jobs.length === 0) {
          setMessage("目前尚無角色報告資料，請先完成職涯探索分析。");
        } else {
          setMessage("");
        }
      } catch {
        setMessage("系統發生錯誤，無法讀取角色報告。");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  useEffect(() => {
    if (!studentId || !selectedJob?.job_name) return;

    const currentStudentId = studentId;
    const currentJobName = selectedJob.job_name;

    async function loadDetail() {
      setDetailLoading(true);

      try {
        const query = new URLSearchParams({
          student_id: currentStudentId,
          job_name: currentJobName,
        });

        const res = await fetch(`/api/job-detail?${query.toString()}`);
        const data = await res.json();

        if (!data.ok) {
          setDetail({ skills: [], tasks: [] });
          return;
        }

        setDetail({
          skills: data.skills || [],
          tasks: data.tasks || [],
        });
      } catch {
        setDetail({ skills: [], tasks: [] });
      } finally {
        setDetailLoading(false);
      }
    }

    loadDetail();
  }, [studentId, selectedJob]);

    useEffect(() => {
  if (!studentId || !selectedJob?.job_name) return;

  const currentStudentId = studentId;
  const currentJobName = selectedJob.job_name;

  async function loadChatHistory() {
    try {
      const query = new URLSearchParams({
        student_id: currentStudentId,
        job_name: currentJobName,
      });

      const res = await fetch(`/api/job-chat?${query.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setChatHistory(data.history || []);
      } else {
        setChatHistory([]);
      }
    } catch {
      setChatHistory([]);
    }
  }

  setChatInput("");
  loadChatHistory();
}, [studentId, selectedJob]);


  async function handleCompleteTask(task: Task) {
  if (!studentId || !selectedJob?.job_name) {
    setActionMessage("缺少登入資料或職業資料，無法完成任務。");
    return;
  }
  const currentStudentId = studentId;
  const currentJobName = selectedJob.job_name; 

  const confirmed = window.confirm(`確認完成任務：${task.task_title}？`);

  if (!confirmed) return;

  setActionMessage("");
  setCompletingTaskTitle(task.task_title);

  try {
    const res = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: currentStudentId,
        job_name: currentJobName,
        task_title: task.task_title,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      setActionMessage(data.message || "完成任務失敗。");
      return;
    }

    setActionMessage(
      `${data.message}。能力值 +${Number(data.bonus || 0).toFixed(
        1
      )}，已更新 ${Number(data.updated_skill_count || 0)} 筆能力值。`
    );

    const query = new URLSearchParams({
      student_id: studentId,
      job_name: selectedJob.job_name,
    });

    const detailRes = await fetch(`/api/job-detail?${query.toString()}`);
    const detailData = await detailRes.json();

    if (detailData.ok) {
      setDetail({
        skills: detailData.skills || [],
        tasks: detailData.tasks || [],
      });
    }
  } catch {
    setActionMessage("系統發生錯誤，無法完成任務。");
  } finally {
    setCompletingTaskTitle(null);
  }
}

async function handleSendChat() {
  if (!studentId || !selectedJob?.job_name) {
    return;
  }

  const message = chatInput.trim();

  if (!message) {
    return;
  }

  const currentStudentId = studentId;
  const currentJobName = selectedJob.job_name;

  setChatLoading(true);

  const optimisticHistory: ChatMessage[] = [
    ...chatHistory,
    {
      role: "user",
      content: message,
    },
  ];

  setChatHistory(optimisticHistory);
  setChatInput("");

  try {
    const res = await fetch("/api/job-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: currentStudentId,
        job_name: currentJobName,
        message,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      setChatHistory([
        ...optimisticHistory,
        {
          role: "assistant",
          content: data.message || "職涯聊天失敗，請稍後再試。",
        },
      ]);
      return;
    }

    setChatHistory(data.history || [
      ...optimisticHistory,
      {
        role: "assistant",
        content: data.reply || "AI 已回覆，但沒有取得內容。",
      },
    ]);
  } catch {
    setChatHistory([
      ...optimisticHistory,
      {
        role: "assistant",
        content: "系統發生錯誤，無法送出聊天。",
      },
    ]);
  } finally {
    setChatLoading(false);
  }
}
  function handleLogout() {
    localStorage.removeItem("student_id");
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        載入角色報告中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black">角色報告地圖</h1>
            <p className="mt-1 text-sm text-slate-500">
              目前登入學號：{studentId}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => (window.location.href = "/")}
              className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white"
            >
              回首頁
            </button>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
            >
              登出
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-3xl bg-white p-6 text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        {jobs.length > 0 && (
          <>
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              {jobs.map((job, index) => (
                <button
                  key={job.job_name}
                  onClick={() => setSelectedIndex(index)}
                  className={`rounded-3xl p-5 text-left shadow-sm transition ${
                    selectedIndex === index
                      ? "bg-orange-500 text-white"
                      : "bg-white text-slate-800"
                  }`}
                >
                  <div className="text-sm font-bold opacity-80">
                    職業 {index + 1}
                  </div>
                  <div className="mt-2 text-xl font-black">
                    {job.job_name}
                  </div>
                  <div
                    className={`mt-3 text-sm leading-6 ${
                      selectedIndex === index
                        ? "text-orange-50"
                        : "text-slate-500"
                    }`}
                  >
                    短期：{job.short_term || "尚無短期規劃"}
                  </div>
                </button>
              ))}
            </div>

            {selectedJob && (
              <div className="grid gap-5">
                <section className="rounded-3xl bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-2xl font-black">
                      {selectedJob.job_name}｜職涯規劃
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      此頁整合職涯規劃、能力值與任務進度。
                    </p>
                  </div>
                </section>

                {detailLoading ? (
                  <section className="rounded-3xl bg-white p-6 text-slate-600 shadow-sm">
                    載入能力值與任務中...
                  </section>
                ) : (
                  <>
                    <ReadinessCard skills={detail.skills} />
                    <SkillsSection skills={detail.skills} />
                    {actionMessage && (
  <div className="rounded-3xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800 shadow-sm">
    {actionMessage}
  </div>
)}

<TasksSection
  tasks={detail.tasks}
  onComplete={handleCompleteTask}
  completingTaskTitle={completingTaskTitle}
/>
                  </>
                )}

                <section className="rounded-3xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black">
                    {selectedJob.job_name}｜短中長期規劃
                  </h2>

                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <div className="font-black">短期｜0～6 個月</div>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {selectedJob.short_term || "尚無資料"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-black">中期｜6 個月～2 年</div>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {selectedJob.mid_term || "尚無資料"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-black">長期｜2 年以上</div>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {selectedJob.long_term || "尚無資料"}
                      </p>
                    </div>

                    <ResourceList
                      title="📚 推薦課程 / 選課方向"
                      items={selectedJob.course_resources}
                    />

                    <ResourceList
                      title="🧪 工作坊 / 外部活動"
                      items={selectedJob.workshop_resources}
                    />

                    <ResourceList
                      title="🎓 推薦證照"
                      items={selectedJob.cert_resources}
                    />

                    <ResourceList
                      title="🏫 職涯中心資源"
                      items={selectedJob.career_center_resources}
                    />
                  </div>
                </section>
                <JobChatSection
  jobName={selectedJob.job_name}
  chatHistory={chatHistory}
  chatInput={chatInput}
  setChatInput={setChatInput}
  chatLoading={chatLoading}
  onSend={handleSendChat}
/>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}