const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const typescript = require("typescript");

const filename = path.resolve(__dirname, "../app/(auth)/login/actions.ts");
const compiled = typescript.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText;

function setup(user, profile, authError = null, role = null, profileError = null) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-test-key";
  const filters = [];
  let tokenSeen = "";
  const database = {
    from(table) {
      return {
        select(fields) {
          assert.ok(fields === "is_active" || fields === "role");
          return this;
        },
        eq(field, value) { filters.push([table, field, value]); return this; },
        async maybeSingle() {
          if (table === "user_profiles") return { data: profile, error: profileError };
          if (table === "ats_user_roles") return { data: role, error: null };
          throw new Error("unexpected table");
        },
      };
    }
  };
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (name) => name === "@supabase/supabase-js" ? { createClient: (_url, key) => key === "public-test-key" ? { auth: { getUser: async (token) => { tokenSeen = token; return { data: { user }, error: authError }; } } } : database } : require(name);
  loaded._compile(compiled, filename);
  return { verify: loaded.exports.verifyRecruitmentProfileAction, filters, token: () => tokenSeen };
}

test("recruitment verifies the token before checking its own active profile", async () => {
  const helper = setup({ id: "11111111-1111-1111-1111-111111111111", email: "USER@example.test", email_confirmed_at: "2026-01-01" }, { is_active: true });
  assert.deepEqual(await helper.verify("verified-token"), { success: true });
  assert.equal(helper.token(), "verified-token");
  assert.deepEqual(helper.filters, [["user_profiles", "email", "user@example.test"]]);
});

test("recruitment allows an ATS admin when user_profiles is absent", async () => {
  const helper = setup({ id: "11111111-1111-1111-1111-111111111111", email: "admin@example.test", email_confirmed_at: "2026-01-01" }, null, null, { role: "admin" });
  assert.deepEqual(await helper.verify("token"), { success: true });
  assert.deepEqual(helper.filters, [["user_profiles", "email", "admin@example.test"], ["ats_user_roles", "user_id", "11111111-1111-1111-1111-111111111111"]]);
});

test("recruitment falls back to ATS roles when user_profiles lacks is_active", async () => {
  const helper = setup(
    { id: "11111111-1111-1111-1111-111111111111", email: "admin@example.test", email_confirmed_at: "2026-01-01" },
    null,
    null,
    { role: "admin" },
    { code: "42703", message: "column user_profiles.is_active does not exist" },
  );
  assert.deepEqual(await helper.verify("token"), { success: true });
});

test("recruitment rejects unexpected user_profiles database errors", async () => {
  const helper = setup(
    { id: "11111111-1111-1111-1111-111111111111", email: "admin@example.test", email_confirmed_at: "2026-01-01" },
    null,
    null,
    { role: "admin" },
    { code: "42501", message: "permission denied" },
  );
  assert.deepEqual(await helper.verify("token"), {
    success: false,
    message: "ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้ กรุณาลองใหม่",
  });
});

test("recruitment rejects invalid tokens, unverified emails, inactive profiles, and users without ATS roles", async () => {
  for (const [user, profile, authError] of [
    [null, null, new Error("invalid token")],
    [{ id: "1", email: "user@example.test" }, { is_active: true }, null],
    [{ id: "1", email: "user@example.test", email_confirmed_at: "2026-01-01" }, { is_active: false }, null],
    [{ id: "1", email: "user@example.test", email_confirmed_at: "2026-01-01" }, null, null],
  ]) assert.equal((await setup(user, profile, authError).verify("token")).success, false);
});