import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("attendance_records")
      .select("*, student:students(first_name, last_name, enrollment_no), batch:batches(name)");

    if (date) {
      // @ts-ignore generated types don't reflect actual DB column
      query = query.eq("date", date);
    }

    const { data: records, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by student
    const byStudent = new Map<string, any>();
    for (const record of (records ?? []) as any[]) {
      const sid = record.student_id;
      if (!byStudent.has(sid)) {
        byStudent.set(sid, {
          id: sid,
          firstName: record.student?.first_name ?? "",
          lastName: record.student?.last_name ?? "",
          enrollmentNo: record.student?.enrollment_no,
          course: null,
          batch: record.batch,
          attendance: [],
        });
      }
      byStudent.get(sid).attendance.push({ status: record.status, remarks: record.remarks });
    }

    return NextResponse.json(Array.from(byStudent.values()));
  } catch {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("branch_id")
      // @ts-ignore generated types don't reflect actual DB columns
      .eq("id", user.id)
      .single();

    const body = await request.json();
    const { date, records } = body;

    // Upsert attendance records
    const results = [];
    for (const record of records) {
      const payload = {
        student_id: record.studentId,
        branch_id: (profile as any)?.branch_id,
        date,
        status: record.status,
        marked_by_id: user.id,
      } as any;
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(payload, { onConflict: "student_id,date" })
        .select()
        .single();

      if (!error && data) results.push(data);
    }

    return NextResponse.json({ count: results.length });
  } catch {
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
