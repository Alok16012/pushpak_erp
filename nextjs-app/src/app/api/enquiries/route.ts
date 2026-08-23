import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase.from("enquiries").select("*").order("created_at", { ascending: false });

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.branch_id) {
        query = query.eq("branch_id", profile.branch_id);
      } else if (profile?.organization_id) {
        query = query.eq("organization_id", profile.organization_id);
      }
    }

    const { data: enquiries, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(enquiries ?? []);
  } catch {
    return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
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
      .select("branch_id, organization_id")
      .eq("id", user.id)
      .single();

    const body = await request.json();

    const { data: enquiry, error } = await supabase
      .from("enquiries")
      .insert({
        ...body,
        branch_id: profile?.branch_id,
        organization_id: profile?.organization_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(enquiry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create enquiry" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });
    }

    const { data: enquiry, error } = await supabase
      .from("enquiries")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(enquiry);
  } catch {
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 });
  }
}
