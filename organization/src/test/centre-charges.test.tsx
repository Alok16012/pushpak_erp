import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

/**
 * The head office sets, in one place, what every centre pays from its wallet
 * for an admission, an admit card, a marksheet and a certificate -- with a
 * centre's own rate where it differs. A centre sees its own rates only.
 */
const toast = vi.fn();
const saveCentreRates = vi.fn((..._a: unknown[]) => Promise.resolve());
let auth: Record<string, unknown> = {};
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/PageHeader", () => ({
  PageHeader: ({ actions }: { actions?: React.ReactNode }) => <div>{actions}</div>,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/supabase/data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/data")>("@/lib/supabase/data");
  return {
    CHARGE_ITEMS: actual.CHARGE_ITEMS,
    CHARGE_LABELS: actual.CHARGE_LABELS,
    effectiveRate: actual.effectiveRate,
    getBranches: () => Promise.resolve({ success: true, data: [{ id: "b1", name: "Begusarai Centre", code: "BGS" }, { id: "b2", name: "Patna Centre" }] }),
    getWalletsByOrg: () => Promise.resolve({ success: true, data: [{ branchId: "b1", balance: 750 }] }),
    getCentreRates: () =>
      Promise.resolve(new Map([["*", { CERTIFICATE: 100, MARKSHEET: 50 }], ["b1", { CERTIFICATE: 150 }]])),
    getCentreCharges: () =>
      Promise.resolve([{ id: "c1", branchId: "b1", item: "CERTIFICATE", amount: 150, chargedAt: "2026-10-15T10:00:00Z", chargedBy: "Centre", refKey: "s1" }]),
    saveCentreRates: (...a: unknown[]) => saveCentreRates(...a),
  };
});

const CentreCharges = (await import("@/pages/branch/CentreCharges")).default;

beforeEach(() => {
  toast.mockClear();
  saveCentreRates.mockClear();
});

describe("Centre Charges", () => {
  it("lets the head office set rates for all centres and for one", async () => {
    auth = { view: "admin", branchId: null, user: { name: "Head Office", organizationId: "org1" } };
    render(<MemoryRouter><CentreCharges /></MemoryRouter>);
    const allCert = await screen.findByLabelText("Certificate rate for all centres", {}, { timeout: 5000 });
    expect(allCert).toHaveValue("100");
    expect(await screen.findByText("₹750")).toBeInTheDocument();
    expect(screen.getByLabelText("Certificate rate for Begusarai Centre")).toHaveValue("150");
    // Patna has no rate of its own: empty, showing the all-centres one.
    expect(screen.getByLabelText("Certificate rate for Patna Centre")).toHaveValue("");
    expect(screen.getByLabelText("Certificate rate for Patna Centre")).toHaveAttribute("placeholder", "100");

    fireEvent.change(screen.getByLabelText("Admission rate for all centres"), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText("Marksheet rate for Patna Centre"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Certificate rate for Begusarai Centre"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Save charges/ }));

    await waitFor(() => expect(saveCentreRates).toHaveBeenCalledTimes(1));
    const [changes, by] = saveCentreRates.mock.calls[0] as [Array<Record<string, unknown>>, string];
    expect(by).toBe("Head Office");
    expect(changes).toEqual(
      expect.arrayContaining([
        { scope: "*", item: "ADMISSION", amount: 200 },
        { scope: "b2", item: "MARKSHEET", amount: 30 },
        { scope: "b1", item: "CERTIFICATE", amount: null },
      ]),
    );
    expect(changes).toHaveLength(3);
    expect(screen.getAllByText("−₹150").length).toBeGreaterThan(0);
  });

  it("shows a centre its own rates, read-only", async () => {
    auth = { view: "franchise", branchId: "b1", user: { name: "Centre", organizationId: "org1" } };
    render(<MemoryRouter><CentreCharges /></MemoryRouter>);
    expect(await screen.findByText("Your rates", {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("₹150")).toBeInTheDocument()); // its own certificate rate
    expect(screen.getByText("₹50")).toBeInTheDocument(); // the all-centres marksheet rate
    expect(screen.queryByRole("button", { name: /Save charges/ })).toBeNull();
    expect(screen.queryByText("Centre-wise rates")).toBeNull();
  });
});
