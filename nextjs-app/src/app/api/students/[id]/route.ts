import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: student, error } = await supabase
      .from("students")
      .select(`
        *,
        course:courses(name),
        batch:batches(name),
        branch:branches(name),
        fee_invoices(
          id,
          description,
          amount,
          due_date,
          status,
          payments(amount, reversed_at)
        ),
        attendance_records(status, date)
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
