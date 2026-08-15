import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Users, Award, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { downloadCsv, downloadHtml, printHtml } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

interface OnlineExamResult {
  id: string;
  studentName: string;
  rollNo: string;
  examTitle: string;
  startTime: string;
  submitTime: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  score: number;
  maxScore: number;
  percentage: number;
  status: "completed" | "in_progress" | "absent";
}

const resultsData: OnlineExamResult[] = [
  { id: "1", studentName: "Alice Johnson", rollNo: "CS2024001", examTitle: "Mid-Term Online Test", startTime: "10:00 AM", submitTime: "10:45 AM", totalQuestions: 50, attempted: 48, correct: 42, wrong: 6, score: 84, maxScore: 100, percentage: 84, status: "completed" },
  { id: "2", studentName: "Bob Smith", rollNo: "CS2024002", examTitle: "Mid-Term Online Test", startTime: "10:00 AM", submitTime: "10:58 AM", totalQuestions: 50, attempted: 50, correct: 38, wrong: 12, score: 76, maxScore: 100, percentage: 76, status: "completed" },
  { id: "3", studentName: "Charlie Brown", rollNo: "CS2024003", examTitle: "Mid-Term Online Test", startTime: "10:00 AM", submitTime: "-", totalQuestions: 50, attempted: 25, correct: 0, wrong: 0, score: 0, maxScore: 100, percentage: 0, status: "in_progress" },
  { id: "4", studentName: "Diana Ross", rollNo: "CS2024004", examTitle: "Mid-Term Online Test", startTime: "-", submitTime: "-", totalQuestions: 50, attempted: 0, correct: 0, wrong: 0, score: 0, maxScore: 100, percentage: 0, status: "absent" },
  { id: "5", studentName: "Edward Wilson", rollNo: "CS2024005", examTitle: "Mid-Term Online Test", startTime: "10:00 AM", submitTime: "10:52 AM", totalQuestions: 50, attempted: 50, correct: 45, wrong: 5, score: 90, maxScore: 100, percentage: 90, status: "completed" },
];

const columns: Column<OnlineExamResult>[] = [
  {
    key: "studentName",
    header: "Student",
    sortable: true,
    cell: (result) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {result.studentName.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{result.studentName}</p>
          <p className="text-xs text-muted-foreground">{result.rollNo}</p>
        </div>
      </div>
    ),
  },
  {
    key: "attempted",
    header: "Progress",
    cell: (result) => (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>{result.attempted}/{result.totalQuestions}</span>
          <span>{Math.round((result.attempted / result.totalQuestions) * 100)}%</span>
        </div>
        <Progress value={(result.attempted / result.totalQuestions) * 100} className="h-2" />
      </div>
    ),
  },
  {
    key: "correct",
    header: "Correct/Wrong",
    cell: (result) => (
      <div className="flex gap-2">
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          ✓ {result.correct}
        </Badge>
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          ✗ {result.wrong}
        </Badge>
      </div>
    ),
  },
  {
    key: "score",
    header: "Score",
    sortable: true,
    cell: (result) => (
      <span className="font-medium">{result.score}/{result.maxScore}</span>
    ),
  },
  {
    key: "percentage",
    header: "Percentage",
    sortable: true,
    cell: (result) => (
      <Badge 
        variant="secondary"
        className={
          result.percentage >= 80 ? "bg-success/10 text-success" :
          result.percentage >= 60 ? "bg-info/10 text-info" :
          result.percentage >= 40 ? "bg-warning/10 text-warning" :
          "bg-destructive/10 text-destructive"
        }
      >
        {result.percentage}%
      </Badge>
    ),
  },
  {
    key: "submitTime",
    header: "Timing",
    cell: (result) => (
      <div className="text-sm">
        <p>Start: {result.startTime}</p>
        <p className="text-muted-foreground">Submit: {result.submitTime}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (result) => <StatusBadge status={result.status} />,
  },
];

/** A deterministic per-question breakdown, so "View Answers" shows a real sheet. */
const answerSheet = (result: OnlineExamResult) =>
  Array.from({ length: result.totalQuestions }, (_, index) => {
    const attempted = index < result.attempted;
    const correct = attempted && index < result.correct;
    return {
      question: index + 1,
      response: attempted ? String.fromCharCode(65 + ((index * 3 + result.rollNo.length) % 4)) : "—",
      verdict: !attempted ? ("skipped" as const) : correct ? ("correct" as const) : ("wrong" as const),
      marks: correct ? result.maxScore / result.totalQuestions : 0,
    };
  });

const reportHtml = (result: OnlineExamResult) => `
  <p><strong>${result.studentName}</strong> · ${result.rollNo}</p>
  <table>
    <tr><td>Exam</td><td>${result.examTitle}</td></tr>
    <tr><td>Started</td><td>${result.startTime}</td></tr>
    <tr><td>Submitted</td><td>${result.submitTime}</td></tr>
    <tr><td>Attempted</td><td>${result.attempted} of ${result.totalQuestions}</td></tr>
    <tr><td>Correct / Wrong</td><td>${result.correct} / ${result.wrong}</td></tr>
    <tr><td>Score</td><td>${result.score} / ${result.maxScore} (${result.percentage}%)</td></tr>
    <tr><td>Status</td><td>${result.status.replace("_", " ")}</td></tr>
  </table>`;

export default function OnlineExamMarks() {
  const { toast } = useToast();
  const [details, setDetails] = useState<OnlineExamResult | null>(null);
  const [answers, setAnswers] = useState<OnlineExamResult | null>(null);

  const downloadReport = (result: OnlineExamResult) => {
    downloadHtml(
      `result-${result.rollNo}.html`,
      `${result.examTitle} — ${result.studentName}`,
      reportHtml(result),
    );
    toast({ title: "Report downloaded", description: `result-${result.rollNo}.html` });
  };

  const exportResults = () => {
    downloadCsv(
      "online-exam-results.csv",
      resultsData.map((result) => ({
        Student: result.studentName,
        "Roll No": result.rollNo,
        Exam: result.examTitle,
        Attempted: result.attempted,
        Correct: result.correct,
        Wrong: result.wrong,
        Score: result.score,
        "Max Score": result.maxScore,
        Percentage: result.percentage,
        Status: result.status,
      })),
    );
    toast({ title: "Results exported", description: `${resultsData.length} rows written to CSV.` });
  };

  const handleActions = (result: OnlineExamResult) => [
    { label: "View Details", onClick: () => setDetails(result) },
    {
      label: "View Answers",
      onClick: () => {
        if (result.status === "absent") {
          toast({
            title: "No answer sheet",
            description: `${result.studentName} did not attempt this exam.`,
            variant: "destructive",
          });
          return;
        }
        setAnswers(result);
      },
    },
    { label: "Download Report", onClick: () => downloadReport(result) },
    { label: "Print Report", onClick: () => printHtml(`${result.examTitle} — ${result.studentName}`, reportHtml(result)) },
  ];

  const completed = resultsData.filter((r) => r.status === "completed");
  const sheet = answers ? answerSheet(answers) : [];

  return (
    <AppLayout>
      <PageHeader
        title="Online Exam Marks"
        description="View and analyze online examination results"
        breadcrumbs={[
          { label: "Online Exam", href: "/online-exam/create" },
          { label: "Exam Marks" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={exportResults}>
            <Download className="h-4 w-4" />
            Export Results
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard title="Total Students" value={resultsData.length} subtitle="Registered for exam" icon={Users} variant="primary" />
        <StatsCard title="Completed" value={completed.length} subtitle="Submitted successfully" icon={Award} variant="success" />
        <StatsCard
          title="In Progress"
          value={resultsData.filter((r) => r.status === "in_progress").length}
          subtitle="Currently attempting"
          icon={Clock}
          variant="info"
        />
        <StatsCard
          title="Absent"
          value={resultsData.filter((r) => r.status === "absent").length}
          subtitle="Did not attempt"
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mid-Term Online Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={resultsData}
            columns={columns}
            searchPlaceholder="Search students..."
            actions={handleActions}
          />
        </CardContent>
      </Card>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.studentName}</DialogTitle>
            <DialogDescription>{details?.rollNo} · {details?.examTitle}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Started", details.startTime],
                ["Submitted", details.submitTime],
                ["Attempted", `${details.attempted} of ${details.totalQuestions}`],
                ["Correct / Wrong", `${details.correct} / ${details.wrong}`],
                ["Score", `${details.score} / ${details.maxScore}`],
                ["Percentage", `${details.percentage}%`],
                ["Status", details.status.replace("_", " ")],
                [
                  "Accuracy",
                  details.attempted ? `${Math.round((details.correct / details.attempted) * 100)}%` : "—",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => details && downloadReport(details)}>Download report</Button>
            <Button
              onClick={() => {
                setAnswers(details);
                setDetails(null);
              }}
              disabled={details?.status === "absent"}
            >
              View answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!answers} onOpenChange={(open) => !open && setAnswers(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Answer sheet — {answers?.studentName}</DialogTitle>
            <DialogDescription>
              {answers?.attempted} of {answers?.totalQuestions} attempted · {answers?.correct} correct
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Q</th>
                  <th className="p-2 text-left">Response</th>
                  <th className="p-2 text-left">Result</th>
                  <th className="p-2 text-right">Marks</th>
                </tr>
              </thead>
              <tbody>
                {sheet.map((row) => (
                  <tr key={row.question} className="border-t">
                    <td className="p-2">{row.question}</td>
                    <td className="p-2">{row.response}</td>
                    <td className="p-2">
                      <Badge
                        variant="outline"
                        className={
                          row.verdict === "correct"
                            ? "bg-success/10 text-success border-success/20"
                            : row.verdict === "wrong"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : ""
                        }
                      >
                        {row.verdict}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{row.marks.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnswers(null)}>Close</Button>
            <Button
              onClick={() =>
                answers &&
                downloadCsv(
                  `answers-${answers.rollNo}.csv`,
                  sheet.map((row) => ({
                    Question: row.question,
                    Response: row.response,
                    Result: row.verdict,
                    Marks: row.marks.toFixed(1),
                  })),
                )
              }
            >
              Export sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
