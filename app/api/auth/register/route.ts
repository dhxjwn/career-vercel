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
        message: "密碼不能為空。",
      });
    }

    if (!isAscii(password)) {
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
        message: "查詢使用者失敗。",
        error: userRes.error.message,
      });
    }

    if (userRes.data && userRes.data.length > 0) {
      return NextResponse.json({
        ok: false,
        message: "此學號已註冊，請直接登入。",
      });
    }

    const passwordHash = hashPassword(password);

    const insertUser = await supabase.from("users").insert({
      student_id: studentId,
      password_hash: passwordHash,
    });

    if (insertUser.error) {
      return NextResponse.json({
        ok: false,
        message: "註冊失敗。",
        error: insertUser.error.message,
      });
    }

    const progressRes = await supabase
      .from("progress")
      .select("student_id")
      .eq("student_id", studentId)
      .limit(1);

    if (!progressRes.data || progressRes.data.length === 0) {
      const insertProgress = await supabase.from("progress").insert({
        student_id: studentId,
        topic1_count: 0,
        topic2_count: 0,
        topic3_count: 0,
        unlocked_topic: 1,
      });

      if (insertProgress.error) {
        return NextResponse.json({
          ok: false,
          message: "使用者已建立，但初始化進度失敗。",
          error: insertProgress.error.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "註冊成功，請開始使用。",
      student_id: studentId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "註冊 API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}