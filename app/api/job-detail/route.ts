import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("student_id")?.trim();
    const jobName = request.nextUrl.searchParams.get("job_name")?.trim();

    if (!studentId || !jobName) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id 或 job_name",
        skills: [],
        tasks: [],
      });
    }

    const skillsRes = await supabase
      .from("career_job_skills")
      .select(`
        skill_name,
        skill_type,
        score,
        max_score,
        ai_reason,
        suggestion
      `)
      .eq("student_id", studentId)
      .eq("job_name", jobName)
      .order("id");

    if (skillsRes.error) {
      return NextResponse.json(
        {
          ok: false,
          message: "讀取能力值失敗",
          error: skillsRes.error.message,
          skills: [],
          tasks: [],
        },
        { status: 500 }
      );
    }

    const tasksRes = await supabase
      .from("career_job_tasks")
      .select(`
        task_title,
        task_stage,
        task_type,
        task_score,
        is_completed
      `)
      .eq("student_id", studentId)
      .eq("job_name", jobName)
      .order("id");

    if (tasksRes.error) {
      return NextResponse.json(
        {
          ok: false,
          message: "讀取任務失敗",
          error: tasksRes.error.message,
          skills: [],
          tasks: [],
        },
        { status: 500 }
      );
    }

    const skills = (skillsRes.data || [])
      .map((row) => ({
        skill_name: String(row.skill_name || "").trim(),
        skill_type: String(row.skill_type || "").trim(),
        score: toNumber(row.score, 0),
        max_score: toNumber(row.max_score, 10),
        ai_reason: String(row.ai_reason || "").trim(),
        suggestion: String(row.suggestion || "").trim(),
      }))
      .filter((item) => item.skill_name);

    const tasks = (tasksRes.data || [])
      .map((row) => ({
        task_title: String(row.task_title || "").trim(),
        task_stage: String(row.task_stage || "").trim(),
        task_type: String(row.task_type || "").trim(),
        task_score: toNumber(row.task_score, 1),
        is_completed: Boolean(row.is_completed),
      }))
      .filter((item) => item.task_title);

    return NextResponse.json({
      ok: true,
      message: "讀取職業詳細資料成功",
      job_name: jobName,
      skills,
      tasks,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "job-detail API 發生錯誤",
        error: err instanceof Error ? err.message : String(err),
        skills: [],
        tasks: [],
      },
      { status: 500 }
    );
  }
}