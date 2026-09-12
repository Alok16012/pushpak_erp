import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { canManageCourses } from "@/lib/roles";
import { canAccess } from "@/lib/navigation";

/**
 * Courses belong to the organisation; `branch_courses` decides which of them a
 * branch may run. The navigation already drew that line — no "Create Course"
 * item in the franchise menu, and `/course/create` outside its allow-list — but
 * Courses & batches offered a "New course" button to everyone, and it opened
 * the form inline. The one route the guard protected could be walked around
 * from the page it was protecting.
 */
describe("canManageCourses", () => {
  it("lets the organisation write its own catalogue", () => {
    expect(canManageCourses("SUPER_ADMIN")).toBe(true);
    expect(canManageCourses("ORGANIZATION_ADMIN")).toBe(true);
  });

  it("keeps every branch role out of it", () => {
    for (const role of ["BRANCH_ADMIN", "FRANCHISE", "ACCOUNTANT", "RECEPTIONIST", "TEACHER", "STAFF"]) {
      expect(canManageCourses(role), `${role} must not write courses`).toBe(false);
    }
  });

  it("refuses an unknown or missing role rather than assuming the widest one", () => {
    expect(canManageCourses(undefined)).toBe(false);
    expect(canManageCourses("")).toBe(false);
    expect(canManageCourses("SOMETHING_NEW")).toBe(false);
  });

  it("agrees with the route guard, which is the other half of the same rule", () => {
    expect(canAccess("franchise", "/course/create")).toBe(false);
    expect(canAccess("franchise", "/course/view")).toBe(true);
    // A branch still owns its own cohorts.
    expect(canAccess("franchise", "/course/batch/create")).toBe(true);
  });
});

/* ---------- the page ---------- */

const role = { current: "FRANCHISE" };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: role.current, organizationId: "org1", branchId: "b1" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/supabase/data", () => ({
  getCourses: () => Promise.resolve({ success: true, data: [] }),
  getBatches: () => Promise.resolve({ success: true, data: [] }),
  getBatchesByOrg: () => Promise.resolve({ success: true, data: [] }),
  getBranches: () => Promise.resolve({ success: true, data: [] }),
  createCourse: vi.fn(),
  createBatch: vi.fn(),
}));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: "/course/view" }) }));

const AcademicsWorkspace = (await import("@/pages/course/AcademicsWorkspace")).default;

describe("Courses & batches actions", () => {
  it("offers a branch its batches but not the catalogue", () => {
    role.current = "FRANCHISE";
    render(<AcademicsWorkspace />);

    expect(screen.queryByRole("button", { name: /new course/i })).toBeNull();
    // Import writes courses, so it goes the same way.
    expect(screen.queryByRole("button", { name: /^import$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /new batch/i })).toBeInTheDocument();
    // Export only reads; a branch keeps it.
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("leaves the organisation admin every action", () => {
    role.current = "ORGANIZATION_ADMIN";
    render(<AcademicsWorkspace />);

    expect(screen.getByRole("button", { name: /new course/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^import$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new batch/i })).toBeInTheDocument();
  });

  it("tells a branch where its courses come from instead of pointing at a button it cannot see", async () => {
    role.current = "FRANCHISE";
    render(<AcademicsWorkspace />);

    expect(await screen.findByText(/assigned to this branch/i)).toBeInTheDocument();
  });
});
