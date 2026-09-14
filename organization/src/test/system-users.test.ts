import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The All Users page listed four invented people and saved nothing.
 *
 * The real difficulty is that `users` has no branch or organisation column to
 * scope a query with — the relationship points the other way, from
 * `organizations.userId` and `branches.userId` at the login. These pin that
 * resolution down, and pin down that a write which touched no row is reported
 * as a failure rather than as success.
 */
type Row = Record<string, unknown>;

const rows: Record<string, Row[]> = {};
const calls: Array<{
  table: string;
  filters: Record<string, unknown>;
  ids?: unknown[];
  updated?: unknown;
  selected?: string;
}> = [];

function builder(table: string) {
  const call: (typeof calls)[number] = { table, filters: {} };
  calls.push(call);

  const chain: Record<string, unknown> = {
    select: (columns?: string) => {
      call.selected = columns;
      return chain;
    },
    update: (values: unknown) => {
      call.updated = values;
      return chain;
    },
    eq: (column: string, value: unknown) => {
      call.filters[column] = value;
      return chain;
    },
    is: (column: string, value: unknown) => {
      call.filters[column] = value;
      return chain;
    },
    in: (_column: string, values: unknown[]) => {
      call.ids = values;
      return chain;
    },
    order: () => chain,
    maybeSingle: () => Promise.resolve({ data: (rows[table] ?? [])[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve),
  };
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from: (table: string) => builder(table) },
  supabaseUrl: "https://project.supabase.co",
}));

const { getUsers, updateUser, deleteUser, SYSTEM_ROLES } = await import("@/lib/supabase/data");

const called = (table: string) => calls.find((call) => call.table === table);

beforeEach(() => {
  calls.length = 0;
  for (const key of Object.keys(rows)) delete rows[key];
});

describe("getUsers", () => {
  it("names the organisation's own admin", async () => {
    rows.organizations = [{ id: "o1", name: "Ideal Digiskills", userId: "u1" }];
    rows.branches = [];
    rows.users = [{ id: "u1", name: "Amar", email: "amar@x.com", role: "ORGANIZATION_ADMIN", userType: "ORGANIZATION" }];

    const { data } = await getUsers("o1", null);
    expect(data).toHaveLength(1);
    expect(data[0].organization).toBe("Ideal Digiskills");
    expect(data[0].branch).toBe("");
  });

  it("labels a branch login with the branch it runs", async () => {
    rows.organizations = [{ id: "o1", name: "Ideal Digiskills", userId: "u1" }];
    rows.branches = [{ id: "b1", name: "Patna Centre", userId: "u2" }];
    rows.users = [
      { id: "u2", name: "Sarah", email: "sarah@x.com", role: "BRANCH_ADMIN", userType: "BRANCH" },
    ];

    const { data } = await getUsers("o1", null);
    expect(data[0].branch).toBe("Patna Centre");
    expect(data[0].branchId).toBe("b1");
  });

  it("reads the users back by id, since there is no branch column to filter on", async () => {
    rows.organizations = [{ id: "o1", name: "Org", userId: "u1" }];
    rows.branches = [{ id: "b1", name: "Patna", userId: "u2" }];
    rows.users = [];

    await getUsers("o1", null);
    expect(called("users")?.ids).toEqual(["u1", "u2"]);
  });

  it("leaves out logins that have been removed", async () => {
    rows.organizations = [{ id: "o1", name: "Org", userId: "u1" }];
    rows.branches = [];
    rows.users = [];

    await getUsers("o1", null);
    expect(called("users")?.filters).toHaveProperty("deletedAt", null);
    expect(called("branches")?.filters).toHaveProperty("deletedAt", null);
  });

  it("scopes a branch admin to their own branch", async () => {
    rows.branches = [{ id: "b1", name: "Patna", userId: "u2" }];
    rows.users = [{ id: "u2", name: "Sarah", email: "s@x.com" }];

    await getUsers(null, "b1");
    expect(called("branches")?.filters).toMatchObject({ id: "b1" });
    // With no organisation in hand there is nothing to look an owner up by.
    expect(called("organizations")).toBeUndefined();
  });

  it("asks for nothing when no branch or organisation names a login", async () => {
    rows.branches = [];
    const { data } = await getUsers(null, null);
    expect(data).toEqual([]);
    expect(called("users")).toBeUndefined();
  });

  it("treats a login as active unless it was switched off", async () => {
    rows.organizations = [{ id: "o1", name: "Org", userId: "u1" }];
    rows.branches = [{ id: "b1", name: "Patna", userId: "u2" }];
    rows.users = [
      { id: "u1", name: "Amar", isActive: true },
      { id: "u2", name: "Sarah", isActive: false },
    ];

    const { data } = await getUsers("o1", null);
    expect(data.map((row) => row.isActive)).toEqual([true, false]);
  });
});

describe("updateUser", () => {
  it("saves the fields the form actually offers", async () => {
    rows.users = [{ id: "u1" }];
    await updateUser("u1", { name: " Sarah Smith ", phone: "9876543210", role: "ACCOUNTANT", isActive: false });

    expect(called("users")?.updated).toEqual({
      name: "Sarah Smith",
      phone: "9876543210",
      role: "ACCOUNTANT",
      isActive: false,
    });
    expect(called("users")?.filters).toEqual({ id: "u1" });
  });

  it("clears an emptied phone rather than storing a blank", async () => {
    rows.users = [{ id: "u1" }];
    // `users.phone` is unique, so two blanks would collide where two nulls do not.
    await updateUser("u1", { phone: "   " });
    expect(called("users")?.updated).toEqual({ phone: null });
  });

  it("reports failure when the write matched no row", async () => {
    rows.users = [];
    await expect(updateUser("u1", { name: "Sarah" })).rejects.toThrow(/not saved/i);
  });

  it("does not write at all when nothing was changed", async () => {
    await expect(updateUser("u1", {})).resolves.toEqual({ success: true });
    expect(calls).toHaveLength(0);
  });

  it("offers only roles the database will accept", () => {
    // The old form offered Admin, Manager and Employee; the enum has none of them.
    expect(SYSTEM_ROLES).toContain("BRANCH_ADMIN");
    expect(SYSTEM_ROLES).not.toContain("Manager");
  });
});

describe("deleteUser", () => {
  it("soft-deletes and switches the login off", async () => {
    rows.users = [{ id: "u1" }];
    await deleteUser("u1");
    expect(called("users")?.updated).toHaveProperty("deletedAt");
    expect(called("users")?.updated).toHaveProperty("isActive", false);
  });

  it("reports failure when the row was not removed", async () => {
    rows.users = [];
    await expect(deleteUser("u1")).rejects.toThrow(/not removed/i);
  });
});
