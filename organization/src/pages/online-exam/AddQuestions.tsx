import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Trash2, Image, Upload, Download } from "lucide-react";
import { useState } from "react";
import { useLocalCollection, newId } from "@/hooks/use-local-collection";
import { downloadCsv, parseCsv, pickFile, pickImage } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

type QuestionType = "mcq" | "true-false" | "short" | "long";

/**
 * One entry of the question bank. The API does not model question banks yet, so
 * this lives in localStorage — see `use-local-collection`.
 */
export type Question = {
  id: string;
  type: QuestionType;
  subject: string;
  topic: string;
  text: string;
  image?: string;
  options?: string[];
  /** MCQ: index of the correct option. True/False: "true" | "false". */
  answer?: string;
  keywords?: string;
  wordLimit?: string;
  modelAnswer?: string;
  minWords?: string;
  maxWords?: string;
  difficulty: string;
  marks: string;
  negativeMarks?: string;
  timeLimit?: string;
  explanation?: string;
};

export const QUESTION_BANK_KEY = "erp-question-bank";

const SUBJECTS = [
  { value: "math", label: "Mathematics" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "english", label: "English" },
];

const TOPICS: Record<string, string[]> = {
  math: ["Algebra", "Geometry", "Calculus"],
  physics: ["Mechanics", "Optics", "Thermodynamics"],
  chemistry: ["Organic", "Inorganic", "Physical"],
  english: ["Grammar", "Comprehension", "Literature"],
};

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "MCQ",
  "true-false": "True/False",
  short: "Short Answer",
  long: "Long Answer",
};

export const QUESTION_SEED: Question[] = [
  {
    id: "q-seed-1",
    type: "mcq",
    subject: "math",
    topic: "Algebra",
    text: "If 2x + 6 = 18, what is the value of x?",
    options: ["4", "6", "8", "12"],
    answer: "1",
    difficulty: "easy",
    marks: "1",
    negativeMarks: "0.25",
    timeLimit: "60",
    explanation: "2x = 12, so x = 6.",
  },
  {
    id: "q-seed-2",
    type: "true-false",
    subject: "physics",
    topic: "Mechanics",
    text: "Acceleration due to gravity is the same on the Moon as on Earth.",
    answer: "false",
    difficulty: "easy",
    marks: "1",
  },
  {
    id: "q-seed-3",
    type: "short",
    subject: "chemistry",
    topic: "Organic",
    text: "Name the functional group present in ethanol.",
    keywords: "hydroxyl, -OH, alcohol",
    wordLimit: "20",
    difficulty: "medium",
    marks: "2",
  },
];

const BLANK_META = {
  subject: "",
  topic: "",
  difficulty: "",
  marks: "1",
  negativeMarks: "",
  timeLimit: "",
  explanation: "",
};

const blankOptions = () => [
  { id: newId("opt"), text: "" },
  { id: newId("opt"), text: "" },
  { id: newId("opt"), text: "" },
  { id: newId("opt"), text: "" },
];

export default function AddQuestions() {
  const { toast } = useToast();
  const { items, setItems, add, remove } = useLocalCollection<Question>(QUESTION_BANK_KEY, QUESTION_SEED);

  // Shared "Question Details" / "Question Settings" panel, used by the MCQ tab.
  const [meta, setMeta] = useState(BLANK_META);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [options, setOptions] = useState(blankOptions);
  const [correctId, setCorrectId] = useState("");

  // The other three tabs are self-contained forms.
  const [tf, setTf] = useState({ text: "", answer: "true" });
  const [short, setShort] = useState({ text: "", keywords: "", wordLimit: "" });
  const [long, setLong] = useState({ text: "", modelAnswer: "", minWords: "", maxWords: "" });

  const setMetaField = <K extends keyof typeof BLANK_META>(key: K, value: string) =>
    setMeta((m) => ({ ...m, [key]: value }));

  const resetMcq = () => {
    setText("");
    setImage("");
    setOptions(blankOptions());
    setCorrectId("");
  };

  const addImage = async () => {
    const picked = await pickImage("image/png,image/jpeg", 2 * 1024 * 1024);
    if (picked === "too-large") {
      toast({ title: "Image too large", description: "Question images must be 2MB or smaller.", variant: "destructive" });
      return;
    }
    if (picked) setImage(picked.dataUrl);
  };

  const addOption = () => {
    if (options.length >= 6) {
      toast({ title: "Limit reached", description: "A question can have at most six options.", variant: "destructive" });
      return;
    }
    setOptions((list) => [...list, { id: newId("opt"), text: "" }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      toast({ title: "At least two options", description: "An MCQ needs a minimum of two choices.", variant: "destructive" });
      return;
    }
    setOptions((list) => list.filter((o) => o.id !== id));
    if (correctId === id) setCorrectId("");
  };

  /** Validate + store an MCQ; returns false so callers can skip the form reset. */
  const saveMcq = () => {
    const filled = options.filter((o) => o.text.trim());
    if (!meta.subject || !text.trim() || !meta.difficulty) {
      toast({ title: "Missing details", description: "Subject, question text and difficulty are required.", variant: "destructive" });
      return false;
    }
    if (filled.length < 2) {
      toast({ title: "Not enough options", description: "Fill in at least two answer options.", variant: "destructive" });
      return false;
    }
    const correctIndex = options.findIndex((o) => o.id === correctId && o.text.trim());
    if (correctIndex < 0) {
      toast({ title: "No correct answer", description: "Select the radio button next to the correct option.", variant: "destructive" });
      return false;
    }
    // Store the answer against the filtered list so blank options never shift it.
    const kept = options.filter((o) => o.text.trim());
    add({
      type: "mcq",
      subject: meta.subject,
      topic: meta.topic,
      text: text.trim(),
      image: image || undefined,
      options: kept.map((o) => o.text.trim()),
      answer: String(kept.findIndex((o) => o.id === correctId)),
      difficulty: meta.difficulty,
      marks: meta.marks || "1",
      negativeMarks: meta.negativeMarks || undefined,
      timeLimit: meta.timeLimit || undefined,
      explanation: meta.explanation || undefined,
    });
    toast({ title: "Question saved", description: `Added to the ${TYPE_LABEL.mcq} bank.` });
    return true;
  };

  const saveAndClose = () => {
    if (saveMcq()) {
      resetMcq();
      setMeta(BLANK_META);
    }
  };

  const saveAndNext = () => {
    // Keep subject/topic/difficulty so a run of questions can be typed quickly.
    if (saveMcq()) resetMcq();
  };

  const saveTrueFalse = () => {
    if (!tf.text.trim()) {
      toast({ title: "Question required", description: "Enter the statement to be judged.", variant: "destructive" });
      return;
    }
    add({
      type: "true-false",
      subject: meta.subject || "general",
      topic: meta.topic,
      text: tf.text.trim(),
      answer: tf.answer,
      difficulty: meta.difficulty || "easy",
      marks: meta.marks || "1",
    });
    setTf({ text: "", answer: "true" });
    toast({ title: "Question saved", description: `Added to the ${TYPE_LABEL["true-false"]} bank.` });
  };

  const saveShort = () => {
    if (!short.text.trim()) {
      toast({ title: "Question required", description: "Enter the question text.", variant: "destructive" });
      return;
    }
    add({
      type: "short",
      subject: meta.subject || "general",
      topic: meta.topic,
      text: short.text.trim(),
      keywords: short.keywords || undefined,
      wordLimit: short.wordLimit || undefined,
      difficulty: meta.difficulty || "medium",
      marks: meta.marks || "2",
    });
    setShort({ text: "", keywords: "", wordLimit: "" });
    toast({ title: "Question saved", description: `Added to the ${TYPE_LABEL.short} bank.` });
  };

  const saveLong = () => {
    if (!long.text.trim()) {
      toast({ title: "Question required", description: "Enter the question text.", variant: "destructive" });
      return;
    }
    if (long.minWords && long.maxWords && Number(long.minWords) > Number(long.maxWords)) {
      toast({ title: "Check the word limits", description: "Minimum words cannot exceed maximum words.", variant: "destructive" });
      return;
    }
    add({
      type: "long",
      subject: meta.subject || "general",
      topic: meta.topic,
      text: long.text.trim(),
      modelAnswer: long.modelAnswer || undefined,
      minWords: long.minWords || undefined,
      maxWords: long.maxWords || undefined,
      difficulty: meta.difficulty || "hard",
      marks: meta.marks || "5",
    });
    setLong({ text: "", modelAnswer: "", minWords: "", maxWords: "" });
    toast({ title: "Question saved", description: `Added to the ${TYPE_LABEL.long} bank.` });
  };

  /**
   * Accepts the CSV this page exports, or a JSON array of the same shape, so a
   * bank can be moved between environments without retyping it.
   */
  const bulkImport = async () => {
    const file = await pickFile(".csv,.json,text/csv,application/json");
    if (!file) return;
    let rows: Array<Record<string, string>>;
    try {
      rows = file.name.endsWith(".json") ? JSON.parse(file.text) : parseCsv(file.text);
    } catch {
      toast({ title: "Could not read file", description: "The file is not valid CSV or JSON.", variant: "destructive" });
      return;
    }
    const imported = (Array.isArray(rows) ? rows : [])
      .filter((row) => String(row.text ?? "").trim())
      .map<Question>((row) => ({
        id: newId("q"),
        type: (["mcq", "true-false", "short", "long"] as const).includes(row.type as QuestionType)
          ? (row.type as QuestionType)
          : "mcq",
        subject: row.subject || "general",
        topic: row.topic || "",
        text: String(row.text).trim(),
        options: row.options ? String(row.options).split("|").map((o) => o.trim()).filter(Boolean) : undefined,
        answer: row.answer || undefined,
        difficulty: row.difficulty || "medium",
        marks: row.marks || "1",
        negativeMarks: row.negativeMarks || undefined,
        explanation: row.explanation || undefined,
      }));
    if (!imported.length) {
      toast({ title: "Nothing imported", description: "No rows with a `text` column were found.", variant: "destructive" });
      return;
    }
    setItems((list) => [...imported, ...list]);
    toast({ title: "Import complete", description: `${imported.length} question(s) added to the bank.` });
  };

  const exportBank = () =>
    downloadCsv(
      "question-bank.csv",
      items.map((q) => ({
        type: q.type,
        subject: q.subject,
        topic: q.topic,
        text: q.text,
        options: (q.options ?? []).join("|"),
        answer: q.answer ?? "",
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks ?? "",
        explanation: q.explanation ?? "",
      })),
      ["type", "subject", "topic", "text", "options", "answer", "difficulty", "marks", "negativeMarks", "explanation"],
    );

  const topics = TOPICS[meta.subject] ?? [];

  return (
    <AppLayout>
      <PageHeader
        title="Add Questions"
        description="Add questions to question bank"
        breadcrumbs={[
          { label: "Online Exam", href: "/online-exam/create" },
          { label: "Add Questions" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportBank} disabled={!items.length}>
              <Download className="h-4 w-4" />
              Export Bank
            </Button>
            <Button variant="outline" className="gap-2" onClick={bulkImport}>
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="mcq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="mcq">MCQ</TabsTrigger>
          <TabsTrigger value="true-false">True/False</TabsTrigger>
          <TabsTrigger value="short">Short Answer</TabsTrigger>
          <TabsTrigger value="long">Long Answer</TabsTrigger>
        </TabsList>

        <TabsContent value="mcq">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Question Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select
                        value={meta.subject}
                        onValueChange={(value) => {
                          setMetaField("subject", value);
                          setMetaField("topic", "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Topic/Chapter</Label>
                      <Select value={meta.topic} onValueChange={(v) => setMetaField("topic", v)} disabled={!topics.length}>
                        <SelectTrigger>
                          <SelectValue placeholder={topics.length ? "Select topic" : "Select a subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question">Question Text *</Label>
                    <Textarea
                      id="question"
                      placeholder="Enter your question here..."
                      rows={4}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>

                  {image && (
                    <img src={image} alt="Question attachment" className="max-h-40 rounded-md border object-contain" />
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={addImage}>
                      <Image className="h-4 w-4" />
                      {image ? "Replace Image" : "Add Image"}
                    </Button>
                    {image && (
                      <Button variant="ghost" size="sm" onClick={() => setImage("")}>Remove</Button>
                    )}
                    <span className="text-sm text-muted-foreground">Optional: Add an image to the question</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Answer Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={correctId} onValueChange={setCorrectId}>
                    {options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-3">
                        <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                        <div className="flex-1">
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            value={option.text}
                            onChange={(e) =>
                              setOptions((list) =>
                                list.map((o) => (o.id === option.id ? { ...o, text: e.target.value } : o)),
                              )
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeOption(option.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button variant="outline" size="sm" className="gap-2" onClick={addOption}>
                    <Plus className="h-4 w-4" />
                    Add Option
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Select the radio button next to the correct answer
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Question Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Difficulty Level *</Label>
                    <Select value={meta.difficulty} onValueChange={(v) => setMetaField("difficulty", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marks">Marks *</Label>
                    <Input id="marks" type="number" placeholder="1" value={meta.marks} onChange={(e) => setMetaField("marks", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="negativeMarks">Negative Marks</Label>
                    <Input id="negativeMarks" type="number" placeholder="0.25" step="0.25" value={meta.negativeMarks} onChange={(e) => setMetaField("negativeMarks", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (seconds)</Label>
                    <Input id="timeLimit" type="number" placeholder="60" value={meta.timeLimit} onChange={(e) => setMetaField("timeLimit", e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Explanation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add explanation for the correct answer (shown after submission)..."
                    rows={4}
                    value={meta.explanation}
                    onChange={(e) => setMetaField("explanation", e.target.value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" onClick={saveAndClose}>
                    <Save className="h-4 w-4" />
                    Save Question
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={saveAndNext}>
                    <Plus className="h-4 w-4" />
                    Save &amp; Add Another
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="true-false">
          <Card>
            <CardHeader>
              <CardTitle>True/False Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  placeholder="Enter your true/false question..."
                  rows={3}
                  value={tf.text}
                  onChange={(e) => setTf((f) => ({ ...f, text: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Correct Answer *</Label>
                <RadioGroup value={tf.answer} onValueChange={(v) => setTf((f) => ({ ...f, answer: v }))} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="font-normal">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="font-normal">False</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button className="gap-2" onClick={saveTrueFalse}>
                <Save className="h-4 w-4" />
                Save Question
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="short">
          <Card>
            <CardHeader>
              <CardTitle>Short Answer Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  placeholder="Enter your short answer question..."
                  rows={3}
                  value={short.text}
                  onChange={(e) => setShort((f) => ({ ...f, text: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Answer (Keywords)</Label>
                <Input
                  placeholder="Enter keywords separated by commas"
                  value={short.keywords}
                  onChange={(e) => setShort((f) => ({ ...f, keywords: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Word Limit</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={short.wordLimit}
                  onChange={(e) => setShort((f) => ({ ...f, wordLimit: e.target.value }))}
                />
              </div>
              <Button className="gap-2" onClick={saveShort}>
                <Save className="h-4 w-4" />
                Save Question
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="long">
          <Card>
            <CardHeader>
              <CardTitle>Long Answer Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  placeholder="Enter your long answer question..."
                  rows={4}
                  value={long.text}
                  onChange={(e) => setLong((f) => ({ ...f, text: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Model Answer</Label>
                <Textarea
                  placeholder="Enter the model answer for reference..."
                  rows={4}
                  value={long.modelAnswer}
                  onChange={(e) => setLong((f) => ({ ...f, modelAnswer: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Words</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={long.minWords}
                    onChange={(e) => setLong((f) => ({ ...f, minWords: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Words</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={long.maxWords}
                    onChange={(e) => setLong((f) => ({ ...f, maxWords: e.target.value }))}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={saveLong}>
                <Save className="h-4 w-4" />
                Save Question
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Question Bank ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions yet. Save one above or use Bulk Import.</p>
          )}
          {items.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-4 border rounded-lg p-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{TYPE_LABEL[q.type]}</Badge>
                  <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {SUBJECTS.find((s) => s.value === q.subject)?.label ?? q.subject}
                    {q.topic ? ` • ${q.topic}` : ""} • {q.marks} mark(s)
                  </span>
                </div>
                <p className="text-sm">{q.text}</p>
                {q.options && (
                  <p className="text-xs text-muted-foreground">
                    {q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("   ")}
                    {q.answer !== undefined && ` — correct: ${String.fromCharCode(65 + Number(q.answer))}`}
                  </p>
                )}
                {q.type === "true-false" && (
                  <p className="text-xs text-muted-foreground">Correct: {q.answer}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => remove(q.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
