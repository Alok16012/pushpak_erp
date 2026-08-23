import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;

    // Get student count
    let studentQuery = supabase.from("students").select("*", { count: "exact", head: true });
    if (orgId) studentQuery = studentQuery.eq("organization_id", orgId);
    const { count: students } = await studentQuery;

    // Get course count
    let courseQuery = supabase.from("courses").select("*", { count: "exact", head: true });
    if (orgId) courseQuery = courseQuery.eq("organization_id", orgId);
    const { count: courses } = await courseQuery;

    // Get fee stats
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().setDate(1)).toISOString().split("T")[0];

    let invoiceQuery = supabase.from("fee_invoices").select("amount, status, payments(amount)");
    if (orgId) {
      const { data: studentsForOrg } = await supabase.from("students").select("id").eq("organization_id", orgId);
      const studentIds = (studentsForOrg ?? []).map(s => s.id);
      if (studentIds.length) invoiceQuery = invoiceQuery.in("student_id", studentIds);
    }
    const { data: invoices } = await invoiceQuery;

    let feesCollected = 0;
    let outstanding = 0;
    for (const inv of invoices ?? []) {
      const paid = (inv.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const amount = Number(inv.amount);
      if (inv.status === "PAID") feesCollected += amount;
      else outstanding += Math.max(0, amount - paid);
    }

    // Enquiries today (from local collection for now)
    const enquiriesToday = 0;

    // Attendance percentage
    let attQuery = supabase.from("attendance_records").select("status");
    if (orgId) {
      const { data: studentsForOrg } = await supabase.from("students").select("id").eq("organization_id", orgId);
      const studentIds = (studentsForOrg ?? []).map(s => s.id);
      if (studentIds.length) attQuery = attQuery.in("student_id", studentIds);
    }
    attQuery = attQuery.gte("date", monthStart);
    const { data: attendanceRecords } = await attQuery;

    const attendancePercentage = attendanceRecords && attendanceRecords.length > 0
      ? Math.round((attendanceRecords.filter((r: any) => r.status === "PRESENT" || r.status === "LATE").length / attendanceRecords.length) * 100)
      : 0;

    return NextResponse.json({
      students: students ?? 0,
      courses: courses ?? 0,
      feesCollected,
      outstanding,
      attendancePercentage,
      enquiriesToday,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
