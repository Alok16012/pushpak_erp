import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The invoice is the document a student is asked to pay against, so the figures
 * on it have to be the ones they are actually being chased for. These read back
 * the strings the generator draws.
 */
const drawn: string[] = [];
const saved: string[] = [];

vi.mock("jspdf", async () => {
  const actual = await vi.importActual<typeof import("jspdf")>("jspdf");
  class Headless extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      const self = this as unknown as Record<string, unknown>;
      self.save = (name: string) => {
        saved.push(name);
        return this;
      };
      const text = this.text.bind(this);
      self.text = (value: unknown, ...rest: unknown[]) => {
        drawn.push(String(value));
        return (text as (...a: unknown[]) => unknown)(value, ...rest);
      };
    }
  }
  return { ...actual, jsPDF: Headless, default: Headless };
});

const { feeInvoicePdf } = await import("@/lib/documents");

const future = new Date(Date.now() + 30 * 86400000).toISOString();
const past = new Date(Date.now() - 30 * 86400000).toISOString();

const invoice = (overrides: Partial<Parameters<typeof feeInvoicePdf>[0]> = {}) =>
  feeInvoicePdf({
    invoiceNo: "INV-1001",
    issuedOn: past,
    dueDate: future,
    billTo: { name: "Raj Shekhar", rollNo: "ADM-24-001", course: "ADCA AI" },
    items: [{ description: "Course fee", amount: 25000 }],
    paidAmount: 0,
    ...overrides,
  });

beforeEach(() => {
  drawn.length = 0;
  saved.length = 0;
});

describe("feeInvoicePdf", () => {
  it("bills the party it was raised against", () => {
    invoice();
    expect(drawn).toContain("Raj Shekhar");
    expect(drawn).toContain("Roll no. ADM-24-001");
    expect(drawn).toContain("ADCA AI");
    expect(drawn).toContain("INV-1001");
  });

  it("asks for the whole amount when nothing has been paid", () => {
    invoice();
    expect(drawn).toContain("UNPAID");
    // Subtotal, total and balance due all read the same figure.
    expect(drawn.filter((text) => text === "INR 25,000").length).toBeGreaterThanOrEqual(3);
  });

  it("nets off what has already been received", () => {
    invoice({ paidAmount: 10000 });
    expect(drawn).toContain("- INR 10,000");
    expect(drawn).toContain("INR 15,000");
    expect(drawn).toContain("PART PAID");
  });

  it("settles at zero rather than going negative on an overpayment", () => {
    invoice({ paidAmount: 30000 });
    expect(drawn).toContain("PAID IN FULL");
    expect(drawn).toContain("INR 0");
  });

  it("calls an unpaid invoice overdue only once its due date has passed", () => {
    invoice({ dueDate: past });
    expect(drawn).toContain("OVERDUE");
  });

  it("does not call a settled invoice overdue", () => {
    invoice({ dueDate: past, paidAmount: 25000 });
    expect(drawn).toContain("PAID IN FULL");
    expect(drawn).not.toContain("OVERDUE");
  });

  it("totals several line items", () => {
    invoice({ items: [
      { description: "Course fee", amount: 25000 },
      { description: "Exam fee", amount: 2500 },
    ] });
    expect(drawn).toContain("Exam fee");
    expect(drawn).toContain("INR 27,500");
  });

  it("applies a discount and a late fee to the total", () => {
    invoice({ discount: 5000, lateFee: 500 });
    expect(drawn).toContain("- INR 5,000");
    expect(drawn).toContain("INR 20,500");
  });

  it("lists the receipts booked against it", () => {
    invoice({
      paidAmount: 10000,
      payments: [{ receiptNo: "RCPT-9", paidAt: past, method: "BANK_TRANSFER", amount: 10000 }],
    });
    expect(drawn).toContain("RCPT-9");
    // The stored method is an enum; it is not shown to a payer underscored.
    expect(drawn).toContain("BANK TRANSFER");
  });

  it("marks a payment that has no receipt number yet as provisional", () => {
    invoice({ paidAmount: 1000, payments: [{ paidAt: past, method: "CASH", amount: 1000 }] });
    expect(drawn).toContain("Provisional");
  });

  it("names the file after the invoice", () => {
    invoice();
    expect(saved).toEqual(["invoice-INV-1001.pdf"]);
  });
});
