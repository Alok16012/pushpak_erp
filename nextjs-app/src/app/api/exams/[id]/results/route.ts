import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { results, publish } = body;

    // Upsert each result
    for (const result of results) {
      await supabase
        .from("exam_results")
        .upsert({
          exam_id: id,
          student_id: result.studentId,
          marks: result.marks,
          published: publish,
        }, { onConflict: "exam_id,student_id" });
    }

    // If publishing, update exam status
    if (publish) {
      await supabase
        .from("exams")
        .update({ status: "PUBLISHED" })
        .eq("id", id);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch {
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}
