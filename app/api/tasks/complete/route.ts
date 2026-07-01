import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function getStageBonus(stage: string) {
  const value = String(stage || "").trim().toLowerCase();

  if (value === "short") return 0.5;
  if (value === "mid") return 1.0;
  if (value === "long") return 1.5;

  return 0;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const studentId = String(body.student_id || "").trim();
    const jobName = String(body.job_name || "").trim();
    const taskTitle = String(body.task_title || "").trim();

    if (!studentId || !jobName || !taskTitle) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id、job_name 或 task_title。",
      });
    }

    const taskRes = await supabase
      .from("career_job_tasks")
      .select("task_title, task_stage, task_score, is_completed")
      .eq("student_id", studentId)
      .eq("job_name", jobName)
      .eq("task_title", taskTitle)
      .limit(1);

    if (taskRes.error) {
      return NextResponse.json(
        {
          ok: false,
          message: "查詢任務失敗。",
          error: taskRes.error.message,
        },
        { status: 500 }
      );
    }

    const task = taskRes.data?.[0];

    if (!task) {
      return NextResponse.json({
        ok: false,
        message: "找不到這筆任務，可能資料不同步。",
      });
    }

    if (task.is_completed) {
      return NextResponse.json({
        ok: false,
        message: "這個任務已經完成過了。",
      });
    }

    const updateTaskRes = await supabase
      .from("career_job_tasks")
      .update({
        is_completed: true,
      })
      .eq("student_id", studentId)
      .eq("job_name", jobName)
      .eq("task_title", taskTitle)
      .select("task_title, task_stage, is_completed");

    if (updateTaskRes.error) {
      return NextResponse.json(
        {
          ok: false,
          message: "更新任務狀態失敗。",
          error: updateTaskRes.error.message,
        },
        { status: 500 }
      );
    }

    const bonus = getStageBonus(String(task.task_stage || ""));

    if (bonus <= 0) {
      return NextResponse.json({
        ok: true,
        message: `已完成任務：${taskTitle}`,
        bonus: 0,
        updated_skill_count: 0,
      });
    }

    const skillsRes = await supabase
      .from("career_job_skills")
      .select("skill_name, score, max_score")
      .eq("student_id", studentId)
      .eq("job_name", jobName);

    if (skillsRes.error) {
      return NextResponse.json({
        ok: true,
        message: `已完成任務：${taskTitle}，但讀取能力值加分時失敗。`,
        bonus,
        updated_skill_count: 0,
        warning: skillsRes.error.message,
      });
    }

    const skills = skillsRes.data || [];
    let updatedSkillCount = 0;

    for (const skill of skills) {
      const skillName = String(skill.skill_name || "").trim();

      if (!skillName) continue;

      const oldScore = toNumber(skill.score, 0);
      const maxScore = toNumber(skill.max_score, 10);
      const newScore = Math.min(oldScore + bonus, maxScore);

      const updateSkillRes = await supabase
        .from("career_job_skills")
        .update({
          score: newScore,
        })
        .eq("student_id", studentId)
        .eq("job_name", jobName)
        .eq("skill_name", skillName);

      if (!updateSkillRes.error) {
        updatedSkillCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `已完成任務：${taskTitle}`,
      bonus,
      updated_skill_count: updatedSkillCount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "complete task API 發生錯誤。",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}