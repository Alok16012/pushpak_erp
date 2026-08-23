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
        course:courses(name, code, duration_value, duration_unit),
        batch:batches(name),
        branch:branches(name, address, city, state, pincode),
        fee_invoices(
          id,
          invoice_no,
          description,
          amount,
          due_date,
          status,
          payments(amount, paid_at, method)
        ),
        attendance_records(status, date)
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Transform to document format
    const totalBilled = (student.fee_invoices ?? []).reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    const totalPaid = (student.fee_invoices ?? []).reduce(
      (sum: number, inv: any) => sum + (inv.payments ?? []).reduce((pSum: number, p: any) => pSum + Number(p.amount), 0),
      0
    );

    const document = {
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        middleName: student.middle_name,
        email: student.email,
        phone: student.phone,
        gender: student.gender,
        dateOfBirth: student.date_of_birth,
        address: student.address,
        city: student.city,
        state: student.state,
        pincode: student.pincode,
        fatherName: student.father_name,
        motherName: student.mother_name,
        admissionDate: student.admission_date,
        enrollmentNo: student.enrollment_no,
        applicationNo: student.application_no,
        admissionStatus: student.admission_status,
      },
      course: student.course,
      batch: student.batch,
      branch: student.branch,
      fees: {
        totalBilled,
        totalPaid,
        invoices: student.fee_invoices,
      },
      attendance: student.attendance_records,
    };

    return NextResponse.json(document);
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
