import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * When a visitor left.
 *
 * `visit_enquiries.check_out` was read, shown in the log and written into the
 * CSV -- but no screen could ever set it. The front desk could check somebody
 * in and never out, so "On premises" only counted up and the column was empty
 * on every row the office had ever exported.
 */
const toast = vi.fn();
const updateEnquiry = vi.fn();
const getEnquiries = vi.fn();

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", role: "BRANCH_ADMIN", organizationId: "org1", branchId: "b1" },
    organizationId: "org1",
    branchId: "b1",
    view: "franchise",
  }),
}));
vi.mock("@/lib/supabase/data", () => ({
  getEnquiries: (...args: unknown[]) => getEnquiries(...(args as [])),
  updateEnquiry: (...args: unknown[]) => updateEnquiry(...(args as [])),
  createEnquiry: vi.fn(),
  deleteEnquiry: vi.fn(),
  getBranches: () => Promise.resolve({ success: true, data: [{ id: "b1", name: "Main" }] }),
}));

const EnquiriesWorkspace = (await import("@/pages/reception/EnquiriesWorkspace")).default;

/** One visitor, checked in at 10:00 this morning and still inside. */
const arrival = new Date();
arrival.setHours(10, 0, 0, 0);

const VISITOR = {
  id: "vis-1",
  branchId: "b1",
  visitorName: "Sunita Rao",
  phone: "9822041100",
  purpose: "ADMISSION",
  personToMeet: "Reception",
  department: "ADMINISTRATION",
  status: "NEW",
  visitDate: arrival.toISOString(),
  visitTime: "10:00",
  createdAt: arrival.toISOString(),
  check_out: null,
};

const open = () => render(<MemoryRouter><EnquiriesWorkspace /></MemoryRouter>);

const rowMenu = async () => {
  const row = (await screen.findAllByText("Sunita Rao"))[0].closest("tr")!;
  const trigger = within(row).getAllByRole("button").at(-1)!;
  fireEvent.keyDown(trigger, { key: "Enter" });
};

beforeEach(() => {
  toast.mockClear();
  updateEnquiry.mockReset();
  updateEnquiry.mockResolvedValue({ success: true, data: {} });
  getEnquiries.mockResolvedValue({ success: true, data: [VISITOR] });
});

describe("checking a visitor out", () => {
  it("counts a visitor who has not been stamped out as still on the premises", async () => {
    open();
    await waitFor(() => expect(getEnquiries).toHaveBeenCalled());
    const tile = screen.getByText("On premises").closest("div")!;
    expect(within(tile).getByText("1")).toBeInTheDocument();
  });

  it("stamps the time they left, and closes the visit with it", async () => {
    open();
    await rowMenu();
    fireEvent.click(await screen.findByText("Check out now"));

    // The dialog opens on now, which is the answer most of the time.
    const field = (await screen.findByLabelText(/out time/i)) as HTMLInputElement;
    expect(field.value).not.toBe("");
    fireEvent.change(field, { target: { value: "2026-09-16T15:30" } });
    fireEvent.click(screen.getByRole("button", { name: /save out time/i }));

    await waitFor(() => expect(updateEnquiry).toHaveBeenCalled());
    const [, , payload] = updateEnquiry.mock.calls[0] as [string, string, Record<string, unknown>];
    // snake_case, as the live schema spells it, and a visit that is over.
    expect(payload.check_out).toBe(new Date("2026-09-16T15:30").toISOString());
    expect(payload.status).toBe("CLOSED");
  });

  it("takes a check-out back off, for one stamped by mistake", async () => {
    getEnquiries.mockResolvedValue({
      success: true,
      data: [{ ...VISITOR, check_out: new Date().toISOString(), status: "CLOSED" }],
    });
    open();
    await rowMenu();
    fireEvent.click(await screen.findByText("Clear check-out"));

    await waitFor(() => expect(updateEnquiry).toHaveBeenCalled());
    const [, , payload] = updateEnquiry.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(payload.check_out).toBeNull();
    // Clearing it must not quietly reopen a visit that was completed on purpose.
    expect(payload).not.toHaveProperty("status");
  });
});
