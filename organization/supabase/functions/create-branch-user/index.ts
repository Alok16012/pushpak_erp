/**
 * Creates the login for a branch.
 *
 * The browser only holds the anon key, and signing a new user up from there
 * would replace the admin's own session. So the account is created here with
 * the service-role key, which never leaves the server.
 *
 * Called from the Create Branch form via supabase.functions.invoke().
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_ROLES = ["SUPER_ADMIN", "ORGANIZATION_ADMIN"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Who is asking? Only an org-level admin may mint branch logins.
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json({ error: "Not signed in" }, 401);

  const { data: caller, error: callerError } = await admin.auth.getUser(jwt);
  if (callerError || !caller.user) return json({ error: "Not signed in" }, 401);

  const callerMeta = caller.user.user_metadata ?? {};
  if (!ADMIN_ROLES.includes(String(callerMeta.role ?? "").toUpperCase())) {
    return json({ error: "Only an organisation admin can create branch logins" }, 403);
  }

  // 2. Validate the request.
  const { branchId, username, password, name, email, phone } = await req.json().catch(() => ({}));
  if (!branchId || !username || !password) {
    return json({ error: "branchId, username and password are required" }, 400);
  }
  if (String(password).length < 6) {
    return json({ error: "Password must be at least 6 characters" }, 400);
  }

  // 3. The branch must exist inside the caller's own organisation.
  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("id, name, organizationId")
    .eq("id", branchId)
    .single();
  if (branchError || !branch) return json({ error: "Branch not found" }, 404);

  if (callerMeta.organizationId && branch.organizationId !== callerMeta.organizationId) {
    return json({ error: "That branch belongs to another organisation" }, 403);
  }

  // 4. The login page turns a bare username into <username>@pushpak.local, so
  //    the account has to be created under exactly that address.
  const loginEmail = String(username).includes("@")
    ? String(username).trim()
    : `${String(username).trim().toLowerCase()}@pushpak.local`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: String(password),
    email_confirm: true,
    user_metadata: {
      name: name || branch.name,
      role: "BRANCH_ADMIN",
      userType: "BRANCH",
      branchId: branch.id,
      organizationId: branch.organizationId,
      contactEmail: email || null,
      phone: phone || null,
    },
  });

  if (createError) return json({ error: createError.message }, 400);

  return json({ userId: created.user?.id, loginEmail, username: String(username).trim() });
});
