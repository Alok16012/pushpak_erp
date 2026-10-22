import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { printHtml } from "@/lib/export";
import { getStudentDocument } from "@/lib/supabase/data";
import { isFinalTerm, termLabel, termPlan, termsOf, type CourseSubject } from "@/lib/examWorkflow";
import {
  deleteAdmitCard,
  getAdmitCards,
  getCourseSubjects,
  getExamSchedules,
  saveAdmitCard,
  type AdmitCardRecord,
  type ExamSchedule,
} from "@/lib/supabase/examWorkflow";
import {
  ADMIT_CARD_TEMPLATES_KEY,
  admitCardSheetHtml,
  blankAdmitCardTemplate,
  type AdmitCardStudent,
  type AdmitCardTemplate,
  type Exam,
} from "@/data/admit-card-templates";
import { studentName, useExamData, type ExamStudent } from "./useExamData";

const readTemplates = (): AdmitCardTemplate[] => {
  try {
    const raw = localStorage.getItem(ADMIT_CARD_TEMPLATES_KEY);
    return raw ? (JSON.parse(raw) as AdmitCardTemplate[]).filter((t) => t.status === "active") : [];
  } catch {
    return [];
  }
};

const day = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

/**
 * Issues each student's admit card for a term: the roll number, tied to the
 * exam schedule of their centre, course, term and session. Printing uses the
 * institute's own admit card template.
 */
export default function AdmitCards() {
  const { toast } = useToast();
  const { user, ownBranch, branches, courses, sessions, students, courseOf, branchOf, studentOf, centreOf } = useExamData();
  const [branchId, setBranchId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [term, setTerm] = useState(1);
  const [session, setSession] = useState("");
  const [studentId, setStudentId] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [cards, setCards] = useState<AdmitCardRecord[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [busy, setBusy] = useState(false);
  const [templates] = useState(readTemplates);
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    if (ownBranch) setBranchId(ownBranch);
  }, [ownBranch]);
  useEffect(() => {
    if (!session && sessions[0]) setSession(sessions[0]);
  }, [sessions, session]);
  useEffect(() => {
    if (!templateId && templates[0]) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  const load = useCallback(async () => {
    try {
      const [c, s, sub] = await Promise.all([getAdmitCards({ branchId: ownBranch }), getExamSchedules(ownBranch), getCourseSubjects()]);
      setCards(c);
      setSchedules(s);
      setSubjects(sub);
    } catch (e) {
      toast({ title: "Could not load admit cards", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  }, [ownBranch, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const course = courseOf.get(courseId) || null;
  const terms = useMemo(() => termsOf(course), [course]);
  const candidates = students.filter((s) => (!branchId || s.branchId === branchId) && (!courseId || s.courseId === courseId));
  const schedule = schedules.find((s) => s.branchId === branchId && s.courseId === courseId && s.term === term && s.session === session);
  const issuedFor = (sid: string) => cards.find((c) => c.studentId === sid && c.term === term);

  useEffect(() => {
    const s = studentOf.get(studentId);
    setRollNo(issuedFor(studentId)?.rollNo || s?.rollNo || s?.enrollmentNo || s?.applicationNo || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, term, cards]);

  const issue = async (target: ExamStudent, roll: string) => {
    await saveAdmitCard(
      {
        studentId: target.id,
        branchId: target.branchId,
        courseId: target.courseId,
        term,
        session,
        rollNo: roll,
        examCentreId: schedule?.examCentreId || "",
        scheduleId: schedule?.id || "",
        isFinal: isFinalTerm(courseOf.get(target.courseId), term),
      },
      user?.name,
    );
  };

  const issueOne = async () => {
    const target = studentOf.get(studentId);
    if (!target) return toast({ title: "Choose the student", variant: "destructive" });
    setBusy(true);
    try {
      await issue(target, rollNo);
      toast({ title: "Admit card issued", description: `${studentName(target)} · Roll ${rollNo}` });
      await load();
    } catch (e) {
      toast({ title: "Could not issue admit card", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const issueAll = async () => {
    const pending = candidates.filter((s) => !issuedFor(s.id));
    if (!pending.length) return toast({ title: "Everyone here already has an admit card for this term." });
    if (!schedule) return toast({ title: "No exam schedule", description: "Create the schedule for this course, term and session first.", variant: "destructive" });
    if (!window.confirm(`Issue admit cards to ${pending.length} student(s)? Roll numbers will be their enrolment numbers.`)) return;
    setBusy(true);
    let done = 0;
    try {
      for (const s of pending) {
        const roll = s.rollNo || s.enrollmentNo || s.applicationNo;
        if (!roll) continue;
        await issue(s, roll);
        done += 1;
      }
      toast({ title: "Admit cards issued", description: `${done} of ${pending.length} issued${done < pending.length ? "; the rest have no enrolment number yet" : ""}.` });
      await load();
    } catch (e) {
      toast({ title: "Stopped issuing", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const print = async (records: AdmitCardRecord[]) => {
    if (!records.length) return;
    const template = templates.find((t) => t.id === templateId) || { ...blankAdmitCardTemplate(), id: "default", name: "Admit card", status: "active" as const };
    try {
      const first = await getStudentDocument(records[0].studentId, ownBranch);
      const institute = { name: first.data.branch.organization.name || first.data.branch.name, address: first.data.branch.address || "" };
      const sheets: string[] = [];
      for (const card of records) {
        const st = studentOf.get(card.studentId);
        const c = courseOf.get(card.courseId);
        const sch = schedules.find((s) => s.id === card.scheduleId);
        const centre = centreOf.get(card.examCentreId);
        const dates = (sch?.items || []).map((i) => i.date).filter(Boolean).sort();
        const exam: Exam = {
          value: card.id,
          label: `${c?.name || "Examination"} — ${termLabel(termPlan(c).type, card.term)}${card.session ? ` (${card.session})` : ""}`,
          window: dates.length ? `${day(dates[0])}${dates.length > 1 ? ` to ${day(dates[dates.length - 1])}` : ""}` : "To be announced",
          schedule: [
            ...(centre ? [{ subject: "Exam centre", when: [centre.name, centre.address].filter(Boolean).join(", ") }] : []),
            ...(sch?.items || []).map((i) => ({
              subject: subjects.find((s) => s.id === i.subjectId)?.name || "Paper",
              when: `${day(i.date)} ${i.time}`,
            })),
          ],
        };
        // The photo is not in the pick list (it would carry every student's
        // upload); it comes with the card's own document record.
        const docRecord = card.studentId === records[0].studentId ? first : await getStudentDocument(card.studentId, ownBranch);
        const student: AdmitCardStudent = {
          id: st?.enrollmentNo || st?.applicationNo || card.rollNo,
          name: studentName(st),
          class: c?.name || "",
          section: termLabel(termPlan(c).type, card.term),
          rollNo: card.rollNo,
          feeStatus: "paid",
          photo: docRecord.data.photo || undefined,
          qr: await QRCode.toDataURL(`admit:${st?.enrollmentNo || st?.applicationNo || card.rollNo}`, { margin: 1, width: 128 }),
        };
        sheets.push(admitCardSheetHtml({ ...template, liveExam: exam, institute }, [student]));
      }
      printHtml(`Admit card${records.length > 1 ? "s" : ""}`, sheets.join('<div style="page-break-after:always"></div>'));
    } catch (e) {
      toast({ title: "Could not print", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const remove = async (card: AdmitCardRecord) => {
    if (!window.confirm("Delete this admit card?")) return;
    try {
      await deleteAdmitCard(card.id);
      await load();
    } catch (e) {
      toast({ title: "Could not delete", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  type Row = AdmitCardRecord & { name: string; enrollmentNo: string; courseName: string; termName: string; centre: string; examCentre: string };
  const rows: Row[] = cards.map((c) => {
    const st = studentOf.get(c.studentId);
    const co = courseOf.get(c.courseId);
    return {
      ...c,
      name: studentName(st) || "—",
      enrollmentNo: st?.enrollmentNo || st?.applicationNo || "—",
      courseName: co?.name || "—",
      termName: termLabel(termPlan(co).type, c.term),
      centre: branchOf.get(c.branchId)?.name || "—",
      examCentre: centreOf.get(c.examCentreId)?.name || "—",
    };
  });
  const columns: Column<Row>[] = [
    { key: "enrollmentNo", header: "Enrollment No", sortable: true, cell: (r) => <span className="font-mono text-xs">{r.enrollmentNo}</span> },
    { key: "name", header: "Student", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "rollNo", header: "Roll No", cell: (r) => <span className="font-mono text-xs">{r.rollNo}</span> },
    { key: "courseName", header: "Course" },
    { key: "termName", header: "Year / Sem", cell: (r) => <span>{r.termName} {r.isFinal && <Badge variant="secondary" className="ml-1">Final</Badge>}</span> },
    { key: "session", header: "Session" },
    { key: "examCentre", header: "Exam centre" },
    { key: "centre", header: "Institute" },
  ];

  const pick = (label: string, value: string, onChange: (v: string) => void, options: Array<[string, string]>, placeholder: string, disabled = false) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent searchable={label === "Centre" || label === "Student" || undefined} searchPlaceholder={label === "Student" ? "Search student or enrollment…" : `Search ${label.toLowerCase()}…`}>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Admit Cards"
        description="Issue roll numbers from the exam schedule and print admit cards"
        breadcrumbs={[{ label: "Exam & Marks" }, { label: "Admit Cards" }]}
      />
      <Card className="mb-4">
        <CardHeader><CardTitle>Issue admit card</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pick("Centre", branchId, (v) => { setBranchId(v); setStudentId(""); }, branches.map((b) => [b.id, b.name]), "Select centre", !!ownBranch)}
            {pick("Course", courseId, (v) => { setCourseId(v); setTerm(1); setStudentId(""); }, courses.map((c) => [c.id, c.name]), "Select course")}
            {pick("Year / Semester", String(term), (v) => setTerm(Number(v)), terms.map((t) => [String(t.term), t.label]), "Select", !course)}
            {pick("Session", session, setSession, sessions.map((s) => [s, s]), "Select session")}
            {pick("Student", studentId, setStudentId, candidates.map((s) => [s.id, `${studentName(s)}${(s.enrollmentNo || s.applicationNo) ? ` · ${(s.enrollmentNo || s.applicationNo)}` : ""}${issuedFor(s.id) ? " ✓" : ""}`]), candidates.length ? "Select student" : "No students for this course")}
            <div className="space-y-2">
              <Label>Roll No.</Label>
              <Input value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="Enter roll no." />
            </div>
          </div>
          {course && (
            <p className={`text-sm ${schedule ? "text-muted-foreground" : "text-destructive"}`}>
              {schedule
                ? `Schedule found: ${schedule.items.length} paper(s) at ${centreOf.get(schedule.examCentreId)?.name || "the exam centre"}.`
                : "No exam schedule for this centre, course, term and session yet — create it under Exam Schedule first."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={issueOne} disabled={busy || !studentId || !schedule}>{issuedFor(studentId) ? "Update admit card" : "Issue admit card"}</Button>
            <Button variant="outline" onClick={issueAll} disabled={busy || !schedule || !candidates.length}>Issue to all students of this course</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Issued admit cards</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Print with</Label>
            <Select value={templateId || "default"} onValueChange={setTemplateId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {!templates.length && <SelectItem value="default">Standard layout</SelectItem>}
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            columns={columns}
            searchPlaceholder="Search name, enrollment, roll no…"
            filters={[
              { label: "Course", key: "courseName" },
              { label: "Session", key: "session" },
              { label: "Institute", key: "centre" },
            ]}
            actions={(r) => [
              { label: "Print", onClick: () => void print([r]) },
              { label: "Delete", onClick: () => void remove(r), destructive: true },
            ]}
            emptyMessage="No admit cards issued yet."
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
