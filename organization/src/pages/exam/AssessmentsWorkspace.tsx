import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  admissionPdf,
  certificatePdf,
  marksheetPdf,
  type StudentDocument,
} from "@/lib/documents";
import { Award, Download, FileCheck2, GraduationCap, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getExams, createExam, submitExamResults, getStudents } from "@/lib/supabase/data";
type Exam = {
  id: string;
  name: string;
  subject: string;
  examDate: string;
  maxMarks: number;
  passMarks: number;
  status: string;
  courseId: string;
  course: { id: string; name: string };
  results: Array<{
    marks: number;
    studentId: string;
    student: { firstName: string; lastName: string; enrollmentNo?: string };
  }>;
};
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNo?: string;
  course?: { id: string; name: string };
};
type Course = { id: string; name: string; code: string };
type Batch = { id: string; name: string; code: string; course: { id: string } };

const blankExam = {
  courseId: "",
  batchId: "",
  name: "",
  subject: "",
  examDate: "",
  maxMarks: "100",
  passMarks: "40",
};
export default function AssessmentsWorkspace() {
  const { user } = useAuth();
  const branchId = user?.branchId || null;
  const orgId = user?.organizationId || null;
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentId, setStudentId] = useState("");
  const [draft, setDraft] = useState(blankExam);
  const [creating, setCreating] = useState(false);
  const [marksExamId, setMarksExamId] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    () =>
      Promise.all([
        getExams(branchId),
        getStudents(branchId, 1, 100),
        getCourses(orgId),
        getBatches(branchId),
      ])
        .then(([e, s, c, b]) => {
          setExams(e.data);
          setStudents(s.data);
          setCourses(c.data);
          setBatches(b.data);
          if (s.data[0]) setStudentId((current) => current || s.data[0].id);
        })
        .catch((e) =>
          toast({
            title: "Could not load academic records",
            description: e.message,
            variant: "destructive",
          }),
        ),
    [toast],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const published = exams.filter((e) => e.status === "PUBLISHED");
  const results = useMemo(
    () => exams.flatMap((e) => e.results.map((r) => ({ ...r, exam: e }))),
    [exams],
  );
  const selectedExam = exams.find((e) => e.id === marksExamId);
  // The API rejects results for students outside the exam's course, so only
  // offer the students who are actually eligible.
  const examStudents = useMemo(
    () =>
      selectedExam
        ? students.filter((s) => s.course?.id === selectedExam.courseId)
        : [],
    [students, selectedExam],
  );

  const createExam = async () => {
    setCreating(true);
    try {
      await createExam(branchId, {
          courseId: draft.courseId,
          ...(draft.batchId ? { batchId: draft.batchId } : {}),
          name: draft.name,
          subject: draft.subject,
          examDate: draft.examDate,
          maxMarks: Number(draft.maxMarks),
          passMarks: Number(draft.passMarks),
        });
      toast({
        title: "Exam scheduled",
        description: `${draft.name} was created successfully.`,
      });
      setDraft(blankExam);
      await load();
    } catch (e) {
      toast({
        title: "Could not create exam",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const saveMarks = async (publish: boolean) => {
    if (!selectedExam) return;
    const results = Object.entries(marks)
      .filter(([, value]) => value !== "")
      .map(([student, value]) => ({ studentId: student, marks: Number(value) }));
    if (!results.length) {
      toast({
        title: "Nothing to save",
        description: "Enter marks for at least one student.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await submitExamResults(selectedExam.id, branchId, results, publish);
      toast({
        title: publish ? "Results published" : "Marks saved",
        description: `${results.length} student result(s) recorded.`,
      });
      await load();
    } catch (e) {
      toast({
        title: "Could not save marks",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generate = async (kind: "admission" | "marksheet" | "certificate") => {
    if (!studentId) return;
    try {
      const body = await api<StudentDocument>(
        `/core/documents/students/${studentId}`,
      );
      ({
        admission: admissionPdf,
        marksheet: marksheetPdf,
        certificate: certificatePdf,
      })[kind](body.data);
      toast({
        title: "PDF generated",
        description: `The ${kind} is ready in Downloads.`,
      });
    } catch (e) {
      toast({
        title: "Document failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };
  return (
    <AppLayout>
      <PageHeader
        title="Assessments & Documents"
        description="One workspace from examination to verified student documents"
        breadcrumbs={[
          { label: "Academics" },
          { label: "Assessments & Documents" },
        ]}
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {(
          [
            ["Published exams", published.length, FileCheck2],
            ["Recorded results", results.length, GraduationCap],
            ["Ready documents", 3, Award],
          ] satisfies Array<[string, number, LucideIcon]>
        ).map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="create">Create exam</TabsTrigger>
          <TabsTrigger value="marks">Enter marks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Published results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exams.map((e) => (
                <div key={e.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{e.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.course.name} ·{" "}
                        {new Date(e.examDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Badge>{e.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {e.results.map((r) => (
                      <div
                        key={r.student.enrollmentNo}
                        className="rounded-xl bg-muted/60 p-3"
                      >
                        <p className="text-sm font-medium">
                          {r.student.firstName} {r.student.lastName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.student.enrollmentNo}
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {r.marks}/{e.maxMarks}{" "}
                          <span
                            className={
                              r.marks >= e.passMarks
                                ? "text-emerald-600"
                                : "text-orange-600"
                            }
                          >
                            {r.marks >= e.passMarks ? "Pass" : "Review"}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Schedule an exam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select
                      value={draft.courseId}
                      onValueChange={(courseId) =>
                        setDraft((d) => ({ ...d, courseId, batchId: "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} · {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select
                      value={draft.batchId}
                      onValueChange={(batchId) =>
                        setDraft((d) => ({ ...d, batchId }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches
                          .filter((b) => b.course.id === draft.courseId)
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} · {b.code}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="examName">Exam name *</Label>
                    <Input
                      id="examName"
                      placeholder="e.g. Mid-Term Examination"
                      value={draft.name}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examSubject">Subject *</Label>
                    <Input
                      id="examSubject"
                      placeholder="e.g. Mathematics"
                      value={draft.subject}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, subject: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="examDate">Exam date *</Label>
                    <Input
                      id="examDate"
                      type="date"
                      value={draft.examDate}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, examDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxMarks">Maximum marks *</Label>
                    <Input
                      id="maxMarks"
                      type="number"
                      min={1}
                      value={draft.maxMarks}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, maxMarks: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passMarks">Pass marks *</Label>
                    <Input
                      id="passMarks"
                      type="number"
                      min={0}
                      value={draft.passMarks}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, passMarks: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  disabled={
                    creating ||
                    !draft.courseId ||
                    draft.name.trim().length < 2 ||
                    draft.subject.trim().length < 2 ||
                    !draft.examDate
                  }
                  onClick={createExam}
                >
                  <Save className="h-4 w-4" />
                  {creating ? "Creating…" : "Create exam"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="marks">
          <Card>
            <CardHeader>
              <CardTitle>Enter marks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xl space-y-2">
                <Label>Exam</Label>
                <Select
                  value={marksExamId}
                  onValueChange={(id) => {
                    setMarksExamId(id);
                    const exam = exams.find((e) => e.id === id);
                    setMarks(
                      Object.fromEntries(
                        (exam?.results ?? []).map((r) => [
                          r.studentId,
                          String(r.marks),
                        ]),
                      ),
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.subject} · {e.course.name} ·{" "}
                        {new Date(e.examDate).toLocaleDateString("en-IN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedExam && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {selectedExam.name} — maximum {selectedExam.maxMarks}, pass
                    mark {selectedExam.passMarks}. Leave a field blank to skip
                    that student.
                  </p>
                  {examStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No students are enrolled in {selectedExam.course.name} yet.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {examStudents.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 rounded-xl border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.enrollmentNo || "Pending"}
                            </p>
                          </div>
                          <Input
                            type="number"
                            className="w-24"
                            min={0}
                            max={selectedExam.maxMarks}
                            placeholder="—"
                            value={marks[s.id] ?? ""}
                            onChange={(e) =>
                              setMarks((m) => ({ ...m, [s.id]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={saving || examStudents.length === 0}
                      onClick={() => saveMarks(false)}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving…" : "Save marks"}
                    </Button>
                    <Button
                      className="gap-2"
                      disabled={saving || examStudents.length === 0}
                      onClick={() => saveMarks(true)}
                    >
                      <FileCheck2 className="h-4 w-4" />
                      Save &amp; publish results
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Generate verified documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xl space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Student record</p>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ·{" "}
                          {s.enrollmentNo || "Pending"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["Admission summary", "admission"],
                      ["Marksheet", "marksheet"],
                      ["Certificate", "certificate"],
                    ] satisfies Array<
                      [string, "admission" | "marksheet" | "certificate"]
                    >
                  ).map(([label, kind]) => (
                    <Button
                      key={kind}
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => generate(kind)}
                    >
                      <Download className="h-5 w-5" />
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Documents use live admission, course, payment, and published
                  result records. PDF files are generated locally and are
                  print-ready.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
