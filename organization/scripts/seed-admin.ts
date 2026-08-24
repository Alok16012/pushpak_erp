import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";
import { readFile } from "node:fs/promises";

// Read .env manually
const envPath = new URL("../.env", import.meta.url);
const envContent = await readFile(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const url = env.VITE_SUPABASE_URL!;
const anon = env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(url, anon);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("=== Pushpak ERP — Seed Super Admin ===\n");

  const email = await ask("Email: ");
  const password = await ask("Password (min 6 chars): ");
  const name = await ask("Full name: ");

  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  let userId: string | null = null;

  // 1. Try creating the auth user
  console.log("\nCreating auth user...");
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "SUPER_ADMIN",
        userType: "ORGANIZATION",
        organizationId: null,
        branchId: null,
      },
    },
  });

  if (authError) {
    if (
      authError.message.includes("already registered") ||
      authError.message.includes("User already registered")
    ) {
      console.log("User already exists in auth. Verifying password...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.error("Sign in failed. Wrong password?", signInError.message);
        process.exit(1);
      }
      userId = signInData.user.id;
      console.log("Signed in. User ID:", userId);
    } else {
      console.error("Auth error:", authError.message);
      process.exit(1);
    }
  } else {
    userId = authData.user!.id;
    console.log("Auth user created:", userId);
  }

  // 2. Upsert the users table entry
  console.log("\nUpserting users table entry...");
  const { error: userError } = await supabase.from("users").upsert(
    {
      id: userId!,
      email,
      name,
      role: "SUPER_ADMIN",
      userType: "ORGANIZATION",
      organizationId: null,
      branchId: null,
      isActive: true,
    },
    { onConflict: "id" }
  );

  if (userError) {
    console.error("users table error:", userError.message);
    console.log("\nAuth user was created, but users table upsert failed.");
    console.log("Check that the users table exists in Supabase.");
  } else {
    console.log("users table entry created/updated.");
  }

  // 3. Verify
  const { data: admins } = await supabase.from("users").select("*").eq("role", "SUPER_ADMIN");
  console.log("\nCurrent SUPER_ADMIN users:");
  console.table(admins);

  console.log("\nDone! You can now log in at /login");
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
