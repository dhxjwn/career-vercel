import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function deleteFromTable(table: string, studentId: string) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("student_id", studentId);

  if (error) {
    throw new Error(`${table} 刪除失敗：${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const studentId = String(body.student_id || "").trim();

    if (!studentId) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id。",
      });
    }

    // 1. 清除專案一聊天紀錄
    await deleteFromTable("messages", studentId);

    // 2. 清除整體分析狀態
    await deleteFromTable("analysis_status", studentId);

    // 3. 清除專案二角色報告資料
    await deleteFromTable("career_job_tasks", studentId);
    await deleteFromTable("career_job_skills", studentId);
    await deleteFromTable("career_job_plans", studentId);

    // 4. 清除職業聊天紀錄
    await deleteFromTable("career_chat_messages", studentId);

    // 5. 如果有聊天 KPI 紀錄表，也一起清
    // 如果你的 Supabase 沒有這張表，這段會失敗，所以先用 try 包住
    try {
      await deleteFromTable("career_chat_kpi_logs", studentId);
    } catch {
      // 沒有這張表就略過
    }

    // 6. 重置 progress
    const { data: progressRows, error: progressCheckError } = await supabase
      .from("progress")
      .select("student_id")
      .eq("student_id", studentId)
      .limit(1);

    if (progressCheckError) {
      throw new Error(`progress 查詢失敗：${progressCheckError.message}`);
    }

    const resetProgress = {
      student_id: studentId,
      topic1_count: 0,
      topic2_count: 0,
      topic3_count: 0,
      unlocked_topic: 1,
    };

    if (progressRows && progressRows.length > 0) {
      const { error } = await supabase
        .from("progress")
        .update({
          topic1_count: 0,
          topic2_count: 0,
          topic3_count: 0,
          unlocked_topic: 1,
        })
        .eq("student_id", studentId);

      if (error) {
        throw new Error(`progress 重置失敗：${error.message}`);
      }
    } else {
      const { error } = await supabase.from("progress").insert(resetProgress);

      if (error) {
        throw new Error(`progress 建立失敗：${error.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "重新調配完成，已清除所有探索紀錄與角色報告資料。",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "重新調配失敗。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}