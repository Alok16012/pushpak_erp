import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name ?? user.email,
        role: profile?.role ?? "STAFF",
        organizationId: profile?.organization_id,
        branchId: profile?.branch_id,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
