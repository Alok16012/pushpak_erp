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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";

type OnlineExam = typeof BLANK & { id: string; createdAt: string };

const COURSES = [
  { value: "cs", label: "Computer Science" },
  { value: "science", label: "Science" },
  { value: "commerce", label: "Commerce" },
];

const BATCHES = [
  { value: "2024-a", label: "2024-A" },
  { value: "2024-b", label: "2024-B" },
];

const BLANK = {
  title: "",
  code: "",
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

const SEED: OnlineExam[] = [
  {
    ...BLANK,
    id: "exam-seed-1",
    title: "Online Mid-Term Test",
    code: "OMT-2024-001",
    course: "cs",
    batch: "2024-a",
    startDate: "2025-01-15T09:00",
    endDate: "2025-01-15T10:00",
    duration: "60",
    totalQuestions: "50",
    totalMarks: "100",
    passingMarks: "35",
    questionPaper: "qp1",
    createdAt: "2025-01-02",
  },
];

export default function CreateOnlineExam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items, add, remove } = useLocalCollection<OnlineExam>("erp-online-exams", SEED);
  const [form, setForm] = useState(BLANK);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const create = () => {
    const required: Array<[keyof typeof BLANK, string]> = [
      ["title", "Exam Title"],
      ["code", "Exam Code"],
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
    if (items.some((e) => e.code.toLowerCase() === form.code.trim().toLowerCase())) {
      toast({ title: "Duplicate exam code", description: `${form.code} is already in use.`, variant: "destructive" });
      return;
    }
    add({ ...form, createdAt: new Date().toISOString().slice(0, 10) });
    setForm(BLANK);
    toast({ title: "Exam created", description: `${form.title} is scheduled and ready.` });
  };

  const reset = () => {
    setForm(BLANK);
    toast({ title: "Form reset", description: "Every field is back to its default." });
  };

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
                <div className="space-y-2">
                  <Label htmlFor="examCode">Exam Code *</Label>
                  <Input id="examCode" placeholder="e.g., OMT-2024-001" value={form.code} onChange={(e) => set("code", e.target.value)} />
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
                      {COURSES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                      {BATCHES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
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
              <CardTitle>Scheduled Exams ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No online exams created yet.</p>
              )}
              {items.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between gap-2 border rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{exam.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {exam.code} • {BATCHES.find((b) => b.value === exam.batch)?.label ?? exam.batch}
                      {exam.startDate ? ` • ${exam.startDate.replace("T", " ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary">{exam.duration || "?"} min</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        remove(exam.id);
                        toast({ title: "Exam removed", description: `${exam.title} was deleted.` });
                      }}
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
