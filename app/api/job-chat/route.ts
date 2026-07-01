import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function safeText(value: unknown) {
  return String(value || "").trim();
}

async function getAnalysisText(studentId: string) {
  const { data, error } = await supabase
    .from("analysis_status")
    .select("analysis_text")
    .eq("student_id", studentId)
    .limit(1);

  if (error || !data || data.length === 0) return "";

  return safeText(data[0].analysis_text);
}

async function getJobPlan(studentId: string, jobName: string) {
  const { data, error } = await supabase
    .from("career_job_plans")
    .select("short_term, mid_term, long_term")
    .eq("student_id", studentId)
    .eq("job_name", jobName)
    .limit(1);

  if (error || !data || data.length === 0) {
    return {
      short_term: "",
      mid_term: "",
      long_term: "",
    };
  }

  return {
    short_term: safeText(data[0].short_term),
    mid_term: safeText(data[0].mid_term),
    long_term: safeText(data[0].long_term),
  };
}

async function loadProject1Messages(studentId: string, limit = 12) {
  const { data, error } = await supabase
    .from("messages")
    .select("topic, role, content")
    .eq("student_id", studentId)
    .order("id");

  if (error || !data) return "（無專案一聊天紀錄可參考）";

  const topicNames: Record<number, string> = {
    1: "興趣探索",
    2: "技能探索",
    3: "職涯探索",
  };

  const rows = data.slice(-limit);

  const lines = rows
    .map((row) => {
      const topic = Number(row.topic || 0);
      const role = safeText(row.role);
      let content = safeText(row.content);

      if (!content) return "";

      if (content.length > 180) {
        content = content.slice(0, 180) + "...";
      }

      const speaker = role === "user" ? "學生" : "AI";
      const topicName = topicNames[topic] || `主題${topic}`;

      return `[${topicName}] ${speaker}：${content}`;
    })
    .filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "（無專案一聊天紀錄可參考）";
}

async function loadCareerChatHistory(studentId: string, jobName: string) {
  const { data, error } = await supabase
    .from("career_chat_messages")
    .select("role, content")
    .eq("student_id", studentId)
    .eq("job_name", jobName)
    .order("id");

  if (error || !data) return [];

  return data
    .map((row) => ({
      role: safeText(row.role),
      content: safeText(row.content),
    }))
    .filter(
      (item): item is ChatMessage =>
        (item.role === "user" || item.role === "assistant") &&
        Boolean(item.content)
    );
}

function classifyQuestionStage(userMessage: string) {
  const text = userMessage.toLowerCase();

  const longKeywords = [
    "面試",
    "履歷",
    "自傳",
    "求職",
    "找工作",
    "投遞",
    "offer",
    "作品集",
    "薪水",
    "談薪",
    "應徵",
    "職缺",
  ];

  const midKeywords = [
    "專案",
    "作品",
    "實習",
    "證照",
    "技能",
    "能力",
    "學習路線",
    "準備方向",
    "累積經驗",
    "強化",
    "進步",
    "進修",
  ];

  const shortKeywords = [
    "怎麼開始",
    "第一步",
    "先做什麼",
    "入門",
    "現在要做什麼",
    "從哪開始",
    "適不適合",
    "我現在",
    "起步",
  ];

  if (longKeywords.some((word) => text.includes(word))) return "long_term";
  if (midKeywords.some((word) => text.includes(word))) return "mid_term";
  if (shortKeywords.some((word) => text.includes(word))) return "short_term";

  return "auto";
}

function buildSystemPrompt({
  jobName,
  analysisText,
  project1Context,
  shortTerm,
  midTerm,
  longTerm,
  stageHint,
}: {
  jobName: string;
  analysisText: string;
  project1Context: string;
  shortTerm: string;
  midTerm: string;
  longTerm: string;
  stageHint: string;
}) {
  return `
你是一位針對特定職業提供職涯建議的 AI 顧問，正在協助一位學生發展成為「${jobName}」。

【你的核心任務】
你要根據學生背景、專案一聊天紀錄、以及此職業的短中長期規劃，
回答學生的問題，幫助他理解：
1. 怎麼從現在走到這個職業
2. 下一步該做什麼
3. 如何逐步累積作品、能力、實習與求職準備

【角色切換規則】
你要根據使用者問題內容，自動選擇最適合的回答視角：

- 短期 short_term：扮演「業界導師」，像帶新人的前輩，具體、清楚、一步一步帶。
- 中期 mid_term：扮演「實戰型職涯教練」，重視能力累積、專案、作品、實習、可展示成果。
- 長期 long_term：扮演「面試導向教練」，重視履歷、作品集、求職策略、面試表達與拿 offer 的準備。

目前對這題的初步判斷：${stageHint}
注意：這只是輔助判斷。若問題實際上更適合其他階段，請以問題本身為準。

【學生整體分析】
${analysisText || "（無整體分析資料）"}

【專案一聊天紀錄摘要】
${project1Context || "（無專案一聊天紀錄可參考）"}

【目前這個職業的規劃】
短期：${shortTerm || "尚無資料"}
中期：${midTerm || "尚無資料"}
長期：${longTerm || "尚無資料"}

【回答要求】
1. 使用台灣繁體中文。
2. 先直接回答問題，不要先講太多空話。
3. 優先給「下一步可以做什麼」。
4. 優先結合學生背景與目前職業規劃回答。
5. 不要只講抽象概念，要盡量具體，例如作品、工具、技能、經驗、履歷、面試。
6. 若資訊不足，請明確說明不確定，並在最後補 1 個很短的追問。
7. 不要編造學生沒有說過的經歷。
8. 回答簡潔但具體。
`;
}

async function saveCareerChatMessage({
  studentId,
  jobName,
  role,
  content,
}: {
  studentId: string;
  jobName: string;
  role: "user" | "assistant";
  content: string;
}) {
  await supabase.from("career_chat_messages").insert({
    student_id: studentId,
    job_name: jobName,
    role,
    content,
  });
}
export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("student_id")?.trim();
    const jobName = request.nextUrl.searchParams.get("job_name")?.trim();

    if (!studentId || !jobName) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id 或 job_name。",
        history: [],
      });
    }

    const history = await loadCareerChatHistory(studentId, jobName);

    return NextResponse.json({
      ok: true,
      message: "讀取職業聊天紀錄成功",
      history,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "讀取職業聊天紀錄失敗。",
        error: err instanceof Error ? err.message : String(err),
        history: [],
      },
      { status: 500 }
    );
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
    const jobName = safeText(body.job_name);
    const userMessage = safeText(body.message);

    if (!studentId || !jobName || !userMessage) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id、job_name 或 message。",
      });
    }

    if (userMessage.length < 3) {
      return NextResponse.json({
        ok: false,
        message: "訊息太短，請輸入更完整的問題。",
      });
    }

    const analysisText = await getAnalysisText(studentId);
    const plan = await getJobPlan(studentId, jobName);
    const project1Context = await loadProject1Messages(studentId, 12);
    const history = await loadCareerChatHistory(studentId, jobName);
    const stageHint = classifyQuestionStage(userMessage);

    const systemPrompt = buildSystemPrompt({
      jobName,
      analysisText,
      project1Context,
      shortTerm: plan.short_term,
      midTerm: plan.mid_term,
      longTerm: plan.long_term,
      stageHint,
    });

    await saveCareerChatMessage({
      studentId,
      jobName,
      role: "user",
      content: userMessage,
    });

    const model = process.env.GROQ_MODEL_CHAT || "llama-3.3-70b-versatile";

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history.slice(-10).map((item) => ({
        role: item.role,
        content: item.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 600,
    });

    const reply =
      response.choices[0]?.message?.content?.trim() ||
      "我目前暫時沒有成功產生回覆，請再問我一次。";

    await saveCareerChatMessage({
      studentId,
      jobName,
      role: "assistant",
      content: reply,
    });

    const updatedHistory = await loadCareerChatHistory(studentId, jobName);

    return NextResponse.json({
      ok: true,
      message: "職業聊天成功",
      reply,
      history: updatedHistory,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "job-chat API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}