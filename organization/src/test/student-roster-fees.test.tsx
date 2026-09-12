import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { StudentRoster } from "@/components/student/StudentRoster";
import type { StudentRosterRow } from "@/lib/supabase/data";

/**
 * The roster showed one money column — what the student had been invoiced —
 * and nothing about what had come in against it, so a fee collected from a
 * student left no mark on the page the branch actually works from.
 */
const student = (overrides: Partial<StudentRosterRow> = {}): StudentRosterRow => ({
  id: "s1",
  name: "Raj Shekhar",
  initials: "RS",
  address: "Patna, Bihar",
  mapQuery: "Patna, Bihar",
  admissionNo: "APP-2026-0003",
  admissionDate: "2026-09-11T00:00:00.000Z",
  course: "ADCA AI",
  courseCode: "ADCA-AI",
  courseFee: 2500,
  fatherName: "Ram Shekhar",
  fatherPhone: "+91 62057 86818",
  phone: "+91 62057 86818",
  whatsapp: "+91 62057 86818",
  email: "raj@example.com",
  fee: 2500,
  paid: 1000,
  balance: 1500,
  status: "Active",
  batch: "Not assigned",
  hasLogin: true,
  ...overrides,
});

const noop = () => undefined;

const roster = (rows: StudentRosterRow[]) =>
  render(
    <StudentRoster
      rows={rows}
      onView={noop}
      onEdit={noop}
      onDelete={noop}
      onExport={noop}
      onSetLogin={noop}
    />,
  );

describe("StudentRoster money columns", () => {
  it("shows what the course costs, what was paid and what is left", () => {
    roster([student()]);

    const row = screen.getByText("Raj Shekhar").closest("tr")!;
    expect(within(row).getByText("₹2,500")).toBeInTheDocument();
    expect(within(row).getByText("₹1,000")).toBeInTheDocument();
    expect(within(row).getByText("₹1,500")).toBeInTheDocument();

    for (const heading of ["Course fee", "Paid", "Balance"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  it("says a student is cleared rather than printing a zero balance", () => {
    roster([student({ paid: 2500, balance: 0 })]);

    const row = screen.getByText("Raj Shekhar").closest("tr")!;
    expect(within(row).getByText("Cleared")).toBeInTheDocument();
  });

  it("names the invoiced total apart from the course price when they differ", () => {
    // A student invoiced for less than the course lists: the office needs to
    // see both figures, or the row looks like the course fee is wrong.
    roster([student({ fee: 1800, courseFee: 2500, paid: 300, balance: 1500 })]);

    const row = screen.getByText("Raj Shekhar").closest("tr")!;
    expect(within(row).getByText("₹1,800")).toBeInTheDocument();
    expect(within(row).getByText(/invoiced · course ₹2,500/)).toBeInTheDocument();
  });

  it("prints the course as a name with its code under it, not as a bare tag", () => {
    roster([student()]);

    const row = screen.getByText("Raj Shekhar").closest("tr")!;
    expect(within(row).getByText("ADCA AI")).toBeInTheDocument();
    expect(within(row).getByText("ADCA-AI")).toBeInTheDocument();
  });

  it("leaves the code line out for a course that has none", () => {
    roster([student({ courseCode: "" })]);

    const row = screen.getByText("Raj Shekhar").closest("tr")!;
    expect(within(row).getByText("ADCA AI")).toBeInTheDocument();
    expect(within(row).queryByText("ADCA-AI")).toBeNull();
  });
});
