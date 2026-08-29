import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if any user exists in profiles
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return NextResponse.json({ message: "Bootstrap already completed" }, { status: 400 });
    }

    // Create admin user via auth
    const adminEmail = "admin@idealdigiskills.com";
    const adminPassword = "admin123";
    const adminUsername = "admin";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          email: adminEmail,
          username: adminUsername,
        },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create admin user" }, { status: 500 });
    }

    const adminUserId = authData.user.id;

    // Create organization
    const orgPayload: any = {
      name: "Idealdigiskills",
      slug: "idealdigiskills",
      settings: {},
    };
    const { data: org, error: orgError } = await (supabase
      .from("organizations")
      .insert(orgPayload)
      .select()
      .single() as unknown as { data: any; error: any });

    if (orgError || !org) {
      return NextResponse.json({ error: orgError?.message || "Failed to create organization" }, { status: 500 });
    }

    // Create branch
    const { data: branch, error: branchError } = await (supabase
      .from("branches")
      // @ts-ignore bootstrap payload bypasses generated Insert type
      .insert({
        organization_id: org.id,
        name: "Main Branch",
        code: "MAIN",
        address: "",
        is_headquarters: true,
      })
      .select()
      .single() as unknown as { data: any; error: any });

    if (branchError || !branch) {
      return NextResponse.json({ error: branchError?.message || "Failed to create branch" }, { status: 500 });
    }

    // Create admin profile
    // @ts-ignore bootstrap payload bypasses generated Insert type
    const { error: profileError } = await (supabase
      .from("profiles")
      .insert({
        id: adminUserId,
        organization_id: org.id,
        branch_id: branch.id,
        email: adminEmail,
        username: adminUsername,
        full_name: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        is_active: true,
      })
      .select()
      .single() as unknown as { data: any; error: any });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Create branch admin user
    const { data: branchAdminAuth, error: branchAdminAuthError } = await supabase.auth.signUp({
      email: "branchadmin@idealdigiskills.com",
      password: adminPassword,
      options: {
        data: {
          email: "branchadmin@idealdigiskills.com",
          username: "branchadmin",
        },
      },
    });

    if (branchAdminAuthError || !branchAdminAuth.user) {
      return NextResponse.json({ error: branchAdminAuthError?.message || "Failed to create branch admin" }, { status: 500 });
    }

    // Create branch admin profile
    // @ts-ignore bootstrap payload bypasses generated Insert type
    const { error: branchAdminProfileError } = await (supabase
      .from("profiles")
      .insert({
        id: branchAdminAuth.user.id,
        organization_id: org.id,
        branch_id: branch.id,
        email: "branchadmin@idealdigiskills.com",
        username: "branchadmin",
        full_name: "Branch Admin",
        role: "BRANCH_ADMIN",
        status: "ACTIVE",
        is_active: true,
      })
      .select()
      .single() as unknown as { data: any; error: any });

    if (branchAdminProfileError) {
      return NextResponse.json({ error: branchAdminProfileError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Bootstrap completed",
      admin: { username: adminUsername, email: adminEmail },
      branchAdmin: { username: "branchadmin", email: "branchadmin@idealdigiskills.com" },
      organization: { id: org.id, name: org.name },
      branch: { id: branch.id, name: branch.name },
    });
  } catch (error) {
    return NextResponse.json({ error: "Bootstrap failed" }, { status: 500 });
  }
}
