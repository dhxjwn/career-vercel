import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabase } from "@/lib/supabase";

function hashPassword(password: string) {
  return createHash("sha256").update(password.trim(), "utf8").digest("hex");
}

function isAscii(text: string) {
  return /^[\x00-\x7F]*$/.test(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const studentId = String(body.student_id || "").trim();
    const newPassword = String(body.password || "").trim();

    if (!/^\d{9}$/.test(studentId)) {
      return NextResponse.json({
        ok: false,
        message: "學號必須是 9 碼數字。",
      });
    }

    if (!newPassword) {
      return NextResponse.json({
        ok: false,
        message: "新密碼不能為空。",
      });
    }

    if (!isAscii(newPassword)) {
      return NextResponse.json({
        ok: false,
        message: "密碼請使用英文與數字，不要輸入中文或全形字元。",
      });
    }

    const userRes = await supabase
      .from("users")
      .select("student_id")
      .eq("student_id", studentId)
      .limit(1);

    if (userRes.error) {
      return NextResponse.json({
        ok: false,
        message: "查詢帳號失敗。",
        error: userRes.error.message,
      });
    }

    if (!userRes.data || userRes.data.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "查無此學號，請先註冊。",
      });
    }

    const passwordHash = hashPassword(newPassword);

    const updateRes = await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
      })
      .eq("student_id", studentId)
      .select("student_id");

    if (updateRes.error) {
      return NextResponse.json({
        ok: false,
        message: "密碼重設失敗。",
        error: updateRes.error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "密碼已重設，請使用新密碼登入。",
      student_id: studentId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "重設密碼 API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}