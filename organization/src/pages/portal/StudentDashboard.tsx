import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarCheck, FileCheck, IndianRupee, Megaphone, Video } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocalCollection, useLocalState } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import {
  ATTENDANCE_SEED, CLASS_SEED, INVOICE_SEED, NOTICES, PORTAL_KEYS, PROFILE_SEED, RESULT_SEED,
  attendanceSummary, classState, feeSummary, money, resultSummary,
  type AttendanceDay, type PortalClass, type PortalInvoice, type PortalResult, type StudentProfile,
} from "@/data/student-portal";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function StudentDashboard() {
  const { toast } = useToast();
  const [profile] = useLocalState<StudentProfile>(PORTAL_KEYS.profile, PROFILE_SEED);
  const { items: attendance } = useLocalCollection<AttendanceDay>(PORTAL_KEYS.attendance, ATTENDANCE_SEED);
  const { items: invoices } = useLocalCollection<PortalInvoice>(PORTAL_KEYS.fees, INVOICE_SEED);
  const { items: results } = useLocalCollection<PortalResult>(PORTAL_KEYS.results, RESULT_SEED);
  const { items: classes } = useLocalCollection<PortalClass>(PORTAL_KEYS.classes, CLASS_SEED);

  const presence = attendanceSummary(attendance);
  const fees = feeSummary(invoices);
  const scores = resultSummary(results);
  // The next thing that actually happens: a class running now outranks one later.
  const agenda = [...classes]
    .filter((item) => classState(item) !== "completed")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const next = agenda[0];
  const recent = [...results].sort((a, b) => +new Date(b.examDate) - +new Date(a.examDate)).slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const join = (item: PortalClass) => {
    window.open(item.link, "_blank", "noopener");
    toast({ title: `Joining ${item.subject}`, description: `${item.platform} opened in a new tab.` });
  };

  const stats = [
    { label: "Attendance", value: `${presence.percentage}%`, note: `${presence.present + presence.late} of ${presence.total} sessions`, icon: CalendarCheck, to: "/me/attendance" },
    { label: "Fees outstanding", value: money(fees.due), note: fees.overdue ? `${money(fees.overdue)} overdue` : "nothing overdue", icon: IndianRupee, to: "/me/fees" },
    { label: "Average score", value: `${scores.percentage}%`, note: `${scores.exams.length} exams recorded`, icon: FileCheck, to: "/me/results" },
    { label: "Classes ahead", value: agenda.length, note: next ? when(next.startsAt) : "nothing scheduled", icon: Video, to: "/me/classes" },
  ];

  return (
    <AppLayout>
      <section className="mb-5">
        <p className="eyebrow-muted mb-2.5">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{greeting}, {profile.name.split(" ")[0]}.</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{profile.course} · {profile.batch} · {profile.branch} · Enrolment {profile.enrollmentNo}</p>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group">
            <Card className="h-full transition-colors hover:border-brand/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="eyebrow pt-1">{stat.label}</p>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand/12 group-hover:text-brand-ink"><stat.icon className="h-4 w-4" /></span>
                </div>
                <p className="metric mt-4">{stat.value}</p>
                <p className="mt-3 text-xs text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Your timetable</CardTitle><p className="mt-1 text-xs text-muted-foreground">Live and upcoming sessions for {profile.batch}</p></div>
            <Button variant="outline" size="sm" asChild><Link to="/me/classes">All classes</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {agenda.slice(0, 4).map((item) => {
              const state = classState(item);
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{item.subject}</p>{state === "live" && <Badge className="bg-destructive text-destructive-foreground">Live now</Badge>}</div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.topic} · {item.faculty}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{when(item.startsAt)} · {item.minutes} min · {item.platform}</p>
                  </div>
                  <Button size="sm" variant={state === "live" ? "default" : "outline"} onClick={() => join(item)}>Join</Button>
                </div>
              );
            })}
            {!agenda.length && <p className="py-6 text-center text-sm text-muted-foreground">No sessions scheduled. Recordings of past classes are on the classes page.</p>}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Attendance this term</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 flex items-end gap-2.5"><span className="metric">{presence.percentage}%</span><span className={presence.percentage >= 75 ? "delta delta-up mb-1.5" : "delta delta-down mb-1.5"}>{presence.percentage >= 75 ? "Above requirement" : "Below 75%"}</span></div>
              <Progress value={presence.percentage} className="h-2" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[{ label: "Present", value: presence.present }, { label: "Late", value: presence.late }, { label: "Absent", value: presence.absent }].map((cell) => (
                  <div key={cell.label} className="rounded-xl bg-muted/60 p-2"><p className="text-lg font-semibold tabular">{cell.value}</p><p className="text-[11px] text-muted-foreground">{cell.label}</p></div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Fees</CardTitle><Button size="sm" asChild><Link to="/me/fees">Pay now</Link></Button></CardHeader>
            <CardContent>
              <p className="metric">{money(fees.due)}</p>
              <p className="mt-1 text-xs text-muted-foreground">outstanding of {money(fees.billed)} billed · {money(fees.paid)} received</p>
              {fees.overdue > 0 && <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-2.5 text-xs text-destructive">{money(fees.overdue)} is past its due date.</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Latest results</CardTitle><Button variant="ghost" size="sm" asChild><Link to="/me/results">Open<ArrowUpRight /></Link></Button></CardHeader>
          <CardContent className="space-y-1">
            {recent.map((result) => (
              <div key={result.id} className="flex items-center gap-3 border-b py-3 last:border-0">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{result.subject}</p><p className="text-xs text-muted-foreground">{result.exam} · {new Date(result.examDate).toLocaleDateString("en-IN")}</p></div>
                <span className="tabular text-sm font-semibold">{result.marks}/{result.maxMarks}</span>
                <Badge variant={result.marks >= result.passMarks ? "secondary" : "destructive"}>{result.marks >= result.passMarks ? "Pass" : "Review"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" />Notices</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {NOTICES.map((notice) => (
              <div key={notice.id} className="border-b py-3 last:border-0">
                <p className="text-sm font-semibold">{notice.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{notice.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(notice.date).toLocaleDateString("en-IN")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
