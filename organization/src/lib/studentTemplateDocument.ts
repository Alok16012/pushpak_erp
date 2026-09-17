import QRCode from "qrcode";

import {
  SAMPLE_DATA,
  designHtml,
  type DocumentKind,
  type TokenData,
} from "@/lib/documentDesigner";
import type { StudentDocument } from "@/lib/documents";
import { printHtml } from "@/lib/export";
import { loadDesignFor } from "@/lib/supabase/documentTemplates";

/**
 * Printing a student's document from the template their branch was given.
 *
 * The designer drew templates and the print buttons ignored them: certificates
 * and ID cards came out of layouts written into `documents.ts`, the same for
 * every institute using this app. This is the join. Where a branch has a
 * template -- its own, or the organisation's default -- the document is drawn
 * from it; where the library is empty, the caller falls back to the built-in
 * layout, so nobody loses the ability to print.
 */

/** The tokens a template can fill from one student's record. */
export function tokensFor(student: StudentDocument, extra: TokenData = {}): TokenData {
  const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
  const issued = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const filled: TokenData = {
    student_name: name,
    father_name: student.fatherName || "",
    course_name: student.course?.name || "",
    batch_name: student.batch?.name || "",
    branch_name: student.branch?.name || "",
    enrollment_no: student.enrollmentNo || "",
    application_no: student.applicationNo || "",
    roll_no: student.rollNo || "",
    certificate_id: student.enrollmentNo || student.applicationNo || "",
    issue_date: issued,
    dob: student.dateOfBirth || "",
    address: student.branch?.address || "",
    phone: student.branch?.phone || "",
    institute: student.branch?.organization?.name || "",
    // The face the admission collected. An empty string on purpose where there
    // is none: the photo box then prints its own placeholder rather than the
    // sample.
    photo: student.photo || "",
  };

  // The sample values stand in only for tokens this record cannot answer, so a
  // half-filled template still reads as a document rather than as `{{tokens}}`.
  const data: TokenData = { ...SAMPLE_DATA };
  for (const [key, value] of Object.entries({ ...filled, ...extra })) {
    if (value) data[key] = value;
  }
  data.photo = extra.photo ?? filled.photo;
  return data;
}

/** QR elements carry a verification string, as they do in the designer. */
async function qrImages(
  design: { elements: Array<{ id: string; type: string; width: number }> },
  data: TokenData,
) {
  const payload = data.certificate_id || data.enrollment_no || data.student_name;
  const pairs = await Promise.all(
    design.elements
      .filter((element) => element.type === "qr")
      .map(async (element) => {
        const src = await QRCode.toDataURL(`verify:${payload}`, {
          width: Math.max(64, Math.round(element.width)),
          margin: 1,
        }).catch(() => "");
        return [element.id, src] as const;
      }),
  );
  return Object.fromEntries(pairs);
}

/**
 * Prints one student's document from their branch's template.
 *
 * Returns false when the institute has no template for this kind at all, which
 * is the caller's signal to fall back to the built-in layout.
 */
export async function printFromTemplate(
  kind: DocumentKind,
  student: StudentDocument,
  organizationId: string | null,
  branchId: string | null,
  extra: TokenData = {},
): Promise<boolean> {
  const { template, design } = await loadDesignFor(kind, organizationId, branchId);
  if (!template) return false;

  const data = tokensFor(student, extra);
  const qr = await qrImages(design, data);
  const name = [student.firstName, student.lastName].filter(Boolean).join(" ") || "Student";
  printHtml(`${template.name} — ${name}`, designHtml(kind, design, data, qr));
  return true;
}

/** The same, for a sheet of many: one template, one page per student. */
export async function printManyFromTemplate(
  kind: DocumentKind,
  students: StudentDocument[],
  organizationId: string | null,
  branchId: string | null,
): Promise<boolean> {
  const { template, design } = await loadDesignFor(kind, organizationId, branchId);
  if (!template || students.length === 0) return false;

  const pages = await Promise.all(
    students.map(async (student) => {
      const data = tokensFor(student);
      const qr = await qrImages(design, data);
      // Each card on its own sheet, as a printer expects them.
      return `<div style="page-break-after:always">${designHtml(kind, design, data, qr)}</div>`;
    }),
  );
  printHtml(`${template.name} — ${students.length} student(s)`, pages.join(""));
  return true;
}

/** One student row as `getStudents` returns it, for the bulk card printer. */
export type StudentRecord = Record<string, unknown> & {
  id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  enrollmentNo?: string;
  applicationNo?: string;
  rollNo?: string;
  fatherName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  phone?: string;
  documents?: Record<string, { dataUrl?: string }> | null;
  photo?: unknown;
};

/** The face the admission collected, or the one an older record kept. */
export function photoOf(student: StudentRecord): string {
  const fromDocuments = student.documents?.passportPhoto?.dataUrl;
  if (fromDocuments) return fromDocuments;
  const own = student.photo;
  if (typeof own === "string") return own;
  if (own && typeof own === "object") {
    const found = (own as Record<string, unknown>).dataUrl;
    if (typeof found === "string") return found;
  }
  return "";
}

/** Tokens from a raw student row -- what the roster and the card pages hold. */
export function tokensForRecord(student: StudentRecord, extra: TokenData = {}): TokenData {
  const name = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
  const filled: TokenData = {
    student_name: name,
    father_name: student.fatherName || "",
    enrollment_no: student.enrollmentNo || "",
    application_no: student.applicationNo || "",
    roll_no: student.rollNo || "",
    certificate_id: student.enrollmentNo || student.applicationNo || "",
    blood_group: student.bloodGroup || "",
    phone: student.phone || "",
    dob: student.dateOfBirth
      ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "",
    issue_date: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
  const data: TokenData = { ...SAMPLE_DATA };
  for (const [key, value] of Object.entries({ ...filled, ...extra })) {
    if (value) data[key] = value;
  }
  data.photo = extra.photo ?? photoOf(student);
  return data;
}

/**
 * A sheet of cards from the branch's template -- one page each, each carrying
 * that student's own photograph.
 *
 * Returns false when the institute has no template of this kind, which is the
 * caller's signal to print the way it always did.
 */
export async function printRecordsFromTemplate(
  kind: DocumentKind,
  students: StudentRecord[],
  organizationId: string | null,
  branchId: string | null,
  extra: TokenData = {},
): Promise<boolean> {
  const { template, design } = await loadDesignFor(kind, organizationId, branchId);
  if (!template || students.length === 0) return false;

  const pages = await Promise.all(
    students.map(async (student) => {
      const data = tokensForRecord(student, extra);
      const qr = await qrImages(design, data);
      return `<div style="page-break-after:always">${designHtml(kind, design, data, qr)}</div>`;
    }),
  );
  printHtml(`${template.name} — ${students.length} student(s)`, pages.join(""));
  return true;
}
