#!/usr/bin/env node
/**
 * Reset / set the admin account password (one-off, run manually).
 *
 * WHY: Supabase stores passwords hashed — a lost password can't be read back, only
 * set fresh. This uses the service_role admin API to set a specific password on an
 * existing user (or create the user if missing) and to self-heal the admin role.
 *
 * NO SECRETS ARE STORED IN THIS FILE — everything comes from env vars at runtime, so
 * the file is safe to commit. The service_role key is full-access: never commit or
 * share it.
 *
 * Required env:
 *   SUPABASE_SERVICE_ROLE_KEY   Supabase Dashboard → Project Settings → API → service_role secret
 *   ADMIN_EMAIL                 e.g. portableofficecabin@gmail.com
 *   NEW_ADMIN_PASSWORD          min 6 chars
 * Optional env:
 *   SUPABASE_URL                defaults to the project URL below
 *
 * Run (PowerShell — use SINGLE quotes so special chars like # $ & % aren't mangled):
 *   $env:SUPABASE_SERVICE_ROLE_KEY='<service_role secret>'
 *   $env:ADMIN_EMAIL='portableofficecabin@gmail.com'
 *   $env:NEW_ADMIN_PASSWORD='<new password>'
 *   node scripts/reset-admin-password.mjs
 *
 * Run (bash):
 *   SUPABASE_SERVICE_ROLE_KEY='...' ADMIN_EMAIL='...' NEW_ADMIN_PASSWORD='...' \
 *     node scripts/reset-admin-password.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://qsrlfsjtuymuhvwnsegq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD;

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

// ── Validate inputs (never print the key or password) ────────────────────────
if (!SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY is not set. Get it from Supabase → Project Settings → API → service_role secret.");
if (!ADMIN_EMAIL) fail("ADMIN_EMAIL is not set (e.g. ADMIN_EMAIL=portableofficecabin@gmail.com).");
if (!NEW_PASSWORD) fail("NEW_ADMIN_PASSWORD is not set.");
if (NEW_PASSWORD.length < 6) fail("NEW_ADMIN_PASSWORD must be at least 6 characters (Supabase requirement).");

const email = ADMIN_EMAIL.trim().toLowerCase();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Find the user by email (v2 has no getUserByEmail → paginate listUsers) ────
async function findUserByEmail(targetEmail) {
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((u) => (u.email || "").trim().toLowerCase() === targetEmail);
    if (match) return match;
    if (users.length < perPage) break; // last page
  }
  return null;
}

async function main() {
  console.log(`→ Target: ${email}  @  ${SUPABASE_URL}`);

  // 1) Resolve or create the user, then set the password.
  let user = await findUserByEmail(email);
  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`✔ Password set for existing user ${email} (${user.id})`);
  } else {
    console.log(`… No user found for ${email}. Creating it.`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: NEW_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`✔ Created user ${email} (${user.id}) with the given password`);
  }

  // 2) Verify + self-heal the admin role (idx_single_admin → at most one admin row).
  const { data: adminRows, error: roleErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (roleErr) throw roleErr;

  const currentAdminId = adminRows?.[0]?.user_id || null;

  if (!currentAdminId) {
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (insErr && insErr.code !== "23505") throw insErr; // ignore race on the unique index
    console.log(`✔ Assigned admin role to ${email}`);
  } else if (currentAdminId === user.id) {
    console.log(`✔ ${email} already holds the admin role — nothing to change.`);
  } else {
    console.warn(
      `⚠ Password was set for ${email}, BUT the single admin role currently belongs to a\n` +
      `  DIFFERENT user (user_id=${currentAdminId}). This email will NOT have admin access.\n` +
      `  The idx_single_admin constraint allows only one admin. If ${email} SHOULD be the\n` +
      `  admin, first remove the existing admin row, then re-run this script:\n` +
      `    delete from public.user_roles where role = 'admin';`
    );
  }

  console.log("\nDone. Sign in at /admin/login with this email and the new password.");
}

main().catch((err) => fail(err?.message || String(err)));
