import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("visit_enquiries")
      .select("*")
      .order("visitDate", { ascending: false });

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.branch_id) {
        query = query.eq("branchId", profile.branch_id);
      } else if (profile?.organization_id) {
        query = query.eq("organization_id", profile.organization_id);
      }
    }

    const { data: visitors, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(visitors ?? []);
  } catch {
    return NextResponse.json({ error: "Failed to fetch visitors" }, { status: 500 });
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

    const { data: visitor, error } = await supabase
      .from("visit_enquiries")
      .insert({
        ...body,
        branchId: profile?.branch_id,
        organization_id: profile?.organization_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(visitor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create visitor" }, { status: 500 });
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
      return NextResponse.json({ error: "Visitor ID required" }, { status: 400 });
    }

    const { data: visitor, error } = await supabase
      .from("visit_enquiries")
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(visitor);
  } catch {
    return NextResponse.json({ error: "Failed to update visitor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Visitor ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("visit_enquiries")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete visitor" }, { status: 500 });
  }
}
