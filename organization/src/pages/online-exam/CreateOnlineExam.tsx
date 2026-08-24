import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Monitor, Clock, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getExams, createExam, updateExam } from "@/lib/supabase/data";

type Course = { id: string; name: string; code?: string };
type Batch = { id: string; name: string; code?: string; course?: { id: string; name: string } };

interface Exam {
  id: string;
  name: string;
  subject: string;
  examDate: string;
  maxMarks: number;
  passMarks: number;
  course?: { name: string };
  batch?: { name: string };
}

const BLANK = {
  title: "",
  course: "",
  batch: "",
  description: "",
  startDate: "",
  endDate: "",
  duration: "",
  totalQuestions: "",
  totalMarks: "",
  passingMarks: "",
  negativeMarking: "",
  shuffleQuestions: true,
  shuffleOptions: true,
  preventTabSwitch: false,
  fullScreen: false,
  webcam: false,
  questionPaper: "",
  showResult: true,
  showAnswers: false,
  allowReview: true,
  autoSubmit: true,
};

export default function CreateOnlineExam() {
  const { user } = useAuth();
  const orgId = user?.organizationId || null;
  const branchId = user?.branchId || null;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getCourses(user?.organizationId),
      getBatches(user?.branchId),
      getExams(user?.branchId),
    ])
      .then(([coursesData, batchesData, examsRes]) => {
        if (cancelled) return;
        setCourses(coursesData);
        setBatches(batchesData);
        setExams(examsRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        toast({ title: "Failed to load data", description: "Could not fetch courses, batches, or exams.", variant: "destructive" });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const create = async () => {
    const required: Array<[keyof typeof BLANK, string]> = [
      ["title", "Exam Title"],
      ["course", "Course"],
      ["batch", "Batch"],
      ["startDate", "Start Date & Time"],
      ["endDate", "End Date & Time"],
      ["duration", "Duration"],
      ["totalQuestions", "Total Questions"],
      ["totalMarks", "Total Marks"],
      ["passingMarks", "Passing Marks"],
    ];
    const missing = required.filter(([key]) => !String(form[key]).trim()).map(([, label]) => label);
    if (missing.length) {
      toast({ title: "Missing required fields", description: missing.join(", "), variant: "destructive" });
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast({ title: "Check the schedule", description: "The exam must end after it starts.", variant: "destructive" });
      return;
    }
    if (Number(form.passingMarks) > Number(form.totalMarks)) {
      toast({ title: "Check the marks", description: "Passing marks cannot exceed total marks.", variant: "destructive" });
      return;
    }
    if (exams.some((e) => e.name.toLowerCase() === form.title.trim().toLowerCase())) {
      toast({ title: "Duplicate exam name", description: `${form.title} is already in use.`, variant: "destructive" });
      return;
    }
    try {
      const subject = courses.find((c) => c.id === form.course)?.name ?? form.course;
      const maxMarks = Number(form.totalMarks);
      const passMarks = Number(form.passingMarks);
      const examDate = new Date(form.startDate);
      await createExam(user?.branchId, {
          courseId: form.course,
          batchId: form.batch || undefined,
          name: form.title,
          subject,
          examDate: examDate.toISOString(),
          maxMarks,
          passMarks,
        });
      const updated = await getExams(user?.branchId);
      setExams(updated.data);
      setForm(BLANK);
      toast({ title: "Exam created", description: `${form.title} is scheduled and ready.` });
    } catch {
      toast({ title: "Failed to create exam", description: "Please try again.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    const paper = exams.find((e) => e.id === id);
    if (!paper) return;
    try {
      await updateExam(id, user?.branchId, {
          status: "archived",
        });
      setExams((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Exam archived", description: `${paper.name} has been archived.` });
    } catch {
      toast({ title: "Failed to archive", description: "Please try again.", variant: "destructive" });
    }
  };

  const reset = () => {
    setForm(BLANK);
    toast({ title: "Form reset", description: "Every field is back to its default." });
  };

  const batchLabel = (batch: Batch) => batch.code ?? batch.name;

  return (
    <AppLayout>
      <PageHeader
        title="Create Online Exam"
        description="Set up a new online examination"
        breadcrumbs={[
          { label: "Online Exam", href: "/online-exam/create" },
          { label: "Create Exam" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="examTitle">Exam Title *</Label>
                  <Input id="examTitle" placeholder="e.g., Online Mid-Term Test" value={form.title} onChange={(e) => set("title", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select value={form.course} onValueChange={(v) => set("course", v)}>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch *</Label>
                  <Select value={form.batch} onValueChange={(v) => set("batch", v)}>
                    <SelectTrigger id="batch">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{batchLabel(b)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter exam description and instructions..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule & Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date & Time *</Label>
                  <Input id="startDate" type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date & Time *</Label>
                  <Input id="endDate" type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input id="duration" type="number" placeholder="60" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalQuestions">Total Questions *</Label>
                  <Input id="totalQuestions" type="number" placeholder="50" value={form.totalQuestions} onChange={(e) => set("totalQuestions", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalMarks">Total Marks *</Label>
                  <Input id="totalMarks" type="number" placeholder="100" value={form.totalMarks} onChange={(e) => set("totalMarks", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passingMarks">Passing Marks *</Label>
                  <Input id="passingMarks" type="number" placeholder="35" value={form.passingMarks} onChange={(e) => set("passingMarks", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="negativeMarking">Negative Marking</Label>
                  <Input id="negativeMarking" type="number" placeholder="0.25" step="0.25" value={form.negativeMarking} onChange={(e) => set("negativeMarking", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Shuffle Questions</Label>
                  <p className="text-sm text-muted-foreground">Randomize question order for each student</p>
                </div>
                <Switch checked={form.shuffleQuestions} onCheckedChange={(v) => set("shuffleQuestions", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Shuffle Options</Label>
                  <p className="text-sm text-muted-foreground">Randomize answer options</p>
                </div>
                <Switch checked={form.shuffleOptions} onCheckedChange={(v) => set("shuffleOptions", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prevent Tab Switch</Label>
                  <p className="text-sm text-muted-foreground">Warn or submit if student switches tabs</p>
                </div>
                <Switch checked={form.preventTabSwitch} onCheckedChange={(v) => set("preventTabSwitch", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Full Screen Mode</Label>
                  <p className="text-sm text-muted-foreground">Force full screen during exam</p>
                </div>
                <Switch checked={form.fullScreen} onCheckedChange={(v) => set("fullScreen", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Webcam Proctoring</Label>
                  <p className="text-sm text-muted-foreground">Enable webcam monitoring</p>
                </div>
                <Switch checked={form.webcam} onCheckedChange={(v) => set("webcam", v)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question Paper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Paper</Label>
                <Select
                  value={form.questionPaper}
                  onValueChange={(value) =>
                    value === "new" ? navigate("/online-exam/question-paper-builder") : set("questionPaper", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select question paper" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qp1">QP-2024-CS-001</SelectItem>
                    <SelectItem value="qp2">QP-2024-CS-002</SelectItem>
                    <SelectItem value="new">Create New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/online-exam/question-paper-builder")}>
                Build Question Paper
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exam Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="showResult" checked={form.showResult} onCheckedChange={(v) => set("showResult", v === true)} />
                <Label htmlFor="showResult" className="font-normal">Show result after submission</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="showAnswers" checked={form.showAnswers} onCheckedChange={(v) => set("showAnswers", v === true)} />
                <Label htmlFor="showAnswers" className="font-normal">Show correct answers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="allowReview" checked={form.allowReview} onCheckedChange={(v) => set("allowReview", v === true)} />
                <Label htmlFor="allowReview" className="font-normal">Allow question review</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="autoSubmit" checked={form.autoSubmit} onCheckedChange={(v) => set("autoSubmit", v === true)} />
                <Label htmlFor="autoSubmit" className="font-normal">Auto-submit on timeout</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" onClick={create}>
                <Save className="h-4 w-4" />
                Create Exam
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Exams ({exams.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">Loading exams...</p>}
              {!loading && exams.length === 0 && (
                <p className="text-sm text-muted-foreground">No online exams created yet.</p>
              )}
              {exams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between gap-2 border rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{exam.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {exam.course?.name ?? "—"} • {exam.batch?.name ?? "—"}
                      {exam.examDate ? ` • ${new Date(exam.examDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary">{exam.duration || "?"} min</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => remove(exam.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}