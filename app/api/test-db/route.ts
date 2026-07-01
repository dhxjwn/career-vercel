import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { count, error } = await supabase
      .from("analysis_status")
      .select("student_id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supabase 連線失敗",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase 連線成功",
      table: "analysis_status",
      count,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: "API 發生錯誤",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}