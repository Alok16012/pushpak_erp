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

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    const body = await request.json();
    const { amount, method } = body;

    // Generate receipt number
    const receiptNo = `RCT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const { data: payment, error } = await supabase
      .from("fee_payments")
      .insert({
        invoice_id: id,
        amount,
        method,
        receipt_no: receiptNo,
        received_by_id: profile?.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ receiptNo: payment.receipt_no, payment });
  } catch {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
