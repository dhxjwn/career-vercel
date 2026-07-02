import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL_CHAT =
  process.env.GROQ_MODEL_CHAT || "llama-3.3-70b-versatile";

type Role = "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
};

const TOPIC_NAMES: Record<number, string> = {
  1: "自我探索",
  2: "技能探索",
  3: "職涯探索",
};

const TOPIC_PROMPTS: Record<number, string> = {
  1: `
請用台灣習慣的繁體中文回答。

你是一位理性、引導式的職涯探索顧問，
正在幫助大學生進行「關卡一：ASK（興趣探索）」。

【互動規則】
1. 前兩題請使用「選擇題」形式：
   - 提供 A、B、C、D 四個選項
   - 並加上 E：其他（請說明）
2. 第三題開始改為開放式問題
3. 每次只問一題
4. 不要過度鼓勵或誇讚，保持自然即可
5. 語氣清楚、簡潔、有引導性
6. 若使用者回答 A、B、C、D 選項，你需讀取上一個問題的選項來回答
7. 當使用者輸入「A / B / C / D / E」時：
   - 視為回答上一題
   - 不要詢問使用者是在回答哪一題
   - 直接根據該選項內容做簡短解讀
   - 然後繼續提出下一題
8. 第一輪對話時，請直接開始出第一題選擇題

【問題方向】
請引導使用者思考：
- 平常會主動想做的事情
- 願意花時間投入的活動
- 讓自己有興趣或專注的內容

【目標】
幫助使用者逐步說出自己的興趣輪廓
`,

  2: `
請用台灣習慣的繁體中文回答。

你是一位理性、引導式的職涯探索顧問，
正在幫助大學生進行「關卡二：VIP（技能與經驗探索）」。

【互動規則】
1. 前兩題請使用「選擇題」形式：
   - 提供 A、B、C、D 四個選項
   - 並加上 E：其他（請說明）
2. 第三題開始改為開放式問題
3. 每次只問一題
4. 不要過度鼓勵或誇讚，保持自然即可
5. 語氣清楚、簡潔、有引導性
6. 若使用者回答 A、B、C、D 選項，你需讀取上一個問題的選項來回答
7. 當使用者輸入「A / B / C / D / E」時：
   - 視為回答上一題
   - 不要詢問使用者是在回答哪一題
   - 直接根據該選項內容做簡短解讀
   - 然後繼續提出下一題

【問題方向】
請引導使用者說出：
- 學過的課程
- 做過的專題或專案
- 曾經培養過的技能
- 擅長或被稱讚的能力

【目標】
幫助使用者整理自己已具備的能力與經驗
`,

  3: `
請用台灣習慣的繁體中文回答。

你是一位理性、引導式的職涯探索顧問，
正在幫助大學生進行「關卡三：渴望但尚未擁有（職涯想像）」。

【互動規則】
1. 前兩題請使用「選擇題」形式：
   - 提供 A、B、C、D 四個選項
   - 並加上 E：其他（請說明）
2. 第三題開始改為開放式問題
3. 每次只問一題
4. 不要過度鼓勵或誇讚，保持自然即可
5. 語氣清楚、簡潔、有引導性
6. 若使用者回答 A、B、C、D 選項，你需讀取上一個問題的選項來回答
7. 當使用者輸入「A / B / C / D / E」時：
   - 視為回答上一題
   - 不要詢問使用者是在回答哪一題
   - 直接根據該選項內容做簡短解讀
   - 然後繼續提出下一題

【問題方向】
請引導使用者思考：
- 想嘗試但還沒接觸的工作
- 嚮往的產業或角色
- 理想的工作型態

【目標】
幫助使用者說出未來想發展的方向與可能性
`,
};

function safeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeTopic(value: unknown) {
  const topic = Number(value || 1);

  if (topic === 1 || topic === 2 || topic === 3) {
    return topic;
  }

  return 1;
}

function normalizeChoice(message: string) {
  const normalized = message
    .trim()
    .replace(/[。．.）)]$/g, "")
    .toUpperCase();

  if (["A", "B", "C", "D", "E"].includes(normalized)) {
    return normalized;
  }

  return message.trim();
}

function progressPercent(count: number) {
  const total = 5;
  const safeCount = Math.max(0, Math.min(Number(count || 0), total));
  return Math.round((safeCount / total) * 100);
}

async function getOrCreateProgress(studentId: string) {
  const { data, error } = await supabase
    .from("progress")
    .select("topic1_count, topic2_count, topic3_count, unlocked_topic")
    .eq("student_id", studentId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    return {
      topic1_count: Number(data[0].topic1_count || 0),
      topic2_count: Number(data[0].topic2_count || 0),
      topic3_count: Number(data[0].topic3_count || 0),
      unlocked_topic: Number(data[0].unlocked_topic || 1),
    };
  }

  const initialProgress = {
    student_id: studentId,
    topic1_count: 0,
    topic2_count: 0,
    topic3_count: 0,
    unlocked_topic: 1,
  };

  const insertRes = await supabase.from("progress").insert(initialProgress);

  if (insertRes.error) {
    throw new Error(insertRes.error.message);
  }

  return {
    topic1_count: 0,
    topic2_count: 0,
    topic3_count: 0,
    unlocked_topic: 1,
  };
}

function formatProgress(progress: {
  topic1_count: number;
  topic2_count: number;
  topic3_count: number;
  unlocked_topic: number;
}) {
  return {
    topic1_count: progress.topic1_count,
    topic2_count: progress.topic2_count,
    topic3_count: progress.topic3_count,
    unlocked_topic: progress.unlocked_topic,
    topic1_percent: progressPercent(progress.topic1_count),
    topic2_percent: progressPercent(progress.topic2_count),
    topic3_percent: progressPercent(progress.topic3_count),
  };
}

async function loadTopicMessages(studentId: string, topic: number) {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("student_id", studentId)
    .eq("topic", topic)
    .order("id");

  if (error || !data) {
    return [];
  }

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

async function saveMessage(
  studentId: string,
  topic: number,
  role: Role,
  content: string
) {
  const text = safeText(content);

  if (!text) return;

  const { error } = await supabase.from("messages").insert({
    student_id: studentId,
    topic,
    role,
    content: text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function askGroq(topic: number, history: ChatMessage[], userMessage: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const systemPrompt = TOPIC_PROMPTS[topic] || TOPIC_PROMPTS[1];

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    ...history.slice(-8).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_CHAT,
    messages,
    temperature: 0.4,
    max_tokens: 500,
  });

  return safeText(response.choices[0]?.message?.content);
}

async function updateProgress(studentId: string, topic: number) {
  const progress = await getOrCreateProgress(studentId);

  let topic1Count = Number(progress.topic1_count || 0);
  let topic2Count = Number(progress.topic2_count || 0);
  let topic3Count = Number(progress.topic3_count || 0);
  let unlockedTopic = Number(progress.unlocked_topic || 1);

  if (topic === 1) {
    topic1Count = Math.min(topic1Count + 1, 5);
  }

  if (topic === 2) {
    topic2Count = Math.min(topic2Count + 1, 5);
  }

  if (topic === 3) {
    topic3Count = Math.min(topic3Count + 1, 5);
  }

  if (topic1Count >= 5 && unlockedTopic < 2) {
    unlockedTopic = 2;
  }

  if (topic2Count >= 5 && unlockedTopic < 3) {
    unlockedTopic = 3;
  }

  const newProgress = {
    topic1_count: topic1Count,
    topic2_count: topic2Count,
    topic3_count: topic3Count,
    unlocked_topic: unlockedTopic,
  };

  const { error } = await supabase
    .from("progress")
    .update(newProgress)
    .eq("student_id", studentId);

  if (error) {
    throw new Error(error.message);
  }

  return newProgress;
}

function buildUnlockNotice(topic: number, progress: ReturnType<typeof formatProgress>) {
  if (topic === 1 && progress.topic1_count >= 5 && progress.unlocked_topic >= 2) {
    return "✅ 你已完成自我探索，可以進入第二關：技能探索。";
  }

  if (topic === 2 && progress.topic2_count >= 5 && progress.unlocked_topic >= 3) {
    return "✅ 你已完成技能探索，可以進入第三關：職涯探索。";
  }

  if (topic === 3 && progress.topic3_count >= 5) {
    return "🎉 你已完成三個關卡，下一步可以產生整體職涯分析與角色報告地圖。";
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("student_id")?.trim();
    const requestedTopic = normalizeTopic(
      request.nextUrl.searchParams.get("topic")
    );

    if (!studentId) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id。",
        history: [],
      });
    }

    const progress = await getOrCreateProgress(studentId);
    const topic =
      requestedTopic > progress.unlocked_topic
        ? progress.unlocked_topic
        : requestedTopic;

    let history = await loadTopicMessages(studentId, topic);

    if (history.length === 0) {
      const firstQuestion = await askGroq(topic, [], "請開始第一題");

      if (firstQuestion) {
        await saveMessage(studentId, topic, "assistant", firstQuestion);
        history = [{ role: "assistant", content: firstQuestion }];
      }
    }

    return NextResponse.json({
      ok: true,
      message: "讀取專案一聊天成功。",
      topic,
      topic_name: TOPIC_NAMES[topic],
      progress: formatProgress(progress),
      history,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "讀取專案一聊天失敗。",
        error: err instanceof Error ? err.message : String(err),
        history: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const studentId = safeText(body.student_id);
    const requestedTopic = normalizeTopic(body.topic);
    const userMessage = normalizeChoice(safeText(body.message));

    if (!studentId || !userMessage) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id 或 message。",
      });
    }

    const oldProgress = await getOrCreateProgress(studentId);
    const topic =
      requestedTopic > oldProgress.unlocked_topic
        ? oldProgress.unlocked_topic
        : requestedTopic;

    const historyBefore = await loadTopicMessages(studentId, topic);
    const aiReply = await askGroq(topic, historyBefore, userMessage);

    if (!aiReply) {
      return NextResponse.json({
        ok: false,
        message: "AI 暫時沒有回應，請稍後再試。",
      });
    }

    await saveMessage(studentId, topic, "user", userMessage);

    const updatedProgressRaw = await updateProgress(studentId, topic);
    const updatedProgress = formatProgress(updatedProgressRaw);

    const unlockNotice = buildUnlockNotice(topic, updatedProgress);
    const finalReply = unlockNotice
      ? `${aiReply}\n\n${unlockNotice}`
      : aiReply;

    await saveMessage(studentId, topic, "assistant", finalReply);

    const history = await loadTopicMessages(studentId, topic);

    return NextResponse.json({
      ok: true,
      message: "專案一聊天成功。",
      topic,
      topic_name: TOPIC_NAMES[topic],
      progress: updatedProgress,
      reply: finalReply,
      history,
      unlock_notice: unlockNotice,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "專案一聊天 API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}