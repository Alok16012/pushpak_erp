import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Try identifier as email first, then look up by username in profiles
    let email = identifier;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
      const { data: profileData } = await (supabase
        .from("profiles") as any)
        .select("email")
        .eq("username", identifier)
        .single();

      if (profileData?.email) {
        email = profileData.email;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Get profile
    // @ts-ignore generated types don't match actual DB columns
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name ?? data.user.email,
        role: profile?.role ?? "STAFF",
        organizationId: profile?.organization_id,
        branchId: profile?.branch_id,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
