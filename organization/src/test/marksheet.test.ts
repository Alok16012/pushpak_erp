import { describe, it, expect, vi } from "vitest";

import { marksheetSummary, type StudentDocument } from "@/lib/documents";

/** jsPDF's save() reaches for the browser, and it copies its API onto each
 *  instance, so an own `save` shadows a subclass method — reassign it after
 *  super() to keep the generator running headless. */
vi.mock("jspdf", async () => {
  const actual = await vi.importActual<typeof import("jspdf")>("jspdf");
  class Headless extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      (this as unknown as { save: unknown }).save = () => this;
    }
  }
  return { ...actual, jsPDF: Headless, default: Headless };
});

const { marksheetPdf } = await import("@/lib/documents");

const paper = (marks: number, maxMarks: number, passMarks: number, subject = "Paper") => ({
  marks,
  exam: { name: subject, subject, maxMarks, passMarks, examDate: "" },
});

describe("marksheetSummary", () => {
  it("totals the marks and the marks available", () => {
    const { total, max } = marksheetSummary([paper(33, 100, 33), paper(26, 50, 17)]);
    expect(total).toBe(59);
    expect(max).toBe(150);
  });

  it("passes a candidate who cleared every paper's own minimum", () => {
    expect(
      marksheetSummary([paper(33, 100, 33), paper(26, 50, 17), paper(239, 250, 150)]).result,
    ).toBe("Pass");
  });

  // The judgement the whole sheet turns on: a candidate can total far above the
  // sum of the minimums and still have failed a paper.
  it("fails a candidate who missed one paper, however high the total", () => {
    const { total, result } = marksheetSummary([
      paper(98, 100, 33),
      paper(10, 50, 17),
      paper(248, 250, 150),
    ]);
    expect(total).toBe(356);
    expect(result).toBe("Fail");
  });

  it("passes a candidate sitting exactly on the minimum", () => {
    expect(marksheetSummary([paper(33, 100, 33)]).result).toBe("Pass");
  });

  it("reports no results as awaited rather than as a fail", () => {
    expect(marksheetSummary([])).toEqual({ total: 0, max: 0, result: "Awaited" });
  });
});

/* ---------- the generator ---------- */

const base: StudentDocument = {
  firstName: "Krishna",
  lastName: "Singh",
  enrollmentNo: "IDS/2026/0003",
  applicationNo: "APP-2026-0003",
  admissionDate: "2026-09-11",
  branch: { name: "Patna Branch", phone: "", email: "", organization: { name: "Idealdigiskills" } },
  feeInvoices: [],
  examResults: [paper(33, 100, 33), paper(26, 50, 17)],
};

describe("marksheetPdf", () => {
  it("renders for a student with nothing configured beyond their name", async () => {
    // The bare sheet is the one that broke: with no heading lines the title
    // block was short and the particulars were drawn over the photograph.
    await expect(
      marksheetPdf({ ...base, enrollmentNo: undefined, examResults: [] }),
    ).resolves.toBeUndefined();
  });

  it("renders with every heading, a photograph and a logo supplied", async () => {
    const pixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await expect(
      marksheetPdf({
        ...base,
        photo: pixel,
        rollNo: "2201",
        fatherName: "Ram Singh",
        dateOfBirth: "12 Mar 2007",
        course: { name: "ADCA AI", code: "ADCA-AI" },
        branch: { ...base.branch, logo: pixel, address: "Kankarbagh, Patna" },
        awarding: {
          body: "Board of Examinations",
          scheme: "Computer Training Scheme",
          session: "Session 2026-27",
          examination: "Year 1 (Annual Examination)",
          examMonthYear: "Sep-2026",
          notes: ["Note: minimum pass marks are 33%."],
          signatory: "Controller of Examinations",
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("survives an image that will not decode, rather than losing the sheet", async () => {
    await expect(
      marksheetPdf({ ...base, photo: "data:image/png;base64,not-a-real-image" }),
    ).resolves.toBeUndefined();
  });

  it("runs a long list of papers onto further pages", async () => {
    const many = Array.from({ length: 40 }, (_, i) => paper(40, 50, 20, `Paper ${i + 1}`));
    await expect(marksheetPdf({ ...base, examResults: many })).resolves.toBeUndefined();
  });
});
