/**
 * Shared model for the document designer: certificates, marksheets, ID cards
 * and admit cards are all the same thing - absolutely positioned elements on a
 * fixed canvas, with `{{token}}` placeholders filled from a student record at
 * print time. Layouts are stored per document type so switching type does not
 * destroy the design you already made for another.
 */

export type ElementType = "text" | "shape" | "image" | "qr";

export interface DocElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  background: string;
  border: string;
  radius: number;
  rotate: number;
  opacity: number;
  src: string;
  align: "left" | "center" | "right";
  z: number;
}

export interface DocumentDesign {
  elements: DocElement[];
  background: string;
  backgroundImage: string;
}

export type DocumentKind =
  | "certificate"
  | "marksheet"
  | "student-id"
  | "staff-id"
  | "admit-card";

export interface DocumentKindMeta {
  label: string;
  icon: string;
  width: number;
  height: number;
  starter: () => DocElement[];
}

let seq = 0;

/** Ids only have to be unique inside one design, and must survive a JSON round trip. */
export function element(type: ElementType, options: Partial<DocElement> = {}): DocElement {
  seq += 1;
  return {
    id: `el_${Date.now().toString(36)}_${seq}`,
    type,
    x: 100,
    y: 100,
    width: 250,
    height: 60,
    text: "Text",
    fontSize: 24,
    fontWeight: "400",
    color: "#0f172a",
    background: "transparent",
    border: "none",
    radius: 0,
    rotate: 0,
    opacity: 1,
    src: "",
    align: "center",
    z: 2,
    ...options,
  };
}

/**
 * The tokens a design may reference. Anything not listed is still substituted
 * if the caller supplies it - this is the palette shown in the sidebar, not a
 * whitelist.
 */
export const TOKEN_LABELS: Record<string, string> = {
  student_name: "Student name",
  father_name: "Father's name",
  mother_name: "Mother's name",
  course_name: "Course",
  batch_name: "Batch",
  branch_name: "Branch",
  enrollment_no: "Enrollment no",
  application_no: "Application no",
  roll_no: "Roll no",
  certificate_id: "Certificate ID",
  issue_date: "Issue date",
  exam_name: "Exam",
  exam_date: "Exam date",
  exam_centre: "Exam centre",
  reporting_time: "Reporting time",
  dob: "Date of birth",
  blood_group: "Blood group",
  phone: "Phone",
  address: "Address",
  valid_until: "Valid until",
  grade: "Grade",
  percentage: "Percentage",
  institute: "Institute",
  designation: "Designation",
};

export type TokenData = Record<string, string>;

export const SAMPLE_DATA: TokenData = {
  student_name: "Rahul Kumar",
  father_name: "Raj Kumar",
  mother_name: "Sunita Kumar",
  course_name: "AI Full Stack Developer",
  batch_name: "Morning Batch A",
  branch_name: "Main Branch",
  enrollment_no: "ENR-2026-0125",
  application_no: "APP-2026-0125",
  roll_no: "101",
  certificate_id: "IDS-2026-000125",
  issue_date: "06 September 2026",
  exam_name: "Semester I Examination",
  exam_date: "20 September 2026",
  exam_centre: "Main Branch, Hall 2",
  reporting_time: "09:30 AM",
  dob: "15 August 2005",
  blood_group: "O+",
  phone: "98765 43210",
  address: "12 MG Road, Pune, Maharashtra",
  valid_until: "31 March 2027",
  grade: "A+",
  percentage: "88.4%",
  institute: "Ideal Digiskills",
  designation: "Trainer",
};

/** `{{ student_name }}` -> the value, leaving unknown tokens visible on purpose. */
export function replaceTokens(text: string, data: TokenData): string {
  return text.replace(/\{\{(.*?)\}\}/g, (match, key) => data[String(key).trim()] ?? match);
}

/** Every token a design actually uses, for the "unfilled tokens" warning. */
export function usedTokens(elements: DocElement[]): string[] {
  const found = new Set<string>();
  for (const el of elements) {
    for (const match of el.text.matchAll(/\{\{(.*?)\}\}/g)) found.add(match[1].trim());
  }
  return [...found].sort();
}

function border(color: string, width = 4) {
  return `${width}px solid ${color}`;
}

function certificate(): DocElement[] {
  return [
    element("shape", { x: 30, y: 30, width: 940, height: 647, border: border("#b45309", 8), radius: 5, z: 1 }),
    element("text", { x: 180, y: 85, width: 640, height: 60, text: "CERTIFICATE OF ACHIEVEMENT", fontSize: 38, fontWeight: "800", color: "#7c2d12" }),
    element("text", { x: 300, y: 175, width: 400, height: 40, text: "This certificate is proudly presented to", fontSize: 20 }),
    element("text", { x: 200, y: 225, width: 600, height: 70, text: "{{student_name}}", fontSize: 46, fontWeight: "800", color: "#1e3a8a" }),
    element("text", { x: 250, y: 320, width: 500, height: 40, text: "For successfully completing", fontSize: 20 }),
    element("text", { x: 200, y: 365, width: 600, height: 55, text: "{{course_name}}", fontSize: 30, fontWeight: "700" }),
    element("text", { x: 80, y: 550, width: 280, height: 30, text: "Certificate ID: {{certificate_id}}", fontSize: 15, align: "left" }),
    element("text", { x: 380, y: 550, width: 280, height: 30, text: "{{institute}}", fontSize: 17, fontWeight: "700" }),
    element("text", { x: 380, y: 585, width: 280, height: 30, text: "Issued {{issue_date}}", fontSize: 14, color: "#475569" }),
    element("qr", { x: 800, y: 510, width: 100, height: 100 }),
  ];
}

function marksheet(): DocElement[] {
  return [
    element("shape", { x: 20, y: 20, width: 760, height: 1060, border: border("#1e3a8a", 5), z: 1 }),
    element("text", { x: 100, y: 60, width: 600, height: 60, text: "{{institute}}", fontSize: 34, fontWeight: "800", color: "#1e3a8a" }),
    element("text", { x: 100, y: 130, width: 600, height: 50, text: "STATEMENT OF MARKS", fontSize: 28, fontWeight: "800" }),
    element("text", { x: 70, y: 220, width: 650, height: 40, text: "Student Name: {{student_name}}", fontSize: 20, align: "left" }),
    element("text", { x: 70, y: 265, width: 650, height: 40, text: "Enrollment No: {{enrollment_no}}", fontSize: 18, align: "left" }),
    element("text", { x: 70, y: 310, width: 650, height: 40, text: "Course: {{course_name}}", fontSize: 18, align: "left" }),
    element("text", { x: 70, y: 355, width: 650, height: 40, text: "Batch: {{batch_name}}", fontSize: 18, align: "left" }),
    element("shape", { x: 70, y: 420, width: 650, height: 320, border: "1px solid #94a3b8", background: "#f8fafc" }),
    // Four boxes rather than one padded string: runs of spaces collapse in HTML,
    // and separate columns are what a real marksheet body is filled into.
    element("text", { x: 90, y: 432, width: 240, height: 36, text: "Subject", fontSize: 17, fontWeight: "700", align: "left" }),
    element("text", { x: 340, y: 432, width: 110, height: 36, text: "Max", fontSize: 17, fontWeight: "700" }),
    element("text", { x: 460, y: 432, width: 130, height: 36, text: "Obtained", fontSize: 17, fontWeight: "700" }),
    element("text", { x: 600, y: 432, width: 100, height: 36, text: "Grade", fontSize: 17, fontWeight: "700" }),
    element("shape", { x: 90, y: 470, width: 610, height: 1, background: "#94a3b8", border: "none", text: "" }),
    element("text", { x: 70, y: 780, width: 320, height: 40, text: "Percentage: {{percentage}}", fontSize: 20, fontWeight: "700", align: "left" }),
    element("text", { x: 400, y: 780, width: 320, height: 40, text: "Grade: {{grade}}", fontSize: 20, fontWeight: "700", align: "left" }),
    element("text", { x: 70, y: 950, width: 300, height: 30, text: "Issued {{issue_date}}", fontSize: 15, align: "left" }),
    element("qr", { x: 600, y: 900, width: 100, height: 100 }),
  ];
}

function studentId(): DocElement[] {
  return [
    element("shape", { x: 10, y: 10, width: 991, height: 618, border: border("#2563eb"), background: "#eff6ff", radius: 20, z: 1 }),
    element("text", { x: 280, y: 40, width: 450, height: 50, text: "{{institute}}", fontSize: 34, fontWeight: "800", color: "#1d4ed8" }),
    element("text", { x: 350, y: 100, width: 300, height: 40, text: "STUDENT ID CARD", fontSize: 22, fontWeight: "800" }),
    element("shape", { x: 70, y: 180, width: 190, height: 240, background: "#cbd5e1", radius: 15, text: "Photo" }),
    element("text", { x: 330, y: 175, width: 550, height: 45, text: "Name: {{student_name}}", fontSize: 24, align: "left" }),
    element("text", { x: 330, y: 230, width: 550, height: 45, text: "Course: {{course_name}}", fontSize: 20, align: "left" }),
    element("text", { x: 330, y: 285, width: 550, height: 45, text: "Enrollment: {{enrollment_no}}", fontSize: 20, align: "left" }),
    element("text", { x: 330, y: 340, width: 550, height: 45, text: "Blood group: {{blood_group}}", fontSize: 20, align: "left" }),
    element("text", { x: 70, y: 450, width: 500, height: 40, text: "Phone: {{phone}}", fontSize: 18, align: "left" }),
    element("text", { x: 70, y: 495, width: 700, height: 40, text: "{{address}}", fontSize: 16, align: "left", color: "#475569" }),
    element("text", { x: 70, y: 555, width: 400, height: 35, text: "Valid until {{valid_until}}", fontSize: 16, align: "left", fontWeight: "700" }),
    element("qr", { x: 820, y: 430, width: 120, height: 120 }),
  ];
}

function staffId(): DocElement[] {
  return [
    element("shape", { x: 10, y: 10, width: 991, height: 618, border: border("#059669"), background: "#ecfdf5", radius: 20, z: 1 }),
    element("text", { x: 280, y: 40, width: 450, height: 50, text: "{{institute}}", fontSize: 34, fontWeight: "800", color: "#047857" }),
    element("text", { x: 350, y: 100, width: 300, height: 40, text: "STAFF ID CARD", fontSize: 22, fontWeight: "800" }),
    element("shape", { x: 70, y: 180, width: 190, height: 240, background: "#cbd5e1", radius: 15, text: "Photo" }),
    element("text", { x: 330, y: 180, width: 550, height: 45, text: "Name: {{student_name}}", fontSize: 24, align: "left" }),
    element("text", { x: 330, y: 240, width: 550, height: 45, text: "Designation: {{designation}}", fontSize: 20, align: "left" }),
    element("text", { x: 330, y: 300, width: 550, height: 45, text: "Employee ID: {{certificate_id}}", fontSize: 20, align: "left" }),
    element("text", { x: 330, y: 360, width: 550, height: 45, text: "Phone: {{phone}}", fontSize: 20, align: "left" }),
    element("text", { x: 70, y: 555, width: 400, height: 35, text: "Valid until {{valid_until}}", fontSize: 16, align: "left", fontWeight: "700" }),
    element("qr", { x: 820, y: 430, width: 120, height: 120 }),
  ];
}

function admitCard(): DocElement[] {
  return [
    element("shape", { x: 20, y: 20, width: 760, height: 1060, border: border("#7c3aed", 5), z: 1 }),
    element("text", { x: 90, y: 55, width: 620, height: 55, text: "{{institute}}", fontSize: 32, fontWeight: "800", color: "#5b21b6" }),
    element("text", { x: 90, y: 120, width: 620, height: 45, text: "ADMIT CARD", fontSize: 26, fontWeight: "800" }),
    element("shape", { x: 570, y: 195, width: 150, height: 180, background: "#e2e8f0", radius: 10, text: "Photo" }),
    element("text", { x: 70, y: 200, width: 480, height: 40, text: "Name: {{student_name}}", fontSize: 20, align: "left" }),
    element("text", { x: 70, y: 245, width: 480, height: 40, text: "Roll No: {{roll_no}}", fontSize: 18, align: "left" }),
    element("text", { x: 70, y: 290, width: 480, height: 40, text: "Enrollment: {{enrollment_no}}", fontSize: 18, align: "left" }),
    element("text", { x: 70, y: 335, width: 480, height: 40, text: "Course: {{course_name}}", fontSize: 18, align: "left" }),
    element("shape", { x: 70, y: 410, width: 650, height: 230, border: "1px solid #94a3b8", background: "#faf5ff" }),
    element("text", { x: 90, y: 430, width: 610, height: 40, text: "Examination: {{exam_name}}", fontSize: 19, fontWeight: "700", align: "left" }),
    element("text", { x: 90, y: 480, width: 610, height: 40, text: "Date: {{exam_date}}", fontSize: 18, align: "left" }),
    element("text", { x: 90, y: 525, width: 610, height: 40, text: "Reporting time: {{reporting_time}}", fontSize: 18, align: "left" }),
    element("text", { x: 90, y: 570, width: 610, height: 40, text: "Centre: {{exam_centre}}", fontSize: 18, align: "left" }),
    element("text", { x: 70, y: 700, width: 650, height: 120, text: "Candidates must carry this admit card and a photo ID to the centre. Mobile phones and calculators are not permitted.", fontSize: 15, align: "left", color: "#475569" }),
    element("text", { x: 430, y: 950, width: 290, height: 35, text: "Controller of Examinations", fontSize: 15 }),
    element("qr", { x: 90, y: 900, width: 110, height: 110 }),
  ];
}

export const DOCUMENT_KINDS: Record<DocumentKind, DocumentKindMeta> = {
  certificate: { label: "Certificate", icon: "🏆", width: 1000, height: 707, starter: certificate },
  marksheet: { label: "Marksheet", icon: "📊", width: 800, height: 1100, starter: marksheet },
  "student-id": { label: "Student ID card", icon: "🎓", width: 1011, height: 638, starter: studentId },
  "staff-id": { label: "Staff ID card", icon: "👨‍🏫", width: 1011, height: 638, starter: staffId },
  "admit-card": { label: "Admit card", icon: "📝", width: 800, height: 1100, starter: admitCard },
};

export const DESIGN_STORAGE_KEY = "document-designer";

export function starterDesign(kind: DocumentKind): DocumentDesign {
  return {
    elements: DOCUMENT_KINDS[kind].starter(),
    background: "#ffffff",
    backgroundImage: "",
  };
}

/** Designs live per kind, so switching type never discards the other layouts. */
export function loadDesigns(): Partial<Record<DocumentKind, DocumentDesign>> {
  try {
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDesigns(all: Partial<Record<DocumentKind, DocumentDesign>>) {
  localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(all));
}

/**
 * The printable form of a design. Kept here rather than in the page so the bulk
 * generators can render the same layout for a list of students later.
 */
export function designHtml(
  kind: DocumentKind,
  design: DocumentDesign,
  data: TokenData,
  qrByElement: Record<string, string> = {},
): string {
  const { width, height } = DOCUMENT_KINDS[kind];
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [...design.elements]
    .sort((a, b) => a.z - b.z)
    .map((el) => {
      const box =
        `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;` +
        `transform:rotate(${el.rotate}deg);opacity:${el.opacity};z-index:${el.z};`;
      if (el.type === "text") {
        const justify =
          el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center";
        return `<div style="${box}display:flex;align-items:center;justify-content:${justify};font-size:${el.fontSize}px;font-weight:${el.fontWeight};color:${el.color};background:${el.background};border:${el.border};border-radius:${el.radius}px;padding:4px;text-align:${el.align}">${escape(replaceTokens(el.text, data))}</div>`;
      }
      if (el.type === "image" && el.src) {
        return `<img src="${el.src}" style="${box}object-fit:contain;border-radius:${el.radius}px" />`;
      }
      if (el.type === "qr") {
        const src = qrByElement[el.id];
        return src
          ? `<img src="${src}" style="${box}background:#fff;padding:4px" />`
          : `<div style="${box}background:#fff;border:1px solid #cbd5e1"></div>`;
      }
      return `<div style="${box}background:${el.background};border:${el.border};border-radius:${el.radius}px;display:flex;align-items:center;justify-content:center;font-size:${el.fontSize}px;color:${el.color}">${escape(replaceTokens(el.text === "Text" ? "" : el.text, data))}</div>`;
    })
    .join("");
  const bg = design.backgroundImage
    ? `background-image:url('${design.backgroundImage}');background-size:cover;background-position:center;`
    : `background:${design.background};`;
  return `<div style="position:relative;width:${width}px;height:${height}px;${bg}overflow:hidden">${body}</div>`;
}
