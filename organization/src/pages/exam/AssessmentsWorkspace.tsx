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
import { api } from "@/lib/api";
import {
  admissionPdf,
  certificatePdf,
  marksheetPdf,
  type StudentDocument,
} from "@/lib/documents";
import { Award, Download, FileCheck2, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
type Exam = {
  id: string;
  name: string;
  subject: string;
  examDate: string;
  maxMarks: number;
  passMarks: number;
  status: string;
  course: { name: string };
  results: Array<{
    marks: number;
    student: { firstName: string; lastName: string; enrollmentNo?: string };
  }>;
};
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNo?: string;
  course?: { name: string };
};
export default function AssessmentsWorkspace() {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const load = useCallback(
    () =>
      Promise.all([
        api<Exam[]>("/core/exams"),
        api<Student[]>("/core/students?limit=100"),
      ])
        .then(([e, s]) => {
          setExams(e);
          setStudents(s);
          if (s[0]) setStudentId((current) => current || s[0].id);
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
  const generate = async (kind: "admission" | "marksheet" | "certificate") => {
    if (!studentId) return;
    try {
      const data = await api<StudentDocument>(
        `/core/documents/students/${studentId}`,
      );
      ({
        admission: admissionPdf,
        marksheet: marksheetPdf,
        certificate: certificatePdf,
      })[kind](data);
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
