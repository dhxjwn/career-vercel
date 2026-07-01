import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabase } from "@/lib/supabase";

function hashPassword(password: string) {
  return createHash("sha256").update(password.trim(), "utf8").digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const studentId = String(body.student_id || "").trim();
    const password = String(body.password || "").trim();

    if (!/^\d{9}$/.test(studentId)) {
      return NextResponse.json({
        ok: false,
        message: "學號必須是 9 碼數字。",
      });
    }

    if (!password) {
      return NextResponse.json({
        ok: false,
        message: "請輸入密碼。",
      });
    }

    const userRes = await supabase
      .from("users")
      .select("student_id, password_hash")
      .eq("student_id", studentId)
      .limit(1);

    if (userRes.error) {
      return NextResponse.json({
        ok: false,
        message: "登入查詢失敗。",
        error: userRes.error.message,
      });
    }

    if (!userRes.data || userRes.data.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "查無此帳號，請先註冊。",
      });
    }

    const user = userRes.data[0];
    const passwordHash = hashPassword(password);

    if (user.password_hash !== passwordHash) {
      return NextResponse.json({
        ok: false,
        message: "密碼錯誤。",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "登入成功。",
      student_id: studentId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "登入 API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}