import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL_ANALYSIS =
  process.env.GROQ_MODEL_ANALYSIS || "llama-3.3-70b-versatile";

type MessageRow = {
  topic: number;
  role: string;
  content: string;
};

type SkillItem = {
  name?: string;
  score?: number;
  ai_reason?: string;
  suggestion?: string;
};

type TaskItem = {
  title?: string;
  score?: number;
  type?: string;
};

type GeneratedPlan = {
  short_term?: string;
  mid_term?: string;
  long_term?: string;
  resources?: {
    courses?: string[];
    workshops?: string[];
    certs?: string[];
    career_center?: string[];
  };
  role_fragments?: {
    functional?: SkillItem[];
    traits?: SkillItem[];
  };
  tasks?: {
    short?: TaskItem[];
    mid?: TaskItem[];
    long?: TaskItem[];
  };
};

function safeText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];

  for (const item of value) {
    const text = safeText(item);

    if (text && !result.includes(text)) {
      result.push(text);
    }
  }

  return result.slice(0, 4);
}

async function loadAllMessages(studentId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("topic, role, content")
    .eq("student_id", studentId)
    .order("id");

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => ({
    topic: toNumber(row.topic, 0),
    role: safeText(row.role),
    content: safeText(row.content),
  }));
}

function buildDialogueText(messages: MessageRow[]) {
  const topicNames: Record<number, string> = {
    1: "興趣探索",
    2: "技能探索",
    3: "職涯探索",
  };

  const lines = messages
    .filter((item) => item.content)
    .map((item) => {
      const topicName = topicNames[item.topic] || `主題${item.topic}`;
      const speaker = item.role === "user" ? "學生" : "AI";

      return `[${topicName}] ${speaker}：${item.content}`;
    });

  return lines.join("\n").trim();
}

async function analyzeAllTopics(messages: MessageRow[]) {
  const dialogueText = buildDialogueText(messages);

  if (!dialogueText) {
    throw new Error("目前沒有可分析的聊天內容。");
  }

  const userPrompt = `
以下是學生的完整對話紀錄：

${dialogueText}

請根據以上對話，輸出完整整體職涯分析，並且必須嚴格遵守以下格式。

【輸出格式要求】
請務必依照下面四個大項輸出，標題名稱也請保持一致：

1. 整體特質整理
請用 2～4 句整理學生的個性、興趣傾向、行為風格。

2. 可觀察到的能力與優勢
請列出 3～5 點能力或優勢，每點一句。

3. 推薦三個適合職業
這一段請務必嚴格使用以下格式，不可以改格式，不可以加粗，不可以改成項目符號：
1. 職業名稱：推薦原因
2. 職業名稱：推薦原因
3. 職業名稱：推薦原因

其中：
・第1個職業：以學生最明確的技能或能力為核心推薦。
・第2個職業：以學生的個性特質、工作偏好或行為風格為核心推薦。
・第3個職業：一定要結合學生的「興趣」與「技能」，產出一個更具體、更貼近產業場景的融合型職業。
・三個職業不要過於相似，也不要只給籠統職稱。
・職業名稱請盡量精簡，放在冒號前面，不要把原因寫進職業名稱裡。

4. 一句整體職涯建議
請用 1～2 句給學生一個整體發展方向建議。
`;

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_ANALYSIS,
    messages: [
      {
        role: "system",
        content:
          "你是一位大學生職涯分析顧問。請用台灣繁體中文回答，並嚴格遵守指定格式。",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  const text = safeText(response.choices[0]?.message?.content);

  if (!text) {
    throw new Error("AI 沒有回傳整體分析內容。");
  }

  return text;
}

function extractJobsFromAnalysis(analysisText: string) {
  const text = safeText(analysisText);

  if (!text) return [];

  const sectionMatch = text.match(
    /3\.\s*推薦三個適合職業[\s\S]*?(?=\n\s*4\.|\Z)/
  );

  const targetText = sectionMatch ? sectionMatch[0] : text;
  const lines = targetText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const jobs: string[] = [];

  for (const line of lines) {
    let job = "";

    const match = line.match(/^[1-3]\.\s*([^：:\n]+?)\s*[：:]/);

    if (match) {
      job = safeText(match[1]);
    }

    if (!job) continue;

    job = job.replace(/^\*+|\*+$/g, "").trim();
    job = job.split("（")[0].split("(")[0].trim();

    if (!job) continue;
    if (job.length > 30) continue;
    if (jobs.includes(job)) continue;

    jobs.push(job);

    if (jobs.length >= 3) break;
  }

  return jobs;
}

async function generatePlanWithAI(jobName: string, analysisText: string) {
  const systemPrompt = `
你是一位專業的職涯規劃顧問。

你的任務是根據學生的分析內容，為指定職業生成：
1. short_term
2. mid_term
3. long_term
4. resources
5. role_fragments
6. tasks

【重要前提】
請一律以「職場新鮮人 0～2 年經驗」為基準來設計。

【規則】
1. 所有建議都要具體、可執行。
2. short_term：0～6 個月，聚焦入門、基礎準備。
3. mid_term：6 個月～2 年，聚焦作品、專題、實習、實務經驗。
4. long_term：2 年以上，聚焦職涯定位、進階方向、求職策略。
5. 不要寫空泛內容。
6. 使用台灣繁體中文。
7. 每一段 short_term / mid_term / long_term 控制在 45 字內。
8. resources 每類給 2～4 個。
9. functional 給 3 個職能。
10. traits 給 2 個特質。
11. tasks 的 short / mid / long 每階段給 2～3 個任務。

【輸出格式】
你只能輸出 JSON，不能有其他解釋文字：

{
  "short_term": "...",
  "mid_term": "...",
  "long_term": "...",
  "resources": {
    "courses": ["...", "..."],
    "workshops": ["...", "..."],
    "certs": ["...", "..."],
    "career_center": ["...", "..."]
  },
  "role_fragments": {
    "functional": [
      {
        "name": "...",
        "score": 0,
        "ai_reason": "...",
        "suggestion": "..."
      }
    ],
    "traits": [
      {
        "name": "...",
        "score": 0,
        "ai_reason": "...",
        "suggestion": "..."
      }
    ]
  },
  "tasks": {
    "short": [
      {"title": "...", "score": 1, "type": "..."}
    ],
    "mid": [
      {"title": "...", "score": 1, "type": "..."}
    ],
    "long": [
      {"title": "...", "score": 1, "type": "..."}
    ]
  }
}
`;

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_ANALYSIS,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `
【學生分析】
${analysisText}

【指定職業】
${jobName}

請生成此職業的新鮮人職涯規劃 JSON。
`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 1400,
  });

  const content = safeText(response.choices[0]?.message?.content);

  if (!content) {
    throw new Error(`AI 沒有產生 ${jobName} 的職涯規劃。`);
  }

  return JSON.parse(content) as GeneratedPlan;
}

async function saveAnalysisStatus(
  studentId: string,
  analysisText: string,
  jobCount: number
) {
  const payload = {
    student_id: studentId,
    full_analysis_done: true,
    recommended_jobs_count: jobCount,
    analysis_text: analysisText,
  };

  const { data, error } = await supabase
    .from("analysis_status")
    .select("student_id")
    .eq("student_id", studentId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    const updateRes = await supabase
      .from("analysis_status")
      .update(payload)
      .eq("student_id", studentId);

    if (updateRes.error) {
      throw new Error(updateRes.error.message);
    }
  } else {
    const insertRes = await supabase.from("analysis_status").insert(payload);

    if (insertRes.error) {
      throw new Error(insertRes.error.message);
    }
  }
}

async function clearOldCareerData(studentId: string) {
  const tables = [
    "career_job_tasks",
    "career_job_skills",
    "career_job_plans",
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("student_id", studentId);

    if (error) {
      throw new Error(`${table} 清除失敗：${error.message}`);
    }
  }
}

async function saveJobPlan(
  studentId: string,
  jobName: string,
  plan: GeneratedPlan
) {
  const resources = plan.resources || {};

  const { error } = await supabase.from("career_job_plans").insert({
    student_id: studentId,
    job_name: jobName,
    short_term: safeText(plan.short_term),
    mid_term: safeText(plan.mid_term),
    long_term: safeText(plan.long_term),
    course_resources: JSON.stringify(cleanList(resources.courses)),
    workshop_resources: JSON.stringify(cleanList(resources.workshops)),
    cert_resources: JSON.stringify(cleanList(resources.certs)),
    career_center_resources: JSON.stringify(cleanList(resources.career_center)),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function saveJobSkills(
  studentId: string,
  jobName: string,
  plan: GeneratedPlan
) {
  const fragments = plan.role_fragments || {};
  const functional = Array.isArray(fragments.functional)
    ? fragments.functional.slice(0, 3)
    : [];
  const traits = Array.isArray(fragments.traits)
    ? fragments.traits.slice(0, 2)
    : [];

  const rows = [
    ...functional.map((item) => ({
      student_id: studentId,
      job_name: jobName,
      skill_name: safeText(item.name),
      skill_type: "職能",
      score: Math.max(0, Math.min(toNumber(item.score, 0), 10)),
      max_score: 10,
      ai_reason: safeText(item.ai_reason),
      suggestion: safeText(item.suggestion),
    })),
    ...traits.map((item) => ({
      student_id: studentId,
      job_name: jobName,
      skill_name: safeText(item.name),
      skill_type: "特質",
      score: Math.max(0, Math.min(toNumber(item.score, 0), 10)),
      max_score: 10,
      ai_reason: safeText(item.ai_reason),
      suggestion: safeText(item.suggestion),
    })),
  ].filter((item) => item.skill_name);

  if (rows.length === 0) return;

  const { error } = await supabase.from("career_job_skills").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

async function saveJobTasks(
  studentId: string,
  jobName: string,
  plan: GeneratedPlan
) {
  const tasks = plan.tasks || {};
  const stages: Array<"short" | "mid" | "long"> = ["short", "mid", "long"];
  const rows = [];

  for (const stage of stages) {
    const stageTasks = Array.isArray(tasks[stage])
      ? tasks[stage]!.slice(0, 3)
      : [];

    for (const task of stageTasks) {
      const title = safeText(task.title);

      if (!title) continue;

      rows.push({
        student_id: studentId,
        job_name: jobName,
        task_title: title,
        task_stage: stage,
        task_type: safeText(task.type) || "練習",
        task_score: Math.max(0.5, Math.min(toNumber(task.score, 1), 2)),
        is_completed: false,
      });
    }
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("career_job_tasks").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing GROQ_API_KEY",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const studentId = safeText(body.student_id);

    if (!studentId) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id。",
      });
    }

    const messages = await loadAllMessages(studentId);

    if (messages.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "目前沒有可分析的聊天紀錄。",
      });
    }

    const analysisText = await analyzeAllTopics(messages);
    const jobs = extractJobsFromAnalysis(analysisText);

    if (jobs.length < 3) {
      return NextResponse.json({
        ok: false,
        message: "職業解析失敗，未成功取得三個推薦職業。",
        analysis_text: analysisText,
        jobs,
      });
    }

    const plans: Array<{ job_name: string; plan: GeneratedPlan }> = [];

    for (const job of jobs.slice(0, 3)) {
      const plan = await generatePlanWithAI(job, analysisText);
      plans.push({
        job_name: job,
        plan,
      });
    }

    await saveAnalysisStatus(studentId, analysisText, plans.length);
    await clearOldCareerData(studentId);

    for (const item of plans) {
      await saveJobPlan(studentId, item.job_name, item.plan);
      await saveJobSkills(studentId, item.job_name, item.plan);
      await saveJobTasks(studentId, item.job_name, item.plan);
    }

    return NextResponse.json({
      ok: true,
      message: "整體職涯分析與角色報告已產生。",
      analysis_text: analysisText,
      jobs: plans.map((item) => item.job_name),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "整體職涯分析 API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}