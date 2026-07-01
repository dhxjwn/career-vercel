import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET() {
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

    const model = process.env.GROQ_MODEL_LIGHT || "llama-3.1-8b-instant";

    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "請用台灣繁體中文回答。",
        },
        {
          role: "user",
          content: "請回覆：Groq 測試成功",
        },
      ],
      temperature: 0.2,
      max_tokens: 80,
    });

    const text = response.choices[0]?.message?.content || "";

    return NextResponse.json({
      ok: true,
      message: "Groq 連線成功",
      model,
      reply: text,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "Groq 連線失敗",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}