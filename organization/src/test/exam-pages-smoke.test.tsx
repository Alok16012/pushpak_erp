import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

/**
 * Every exam workflow page opens on its data, and the certificate page issues
 * on a passed final result -- charging through issueCertificate with the
 * dates -- then prints in the institute's own format.
 */
const toast = vi.fn();
let walletBalance = 500;
const issueCertificate = vi.fn((..._args: unknown[]) => Promise.resolve({ charged: true, alreadyIssued: false, amount: 150, certificateNo: "CERT-E001" }));
const printFromTemplate = vi.fn((..._args: unknown[]) => Promise.resolve(true));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ view: "admin", user: { id: "u1", name: "Head Office", role: "SUPER_ADMIN", organizationId: "org1", branchId: null } }),
}));
vi.mock("@/lib/studentTemplateDocument", () => ({ printFromTemplate: (...a: unknown[]) => printFromTemplate(...a), photoOf: () => "" }));
vi.mock("@/lib/documents", () => ({ certificatePdf: vi.fn(), marksheetPdf: vi.fn(), marksheetSummary: () => ({ result: "Pass" }) }));
vi.mock("@/lib/supabase/data", () => ({
  getBranches: () => Promise.resolve({ success: true, data: [{ id: "b1", name: "Begusarai Centre" }] }),
  getCourses: () => Promise.resolve({ success: true, data: [{ id: "c1", name: "ADCA", durationMonths: 12 }] }),
  getSessionYears: () => Promise.resolve({ success: true, data: [{ name: "2026-2027" }] }),
  getStudentPicklist: () =>
    Promise.resolve({
      success: true,
      data: [{ id: "s1", branchId: "b1", courseId: "c1", firstName: "Ram", lastName: "Kumar", enrollmentNo: "E001", phone: "9999" }],
    }),
  getStudentDocument: () => Promise.resolve({ data: { branchId: "b1", course: { name: "ADCA" }, branch: { name: "Begusarai Centre", organization: { name: "Org" } }, examResults: [] } }),
  getCertificateFees: () => Promise.resolve(new Map([["b1", 150]])),
  getWallet: () => Promise.resolve({ success: true, data: { balance: walletBalance } }),
  issueCertificate: (...a: unknown[]) => issueCertificate(...a),
}));
vi.mock("@/lib/supabase/examWorkflow", () => ({
  getExamCentres: () => Promise.resolve([{ id: "ec1", name: "Main Hall", code: "MH", address: "Begusarai" }]),
  saveExamCentre: vi.fn(),
  deleteExamCentre: vi.fn(),
  getCourseSubjects: () =>
    Promise.resolve([{ id: "x1", courseId: "c1", term: 1, code: "A01", name: "Web Design", subjectType: "BOTH", theoryMax: 100, theoryMin: 35, practicalMax: 50, practicalMin: 20, sortOrder: 1 }]),
  saveCourseSubject: vi.fn(),
  deleteCourseSubject: vi.fn(),
  reorderCourseSubjects: vi.fn(),
  setCourseTerms: vi.fn(),
  subjectProblem: () => null,
  getExamSchedules: () =>
    Promise.resolve([{ id: "sch1", branchId: "b1", courseId: "c1", term: 1, session: "2026-2027", examCentreId: "ec1", items: [{ subjectId: "x1", date: "2026-11-01", time: "10:00" }], updatedAt: "" }]),
  saveExamSchedule: vi.fn(),
  deleteExamSchedule: vi.fn(),
  getAdmitCards: () =>
    Promise.resolve([{ id: "a1", studentId: "s1", branchId: "b1", courseId: "c1", term: 1, session: "2026-2027", rollNo: "R1001", examCentreId: "ec1", scheduleId: "sch1", isFinal: true, issuedAt: "" }]),
  saveAdmitCard: vi.fn(),
  deleteAdmitCard: vi.fn(),
  getMarksheets: () =>
    Promise.resolve([{ id: "m1", studentId: "s1", branchId: "b1", courseId: "c1", term: 1, session: "2026-2027", issueDate: "2026-11-20", marks: [], totalObtained: 120, totalMax: 150, percentage: 80, grade: "A", result: "PASS", isFinal: true, marksheetNo: "MS-E001-1", updatedAt: "" }]),
  getIssuedCertificates: () => Promise.resolve([]),
}));

const page = async (path: string) => (await import(path)).default;

beforeEach(() => {
  walletBalance = 500;
  toast.mockClear();
  issueCertificate.mockClear();
  printFromTemplate.mockClear();
});

describe("exam workflow pages", () => {
  it("lists exam centres", async () => {
    const ExamCentres = await page("@/pages/exam/ExamCentres");
    render(<MemoryRouter><ExamCentres /></MemoryRouter>);
    expect((await screen.findAllByText("Main Hall")).length).toBeGreaterThan(0);
    expect(screen.getByText("Add exam centre")).toBeInTheDocument();
  });

  it("lists schedules with their centre, course and term", async () => {
    const ExamSchedule = await page("@/pages/exam/ExamSchedule");
    render(<MemoryRouter><ExamSchedule /></MemoryRouter>);
    const table = await screen.findByText("Schedules");
    expect(table).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Begusarai Centre").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Full Course").length).toBeGreaterThan(0);
  });

  it("lists issued admit cards", async () => {
    const AdmitCards = await page("@/pages/exam/AdmitCards");
    render(<MemoryRouter><AdmitCards /></MemoryRouter>);
    expect((await screen.findAllByText("R1001")).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByText("Ram Kumar").length).toBeGreaterThan(0));
  });

  it("shows a course's subjects", async () => {
    const CourseSubjects = await page("@/pages/exam/CourseSubjects");
    render(<MemoryRouter><CourseSubjects /></MemoryRouter>);
    const label = Array.from(document.querySelectorAll("label")).find((el) => el.textContent === "Course")!;
    await waitFor(() => expect(within(label.parentElement!).getByRole("combobox")).toBeInTheDocument());
    fireEvent.keyDown(within(label.parentElement!).getByRole("combobox"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: /ADCA/ }));
    expect(await screen.findByText("Web Design")).toBeInTheDocument();
    expect(screen.getByText("35 / 100")).toBeInTheDocument();
    expect(screen.getByText("20 / 50")).toBeInTheDocument();
  });

  it("issues a certificate on the passed final result and prints it", async () => {
    const Certificates = await page("@/pages/exam/Certificates");
    render(<MemoryRouter><Certificates /></MemoryRouter>);
    const label = () => Array.from(document.querySelectorAll("label")).find((el) => el.textContent === "Student")!;
    await waitFor(() => expect(label()).toBeTruthy());
    fireEvent.keyDown(within(label().parentElement!).getByRole("combobox"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: /Ram Kumar.*eligible/ }));
    expect(await screen.findByText(/₹150 will be deducted/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate certificate" }));
    await waitFor(() => expect(issueCertificate).toHaveBeenCalledTimes(1));
    const [studentId, by, dates] = issueCertificate.mock.calls[0] as [string, string, Record<string, string>];
    expect(studentId).toBe("s1");
    expect(by).toBe("Head Office");
    expect(dates.examConductedDate).toBe("2026-11-20");
    await waitFor(() => expect(printFromTemplate).toHaveBeenCalledWith("certificate", expect.anything(), "org1", "b1", { certificate_no: "CERT-E001", certificate_id: "CERT-E001" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Certificate issued" })));
  });

  it("will not issue when the centre's wallet cannot cover the fee", async () => {
    walletBalance = 100;
    const Certificates = await page("@/pages/exam/Certificates");
    render(<MemoryRouter><Certificates /></MemoryRouter>);
    const label = () => Array.from(document.querySelectorAll("label")).find((el) => el.textContent === "Student")!;
    await waitFor(() => expect(label()).toBeTruthy());
    fireEvent.keyDown(within(label().parentElement!).getByRole("combobox"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: /Ram Kumar/ }));
    expect(await screen.findByText(/is less than the ₹150 certificate fee/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recharge the wallet" })).toHaveAttribute("href", "/branch/wallet");
    expect(screen.getByRole("button", { name: "Generate certificate" })).toBeDisabled();
  });

  it("lists passout students", async () => {
    const Certificates = await page("@/pages/exam/Certificates");
    render(<MemoryRouter><Certificates passoutOnly /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Passout Students" })).toBeInTheDocument();
    expect(screen.queryByText("Generate certificate")).toBeNull();
  });
});
