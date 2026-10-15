import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canManageCourses } from "@/lib/roles";
import { getCourses } from "@/lib/supabase/data";
import {
  deleteCourseSubject,
  getCourseSubjects,
  reorderCourseSubjects,
  saveCourseSubject,
  setCourseTerms,
  subjectProblem,
  type SubjectInput,
} from "@/lib/supabase/examWorkflow";
import { hasPractical, hasTheory, termPlan, termsOf, type CourseSubject, type SubjectType } from "@/lib/examWorkflow";

type Course = {
  id: string;
  name: string;
  code?: string;
  durationMonths?: number;
  durationValue?: number;
  durationUnit?: string;
  termType?: string | null;
  termCount?: number | null;
};

const TYPES: Array<[SubjectType, string]> = [
  ["THEORY", "Theory"],
  ["PRACTICAL", "Practical"],
  ["BOTH", "Theory + Practical"],
];

const blankSubject = (courseId: string, term: number): SubjectInput => ({
  courseId,
  term,
  code: "",
  name: "",
  subjectType: "BOTH",
  theoryMax: 100,
  theoryMin: 35,
  practicalMax: 100,
  practicalMin: 35,
});

/**
 * Each course's papers, term by term. The schedule, admit card and marksheet
 * all read this list, so a subject added here appears on all three.
 */
export default function CourseSubjects() {
  const { user, view } = useAuth();
  const { toast } = useToast();
  // A centre (or the head office working as one) reads the subjects only.
  const canEdit = view === "admin" && canManageCourses(user?.role);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [term, setTerm] = useState(1);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<SubjectInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [termDraft, setTermDraft] = useState<{ type: string; count: string }>({ type: "AUTO", count: "" });

  useEffect(() => {
    getCourses(user?.organizationId ?? null)
      .then((r) => setCourses(r.data as Course[]))
      .catch((e) => toast({ title: "Could not load courses", description: e.message, variant: "destructive" }));
  }, [user?.organizationId, toast]);

  const course = courses.find((c) => c.id === courseId) || null;
  const terms = useMemo(() => termsOf(course), [course]);

  useEffect(() => {
    setTermDraft({ type: course?.termType || "AUTO", count: course?.termCount ? String(course.termCount) : "" });
    setTerm(1);
  }, [course]);

  const load = useCallback(async () => {
    if (!courseId) return setSubjects([]);
    setLoading(true);
    try {
      setSubjects(await getCourseSubjects(courseId));
    } catch (e) {
      toast({ title: "Could not load subjects", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const inTerm = subjects.filter((s) => s.term === term);
  const termMax = inTerm.reduce((sum, s) => sum + (hasTheory(s) ? s.theoryMax : 0) + (hasPractical(s) ? s.practicalMax : 0), 0);

  const save = async () => {
    if (!draft) return;
    const problem = subjectProblem(draft);
    if (problem) return toast({ title: "Check the subject", description: problem, variant: "destructive" });
    setSaving(true);
    try {
      await saveCourseSubject({
        ...draft,
        sortOrder: draft.id ? draft.sortOrder : inTerm.length + 1,
      });
      toast({ title: draft.id ? "Subject updated" : "Subject added", description: draft.name });
      setDraft(null);
      await load();
    } catch (e) {
      toast({ title: "Could not save subject", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: CourseSubject) => {
    if (!window.confirm(`Remove ${s.name}? Marksheets already made keep their marks.`)) return;
    try {
      await deleteCourseSubject(s.id);
      await load();
    } catch (e) {
      toast({ title: "Could not remove subject", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const move = async (index: number, by: number) => {
    const order = inTerm.map((s) => s.id);
    const target = index + by;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    try {
      await reorderCourseSubjects(order);
      await load();
    } catch (e) {
      toast({ title: "Could not reorder", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const saveTerms = async () => {
    if (!course) return;
    const type = termDraft.type === "AUTO" ? null : termDraft.type;
    const count = type === "YEAR" || type === "SEMESTER" ? Math.max(1, Number(termDraft.count) || 0) : null;
    if ((type === "YEAR" || type === "SEMESTER") && !Number(termDraft.count)) {
      return toast({ title: "How many terms?", description: "Enter the number of years or semesters.", variant: "destructive" });
    }
    try {
      await setCourseTerms(course.id, type, count);
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, termType: type, termCount: count } : c)));
      toast({ title: "Course terms saved", description: termsOf({ ...course, termType: type, termCount: count }).map((t) => t.label).join(", ") });
    } catch (e) {
      toast({ title: "Could not save terms", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const numberBox = (key: keyof SubjectInput, label: string) =>
    draft && (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input
          type="number"
          min={0}
          value={String(draft[key] ?? "")}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value === "" ? 0 : Number(e.target.value) })}
        />
      </div>
    );

  return (
    <AppLayout>
      <PageHeader
        title="Course Subjects"
        description="Each course's papers, year or semester wise, with theory and practical marks"
        breadcrumbs={[{ label: "Course Management" }, { label: "Course Subjects" }]}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {course && (
            <div className="space-y-2">
              <Label>Year / Semester</Label>
              <Select value={String(term)} onValueChange={(v) => setTerm(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {terms.map((t) => <SelectItem key={t.term} value={String(t.term)}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {course && canEdit && (
            <div className="space-y-2">
              <Label>Course runs in</Label>
              <div className="flex gap-2">
                <Select value={termDraft.type} onValueChange={(v) => setTermDraft((d) => ({ ...d, type: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">From duration ({termsOf({ ...course, termType: null }).length > 1 ? "years" : "one term"})</SelectItem>
                    <SelectItem value="SINGLE">One term</SelectItem>
                    <SelectItem value="YEAR">Years</SelectItem>
                    <SelectItem value="SEMESTER">Semesters</SelectItem>
                  </SelectContent>
                </Select>
                {(termDraft.type === "YEAR" || termDraft.type === "SEMESTER") && (
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    placeholder="No."
                    value={termDraft.count}
                    onChange={(e) => setTermDraft((d) => ({ ...d, count: e.target.value }))}
                  />
                )}
                <Button variant="outline" onClick={saveTerms}>Save</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {course && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{terms.find((t) => t.term === term)?.label} subjects</CardTitle>
              <p className="text-xs text-muted-foreground">
                {inTerm.length} subject{inTerm.length === 1 ? "" : "s"} · total {termMax} marks · {termPlan(course).type === "SINGLE" ? "one term" : `${terms.length} terms`}
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setDraft(blankSubject(course.id, term))}>
                <Plus className="mr-1.5 h-4 w-4" />Add subject
              </Button>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2">#</th>
                  <th className="p-2">Code</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-center">Theory min / max</th>
                  <th className="p-2 text-center">Practical min / max</th>
                  {canEdit && <th className="p-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {inTerm.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2 font-mono text-xs">{s.code || "—"}</td>
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2"><Badge variant="outline">{TYPES.find(([t]) => t === s.subjectType)?.[1]}</Badge></td>
                    <td className="p-2 text-center">{hasTheory(s) ? `${s.theoryMin} / ${s.theoryMax}` : "—"}</td>
                    <td className="p-2 text-center">{hasPractical(s) ? `${s.practicalMin} / ${s.practicalMax}` : "—"}</td>
                    {canEdit && (
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === inTerm.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDraft({ ...s })}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!inTerm.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {loading ? "Loading subjects…" : "No subjects for this term yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit subject" : "Add subject"}</DialogTitle>
            <DialogDescription>{course?.name} · {terms.find((t) => t.term === draft?.term)?.label}</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject code</Label>
                <Input value={draft.code} placeholder="e.g. DCA01" onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Year / Semester</Label>
                <Select value={String(draft.term)} onValueChange={(v) => setDraft({ ...draft, term: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => <SelectItem key={t.term} value={String(t.term)}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Subject name *</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Subject type</Label>
                <Select value={draft.subjectType} onValueChange={(v) => setDraft({ ...draft, subjectType: v as SubjectType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {draft.subjectType !== "PRACTICAL" && (
                <>
                  {numberBox("theoryMax", "Theory max marks")}
                  {numberBox("theoryMin", "Theory min (pass) marks")}
                </>
              )}
              {draft.subjectType !== "THEORY" && (
                <>
                  {numberBox("practicalMax", "Practical max marks")}
                  {numberBox("practicalMin", "Practical min (pass) marks")}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save subject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
