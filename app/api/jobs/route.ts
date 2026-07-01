import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function parseJsonList(value: unknown): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("student_id")?.trim();

    if (!studentId) {
      return NextResponse.json({
        ok: false,
        message: "缺少 student_id",
        jobs: [],
      });
    }

    const { data, error } = await supabase
      .from("career_job_plans")
      .select(`
        job_name,
        short_term,
        mid_term,
        long_term,
        course_resources,
        workshop_resources,
        cert_resources,
        career_center_resources
      `)
      .eq("student_id", studentId)
      .order("id");

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "讀取職業規劃失敗",
          error: error.message,
          jobs: [],
        },
        { status: 500 }
      );
    }

    const jobs = (data || []).map((row) => ({
      job_name: String(row.job_name || "").trim(),
      short_term: String(row.short_term || "").trim(),
      mid_term: String(row.mid_term || "").trim(),
      long_term: String(row.long_term || "").trim(),
      course_resources: parseJsonList(row.course_resources),
      workshop_resources: parseJsonList(row.workshop_resources),
      cert_resources: parseJsonList(row.cert_resources),
      career_center_resources: parseJsonList(row.career_center_resources),
    }));

    return NextResponse.json({
      ok: true,
      message: "讀取職業規劃成功",
      jobs,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "jobs API 發生錯誤",
        error: err instanceof Error ? err.message : String(err),
        jobs: [],
      },
      { status: 500 }
    );
  }
}