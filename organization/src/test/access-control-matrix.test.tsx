import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

/**
 * Access Control is a matrix: for every page a role can reach, View plus Add,
 * Edit, Delete, Print, Export and Approve. Saving stores the pages as before
 * and the narrowed actions as permissions.
 */
const toast = vi.fn();
const updateRole = vi.fn((..._a: unknown[]) => Promise.resolve({ success: true }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/PageHeader", () => ({
  PageHeader: ({ actions }: { actions?: React.ReactNode }) => <div>{actions}</div>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "ORGANIZATION_ADMIN", organizationId: "org1" }, organizationId: "org1" }),
}));
vi.mock("@/lib/supabase/data", () => ({
  canManageUsers: () => true,
  getRoles: () =>
    Promise.resolve({
      success: true,
      data: [{ id: "r1", organizationId: "org1", name: "Accountant", description: "", baseRole: "ACCOUNTANT", modules: [], isSystem: true, permissions: {} }],
    }),
  updateRole: (...a: unknown[]) => updateRole(...a),
}));

const AccessControl = (await import("@/pages/user/AccessControl")).default;

beforeEach(() => {
  toast.mockClear();
  updateRole.mockClear();
});

describe("Access Control matrix", () => {
  it("narrows one page to view and print, and saves it", async () => {
    render(<MemoryRouter initialEntries={["/user/access-control?role=r1"]}><AccessControl /></MemoryRouter>);
    const view = await screen.findByLabelText("View Results & Marksheets", {}, { timeout: 5000 });
    expect(view).toBeChecked();
    expect(screen.getByLabelText("Delete on Results & Marksheets")).toBeChecked();

    for (const action of ["Create", "Edit", "Delete", "Export", "Approve"]) {
      fireEvent.click(screen.getByLabelText(`${action} on Results & Marksheets`));
    }
    expect(screen.getByLabelText("Delete on Results & Marksheets")).not.toBeChecked();
    expect(screen.getByLabelText("Print on Results & Marksheets")).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /Save permissions/ }));
    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1), { timeout: 5000 });
    const [id, input] = updateRole.mock.calls[0] as [string, { modules: string[]; permissions: Record<string, string[]> }];
    expect(id).toBe("r1");
    expect(input.modules).toEqual([]); // every page still open
    expect(input.permissions).toEqual({ "/exam/results": ["print"] });
  });

  it("ticks View along with an action on a page the role could not open", async () => {
    render(<MemoryRouter initialEntries={["/user/access-control?role=r1"]}><AccessControl /></MemoryRouter>);
    await screen.findByLabelText("View Results & Marksheets", {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("View Results & Marksheets")).not.toBeChecked();
    const create = screen.getByLabelText("Create on Results & Marksheets");
    expect(create).not.toBeDisabled();
    fireEvent.click(create);
    expect(screen.getByLabelText("View Results & Marksheets")).toBeChecked();
    expect(screen.getByLabelText("Create on Results & Marksheets")).toBeChecked();
  });

  it("makes a role view-only across the board", async () => {
    render(<MemoryRouter initialEntries={["/user/access-control?role=r1"]}><AccessControl /></MemoryRouter>);
    await screen.findByLabelText("View Results & Marksheets", {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "View only" }));
    expect(screen.getByLabelText("Create on Results & Marksheets")).not.toBeChecked();
    expect(screen.getByLabelText("View Results & Marksheets")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Save permissions/ }));
    await waitFor(() => expect(updateRole).toHaveBeenCalled());
    const [, input] = updateRole.mock.calls[0] as [string, { permissions: Record<string, string[]> }];
    expect(input.permissions["/exam/results"]).toEqual([]);
    expect(input.permissions["/fee/collection"]).toEqual([]);
  });
});
