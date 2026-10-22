import { marksheetPdf } from "@/lib/documents";
import { asExamResults, termLabel, termPlan, type CourseTermSource } from "@/lib/examWorkflow";
import { printFromTemplate } from "@/lib/studentTemplateDocument";
import { getStudentDocument } from "@/lib/supabase/data";
import type { MarksheetRecord } from "@/lib/supabase/examWorkflow";

/**
 * Prints one term's result as the marksheet: the branch's marksheet design
 * where it has one, else the built-in sheet. Results and Certificates both
 * print through here, so the two never disagree about what a marksheet says.
 */
export async function printMarksheet(
  sheet: MarksheetRecord,
  opts: {
    course: CourseTermSource | null | undefined;
    rollNo?: string;
    examinationDate?: string;
    organizationId: string | null;
    ownBranch: string | null;
  },
) {
  const { data } = await getStudentDocument(sheet.studentId, opts.ownBranch);
  const type = termPlan(opts.course).type;
  const doc = {
    ...data,
    rollNo: opts.rollNo || data.rollNo,
    issueDate: sheet.issueDate,
    examinationDate: opts.examinationDate || sheet.issueDate,
    session: sheet.session || data.session,
    examResults: asExamResults([sheet], type),
  };
  const extra = { marksheet_no: sheet.marksheetNo, term: termLabel(type, sheet.term), session: sheet.session };
  const printed = await printFromTemplate("marksheet", doc, opts.organizationId, sheet.branchId, extra);
  if (!printed) await marksheetPdf(doc);
}
