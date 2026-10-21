import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { certificatePdf, marksheetSummary } from "@/lib/documents";
import { printFromTemplate } from "@/lib/studentTemplateDocument";
import { Link } from "react-router-dom";
import { getCertificateFees, getStudentDocument, getWallet, issueCertificate } from "@/lib/supabase/data";
import { getAdmitCards, getIssuedCertificates, getMarksheets, type AdmitCardRecord, type IssuedCertificate, type MarksheetRecord } from "@/lib/supabase/examWorkflow";
import { studentName, useExamData } from "./useExamData";

const today = () => new Date().toLocaleDateString("en-CA");
const shown = (iso: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Issues a student's completion certificate on their passed final-term result,
 * charges the centre's wallet once, and prints it in the institute's own
 * certificate format. Every student issued one is a passout.
 */
export default function Certificates({ passoutOnly = false }: { passoutOnly?: boolean }) {
  const { toast } = useToast();
  const { user, ownBranch, branches, students, courseOf, branchOf, studentOf } = useExamData();
  const [branchId, setBranchId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [examDate, setExamDate] = useState("");
  const [issued, setIssued] = useState<IssuedCertificate[]>([]);
  const [sheets, setSheets] = useState<MarksheetRecord[]>([]);
  // The roll numbers issued on admit cards, which the certificate prints.
  const [cards, setCards] = useState<AdmitCardRecord[]>([]);
  const [fees, setFees] = useState<Map<string, number>>(new Map());
  const [busy, setBusy] = useState(false);
  // The paying centre's wallet, read when its student is picked.
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (ownBranch) setBranchId(ownBranch);
  }, [ownBranch]);

  const load = useCallback(async () => {
    try {
      const [c, m, f, a] = await Promise.all([
        getIssuedCertificates(ownBranch),
        getMarksheets({ branchId: ownBranch }),
        getCertificateFees().catch(() => new Map<string, number>()),
        getAdmitCards({ branchId: ownBranch }).catch(() => [] as AdmitCardRecord[]),
      ]);
      setIssued(c);
      setSheets(m);
      setFees(f);
      setCards(a);
    } catch (e) {
      toast({ title: "Could not load certificates", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  }, [ownBranch, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const finalPass = (sid: string) => sheets.find((s) => s.studentId === sid && s.isFinal && s.result === "PASS");
  const hasSheets = (sid: string) => sheets.some((s) => s.studentId === sid);
  const issuedFor = (sid: string) => issued.find((c) => c.studentId === sid);
  const candidates = students.filter((s) => !branchId || s.branchId === branchId);
  const student = studentOf.get(studentId) || null;
  const fee = student ? fees.get(student.branchId) ?? fees.get("*") ?? 0 : 0;
  const sheet = student ? finalPass(student.id) : undefined;
  const already = student ? issuedFor(student.id) : undefined;

  const payingBranch = student?.branchId || "";
  useEffect(() => {
    setBalance(null);
    if (!payingBranch) return;
    let cancelled = false;
    getWallet(payingBranch)
      .then((r) => { if (!cancelled) setBalance(Number((r.data as { balance?: number } | null)?.balance ?? 0)); })
      .catch(() => { /* the database still refuses a charge it cannot cover */ });
    return () => { cancelled = true; };
  }, [payingBranch, issued]);
  const short = !already && fee > 0 && balance !== null && balance < fee;

  // The examination date defaults to the final result's date.
  useEffect(() => {
    if (sheet?.issueDate && !examDate) setExamDate(sheet.issueDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.issueDate]);

  const printFor = async (sid: string, dates: { issueDate: string; examConductedDate: string; certificateNo?: string }) => {
    const { data } = await getStudentDocument(sid, ownBranch);
    // The final term's roll number, else the latest one issued.
    const roll = cards.filter((c) => c.studentId === sid).sort((a, b) => b.term - a.term)[0]?.rollNo;
    const doc = { ...data, rollNo: roll || data.rollNo, issueDate: dates.issueDate, examinationDate: dates.examConductedDate };
    if (!doc.course?.name) throw new Error("Assign the student's course first.");
    // The designer's {{certificate_id}} shows the certificate's own number once issued.
    const extra = { certificate_no: dates.certificateNo || "", ...(dates.certificateNo ? { certificate_id: dates.certificateNo } : {}) };
    const printed = await printFromTemplate("certificate", doc, user?.organizationId ?? null, data.branchId || ownBranch, extra);
    if (!printed) await certificatePdf(doc);
  };

  const generate = async () => {
    if (!student) return toast({ title: "Choose the student", variant: "destructive" });
    if (!issueDate) return toast({ title: "Choose the issue date", variant: "destructive" });
    setBusy(true);
    try {
      // A student still on the older per-paper exams is checked the old way.
      if (!hasSheets(student.id)) {
        const { data } = await getStudentDocument(student.id, ownBranch);
        if (marksheetSummary(data.examResults).result !== "Pass") {
          throw new Error("No passed final result for this student. Create the final term result under Results first.");
        }
      }
      const charge = await issueCertificate(student.id, user?.name, { issueDate, examConductedDate: examDate || null });
      await printFor(student.id, { issueDate, examConductedDate: examDate, certificateNo: charge.certificateNo });
      toast({
        title: charge.alreadyIssued ? "Certificate reprinted" : "Certificate issued",
        description: charge.charged ? `₹${charge.amount.toLocaleString("en-IN")} was deducted from the centre wallet.` : `${studentName(student)} is now a passout.`,
      });
      await load();
    } catch (e) {
      toast({ title: "Could not generate certificate", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reprint = async (c: IssuedCertificate) => {
    try {
      await printFor(c.studentId, { issueDate: c.issueDate, examConductedDate: c.examConductedDate, certificateNo: c.certificateNo });
    } catch (e) {
      toast({ title: "Could not print", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  type Row = IssuedCertificate & { name: string; enrollmentNo: string; courseName: string; centre: string; phone: string; grade: string };
  const rows: Row[] = issued.map((c) => {
    const st = studentOf.get(c.studentId);
    const fin = finalPass(c.studentId);
    return {
      ...c,
      name: studentName(st) || "—",
      enrollmentNo: st?.enrollmentNo || st?.applicationNo || "—",
      courseName: courseOf.get(st?.courseId || "")?.name || "—",
      centre: branchOf.get(c.branchId)?.name || "—",
      phone: st?.phone || "",
      grade: fin ? `${fin.percentage}% · ${fin.grade}` : "—",
    };
  });
  const columns: Column<Row>[] = [
    { key: "enrollmentNo", header: "Enrollment No", sortable: true, cell: (r) => <span className="font-mono text-xs">{r.enrollmentNo}</span> },
    { key: "name", header: "Student", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "courseName", header: "Course" },
    ...(passoutOnly
      ? [{ key: "phone", header: "Contact" } as Column<Row>, { key: "grade", header: "Final result" } as Column<Row>]
      : [
          { key: "certificateNo", header: "Certificate No", cell: (r: Row) => <span className="font-mono text-xs">{r.certificateNo || "—"}</span> } as Column<Row>,
          { key: "issueDate", header: "Issue date", sortable: true, cell: (r: Row) => shown(r.issueDate) } as Column<Row>,
          { key: "amount", header: "Fee", cell: (r: Row) => (r.amount ? `₹${r.amount.toLocaleString("en-IN")}` : "Free") } as Column<Row>,
        ]),
    { key: "centre", header: "Institute" },
  ];

  return (
    <AppLayout>
      <PageHeader
        title={passoutOnly ? "Passout Students" : "Certificates"}
        description={passoutOnly ? "Students whose course completion certificate has been issued" : "Issue completion certificates on the passed final result"}
        breadcrumbs={[{ label: passoutOnly ? "Student Management" : "Certificate & Marksheet" }, { label: passoutOnly ? "Passout Students" : "Certificates" }]}
      />
      {!passoutOnly && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Generate certificate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Centre</Label>
                <Select value={branchId} onValueChange={(v) => { setBranchId(v); setStudentId(""); }} disabled={!!ownBranch}>
                  <SelectTrigger><SelectValue placeholder="Select centre" /></SelectTrigger>
                  <SelectContent searchable searchPlaceholder="Search centre…">{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={(v) => { setStudentId(v); setExamDate(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {studentName(s)}{s.enrollmentNo ? ` · ${s.enrollmentNo}` : ""}
                        {issuedFor(s.id) ? " · issued" : finalPass(s.id) ? " · eligible" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Issue date</Label>
                <DatePicker value={issueDate} onChange={setIssueDate} />
              </div>
              <div className="space-y-2">
                <Label>Examination conducted date</Label>
                <DatePicker value={examDate} onChange={setExamDate} />
              </div>
            </div>
            {student && (
              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                <p className="font-medium">{studentName(student)} · {courseOf.get(student.courseId)?.name || "No course"}</p>
                <p className="text-muted-foreground">
                  {already
                    ? `Certificate ${already.certificateNo || ""} already issued on ${shown(already.issueDate)} — printing it again is free.`
                    : sheet
                      ? `Final result: ${sheet.percentage}% · Grade ${sheet.grade} · PASS. ${fee > 0 ? `₹${fee.toLocaleString("en-IN")} will be deducted from ${branchOf.get(student.branchId)?.name || "the centre"}'s wallet${balance !== null ? ` (balance ₹${balance.toLocaleString("en-IN")})` : ""}.` : "No certificate fee for this centre."}`
                      : hasSheets(student.id)
                        ? "No passed final-term result yet — the certificate cannot be issued."
                        : "No result on the new Results page; the older published exams will be checked."}
                </p>
              </div>
            )}
            {short && (
              <p className="text-sm text-destructive">
                Wallet balance ₹{balance?.toLocaleString("en-IN")} is less than the ₹{fee.toLocaleString("en-IN")} certificate fee.{" "}
                <Link to="/branch/wallet" className="font-semibold underline">Recharge the wallet</Link> first.
              </p>
            )}
            <Button onClick={generate} disabled={busy || !student || short || (hasSheets(studentId) && !sheet && !already)}>
              {busy ? "Working…" : already ? "Reprint certificate" : "Generate certificate"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{passoutOnly ? "Passout students" : "Issued certificates"} <Badge variant="secondary" className="ml-2">{rows.length}</Badge></CardTitle></CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            columns={columns}
            searchPlaceholder="Search name, enrollment, certificate no…"
            filters={[{ label: "Course", key: "courseName" }, { label: "Institute", key: "centre" }]}
            actions={(r) => [{ label: "Print certificate", onClick: () => void reprint(r) }]}
            emptyMessage="No certificates issued yet."
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
