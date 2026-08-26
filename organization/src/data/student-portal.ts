/**
 * The signed-in student's own record. The staff-side ERP already models all of
 * this per-institution; the portal needs one learner's slice of it, so it is
 * kept here as seed data and persisted per browser like the other screens the
 * API does not expose yet.
 */
import type { StudentDocument } from "@/lib/documents";
import type { IdCardStudent } from "@/data/id-card-templates";
import type { AdmitCardStudent } from "@/data/admit-card-templates";
import type { CertificateStudent } from "@/data/certificate-templates";

export const PORTAL_KEYS = {
  profile: "erp-portal-profile",
  attendance: "erp-portal-attendance",
  fees: "erp-portal-fees",
  results: "erp-portal-results",
  classes: "erp-portal-classes",
  requests: "erp-portal-requests",
};

export interface StudentProfile {
  id: string;
  name: string;
  enrollmentNo: string;
  rollNo: string;
  course: string;
  batch: string;
  section: string;
  branch: string;
  email: string;
  phone: string;
  guardian: string;
  guardianPhone: string;
  /** Parentage and Aadhaar are printed on the completion certificate. */
  fatherName: string;
  motherName: string;
  aadhaar: string;
  address: string;
  dob: string;
  bloodGroup: string;
  admissionDate: string;
  photo: string | null;
}

export interface AttendanceDay {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  subject: string;
  status: "present" | "absent" | "late" | "holiday";
}

export interface PortalInvoice {
  id: string;
  invoiceNo: string;
  description: string;
  amount: number;
  paid: number;
  dueDate: string;
  method?: string;
  paidAt?: string;
  receiptNo?: string;
}

export interface PortalResult {
  id: string;
  exam: string;
  subject: string;
  maxMarks: number;
  passMarks: number;
  marks: number;
  examDate: string;
}

export interface PortalClass {
  id: string;
  subject: string;
  topic: string;
  faculty: string;
  platform: string;
  link: string;
  /** ISO timestamp of the start. */
  startsAt: string;
  minutes: number;
  recording?: string;
}

export interface PortalRequest {
  id: string;
  kind: string;
  detail: string;
  raisedAt: string;
  status: "open" | "resolved";
}

const DAY = 86_400_000;
/** `YYYY-MM-DD`, `offset` days from today — fixtures must stay near "now" or
 *  every month filter in the portal opens empty. */
export const isoDate = (offset: number) =>
  new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
const at = (offsetDays: number, hour: number, minute = 0) => {
  const when = new Date(Date.now() + offsetDays * DAY);
  when.setHours(hour, minute, 0, 0);
  return when.toISOString();
};

export const PROFILE_SEED: StudentProfile = {
  id: "STU2201",
  name: "Aarav Sharma",
  enrollmentNo: "IDS/2026/2201",
  rollNo: "2201",
  course: "Advanced Diploma in Computer Applications",
  batch: "2026-A",
  section: "A",
  branch: "Kothrud Branch",
  email: "aarav.sharma@student.idealdigiskills.com",
  phone: "+91 98220 41100",
  guardian: "Meera Sharma",
  guardianPhone: "+91 98220 41199",
  fatherName: "Rakesh Sharma",
  motherName: "Meera Sharma",
  aadhaar: "774512908833",
  address: "24 Shivaji Nagar, Pune - 411005",
  dob: "12 Mar 2007",
  bloodGroup: "B+",
  admissionDate: isoDate(-210),
  photo: null,
};

const SUBJECTS = ["Programming Fundamentals", "Database Systems", "Web Technologies", "Communication Skills", "Mathematics"];

/**
 * Forty-five weekdays of history. The pattern is deterministic so the summary
 * percentages are the same every time the portal is opened fresh.
 */
export const ATTENDANCE_SEED: AttendanceDay[] = (() => {
  // Sundays are holidays; the pattern counts teaching days rather than raw
  // days so absents and lates never collide with a Sunday and vanish.
  let taught = 0;
  return Array.from({ length: 45 }, (_, index) => {
    const date = new Date(Date.now() - index * DAY);
    const holiday = date.getDay() === 0;
    if (!holiday) taught += 1;
    const status: AttendanceDay["status"] =
      holiday ? "holiday" : taught % 13 === 5 ? "absent" : taught % 7 === 3 ? "late" : "present";
    return {
      id: `att-${index}`,
      date: date.toISOString().slice(0, 10),
      subject: SUBJECTS[index % SUBJECTS.length],
      status,
    };
  });
})();

export const INVOICE_SEED: PortalInvoice[] = [
  { id: "inv-1", invoiceNo: "INV-2026-0101", description: "Admission fee", amount: 12000, paid: 12000, dueDate: isoDate(-205), method: "UPI", paidAt: isoDate(-208), receiptNo: "RCT-2026-0101" },
  { id: "inv-2", invoiceNo: "INV-2026-0142", description: "Term 1 tuition fee", amount: 24000, paid: 24000, dueDate: isoDate(-120), method: "Bank Transfer", paidAt: isoDate(-124), receiptNo: "RCT-2026-0142" },
  { id: "inv-3", invoiceNo: "INV-2026-0208", description: "Term 2 tuition fee", amount: 24000, paid: 10000, dueDate: isoDate(-6), method: "UPI", paidAt: isoDate(-20), receiptNo: "RCT-2026-0208" },
  { id: "inv-4", invoiceNo: "INV-2026-0263", description: "Examination & certification fee", amount: 4500, paid: 0, dueDate: isoDate(12) },
];

export const RESULT_SEED: PortalResult[] = [
  { id: "res-1", exam: "Mid-term", subject: "Programming Fundamentals", maxMarks: 100, passMarks: 40, marks: 82, examDate: isoDate(-96) },
  { id: "res-2", exam: "Mid-term", subject: "Database Systems", maxMarks: 100, passMarks: 40, marks: 74, examDate: isoDate(-94) },
  { id: "res-3", exam: "Mid-term", subject: "Web Technologies", maxMarks: 100, passMarks: 40, marks: 88, examDate: isoDate(-92) },
  { id: "res-4", exam: "Mid-term", subject: "Communication Skills", maxMarks: 50, passMarks: 20, marks: 41, examDate: isoDate(-90) },
  { id: "res-5", exam: "Mid-term", subject: "Mathematics", maxMarks: 100, passMarks: 40, marks: 67, examDate: isoDate(-88) },
  { id: "res-6", exam: "Unit test 2", subject: "Programming Fundamentals", maxMarks: 25, passMarks: 10, marks: 22, examDate: isoDate(-24) },
  { id: "res-7", exam: "Unit test 2", subject: "Database Systems", maxMarks: 25, passMarks: 10, marks: 19, examDate: isoDate(-22) },
  { id: "res-8", exam: "Unit test 2", subject: "Web Technologies", maxMarks: 25, passMarks: 10, marks: 24, examDate: isoDate(-20) },
];

export const CLASS_SEED: PortalClass[] = [
  { id: "cls-1", subject: "Web Technologies", topic: "React state and effects", faculty: "Prof. Sarah Johnson", platform: "Google Meet", link: "https://meet.google.com/ids-web-2026", startsAt: at(0, 17), minutes: 60 },
  { id: "cls-2", subject: "Database Systems", topic: "Joins and subqueries", faculty: "Dr. John Smith", platform: "Zoom", link: "https://zoom.us/j/ids2026db", startsAt: at(1, 11, 30), minutes: 90 },
  { id: "cls-3", subject: "Mathematics", topic: "Probability distributions", faculty: "Ms. Emily Davis", platform: "Microsoft Teams", link: "https://teams.microsoft.com/l/ids-math", startsAt: at(3, 9), minutes: 60 },
  { id: "cls-4", subject: "Programming Fundamentals", topic: "Recursion workshop", faculty: "Mr. Michael Brown", platform: "Zoom", link: "https://zoom.us/j/ids2026prog", startsAt: at(-2, 16), minutes: 90, recording: "https://recordings.idealdigiskills.com/prog-recursion" },
  { id: "cls-5", subject: "Communication Skills", topic: "Interview practice", faculty: "Ms. Emily Davis", platform: "Google Meet", link: "https://meet.google.com/ids-comm-2026", startsAt: at(-5, 15), minutes: 45, recording: "https://recordings.idealdigiskills.com/comm-interview" },
  { id: "cls-6", subject: "Web Technologies", topic: "Responsive layout patterns", faculty: "Prof. Sarah Johnson", platform: "Google Meet", link: "https://meet.google.com/ids-web-2026", startsAt: at(-7, 17), minutes: 60, recording: "https://recordings.idealdigiskills.com/web-responsive" },
];

export const NOTICES = [
  { id: "not-1", title: "Term 2 examination timetable published", body: "The timetable is on the results page. Admit cards open two weeks before the first paper.", date: isoDate(-2) },
  { id: "not-2", title: "Library open on Saturdays", body: "The Kothrud branch library is now open 10:00–16:00 on Saturdays through the exam season.", date: isoDate(-6) },
  { id: "not-3", title: "Fee counter timings", body: "Counter payments are accepted 09:30–17:00 on weekdays. Online payment is available any time from Fees & receipts.", date: isoDate(-11) },
];

export const REQUEST_KINDS = [
  "Attendance correction",
  "Fee receipt copy",
  "Bonafide certificate",
  "Batch or timing change",
  "Other",
];

/* ---------- derived summaries, shared by the dashboard and its pages ---------- */

export const attendanceSummary = (days: AttendanceDay[]) => {
  const counted = days.filter((day) => day.status !== "holiday");
  const present = counted.filter((day) => day.status === "present").length;
  const late = counted.filter((day) => day.status === "late").length;
  const absent = counted.filter((day) => day.status === "absent").length;
  // A late mark still counts as attended — it is a punctuality flag, not an absence.
  const percentage = counted.length ? Math.round(((present + late) / counted.length) * 1000) / 10 : 0;
  return { total: counted.length, present, late, absent, percentage };
};

export const feeSummary = (invoices: PortalInvoice[]) => {
  const billed = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paid = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const today = isoDate(0);
  const overdue = invoices
    .filter((invoice) => invoice.paid < invoice.amount && invoice.dueDate < today)
    .reduce((sum, invoice) => sum + (invoice.amount - invoice.paid), 0);
  return { billed, paid, due: billed - paid, overdue };
};

export const resultSummary = (results: PortalResult[]) => {
  const scored = results.reduce((sum, result) => sum + result.marks, 0);
  const max = results.reduce((sum, result) => sum + result.maxMarks, 0);
  const failed = results.filter((result) => result.marks < result.passMarks).length;
  return {
    scored,
    max,
    percentage: max ? Math.round((scored / max) * 1000) / 10 : 0,
    failed,
    exams: [...new Set(results.map((result) => result.exam))],
  };
};

export const invoiceStatus = (invoice: PortalInvoice) =>
  invoice.paid >= invoice.amount
    ? "paid"
    : invoice.dueDate < isoDate(0)
      ? "overdue"
      : invoice.paid > 0
        ? "partial"
        : "pending";

export const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export const classState = (item: PortalClass): "live" | "upcoming" | "completed" => {
  const start = new Date(item.startsAt).getTime();
  const end = start + item.minutes * 60_000;
  const now = Date.now();
  return now < start ? "upcoming" : now <= end ? "live" : "completed";
};

/* ---------- adapters onto the shapes the shared generators already take ---------- */

/** The portal reuses the staff-side PDF generators rather than growing its own. */
export const asStudentDocument = (
  profile: StudentProfile,
  invoices: PortalInvoice[],
  results: PortalResult[],
): StudentDocument => {
  const [firstName, ...rest] = profile.name.split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
    enrollmentNo: profile.enrollmentNo,
    applicationNo: profile.id,
    admissionDate: profile.admissionDate,
    course: { name: profile.course },
    batch: { name: profile.batch },
    branch: {
      name: profile.branch,
      phone: "+91 20 4004 1100",
      email: "kothrud@idealdigiskills.com",
      organization: { name: "Idealdigiskills" },
    },
    feeInvoices: invoices.map((invoice) => ({
      invoiceNo: invoice.invoiceNo,
      description: invoice.description,
      amount: invoice.amount,
      payments: invoice.receiptNo
        ? [{ receiptNo: invoice.receiptNo, amount: invoice.paid, method: invoice.method ?? "Cash", paidAt: invoice.paidAt ?? invoice.dueDate }]
        : [],
    })),
    examResults: results.map((result) => ({
      marks: result.marks,
      exam: {
        name: result.exam,
        subject: result.subject,
        maxMarks: result.maxMarks,
        passMarks: result.passMarks,
        examDate: result.examDate,
      },
    })),
  };
};

export const asIdCardStudent = (profile: StudentProfile): IdCardStudent => ({
  id: profile.id,
  name: profile.name,
  class: profile.course,
  section: profile.section,
  rollNo: profile.rollNo,
  photo: Boolean(profile.photo),
  dob: profile.dob,
  bloodGroup: profile.bloodGroup,
  parentContact: profile.guardianPhone,
  address: profile.address,
});

const asDayMonthYear = (value: Date) =>
  [value.getDate(), value.getMonth() + 1, value.getFullYear()]
    .map((part, index) => (index === 2 ? String(part) : String(part).padStart(2, "0")))
    .join("-");

/**
 * The student's own record in the shape the certificate base format expects.
 * The course period runs from the admission date over `durationMonths`, and the
 * grade comes from the published results rather than being stored twice.
 */
export const asCertificateStudent = (
  profile: StudentProfile,
  results: PortalResult[],
  durationMonths = 12,
): CertificateStudent => {
  const start = new Date(profile.admissionDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  const serial = profile.enrollmentNo.replace(/[^a-z0-9]/gi, "");

  return {
    id: profile.id,
    name: profile.name,
    fatherName: profile.fatherName,
    motherName: profile.motherName,
    registrationNo: profile.enrollmentNo,
    dob: profile.dob,
    aadhaar: profile.aadhaar,
    course: profile.course,
    durationMonths,
    courseFrom: asDayMonthYear(start),
    courseTo: asDayMonthYear(end),
    marks: resultSummary(results).percentage,
    certificateNo: serial,
    issueDate: asDayMonthYear(end),
    photo: profile.photo,
  };
};

export const asAdmitCardStudent = (
  profile: StudentProfile,
  feeStatus: AdmitCardStudent["feeStatus"] = "paid",
): AdmitCardStudent => ({
  id: profile.id,
  name: profile.name,
  class: profile.course,
  section: profile.section,
  rollNo: profile.rollNo,
  feeStatus,
});
