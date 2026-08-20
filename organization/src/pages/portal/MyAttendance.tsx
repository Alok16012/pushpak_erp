import { useMemo, useState } from "react";
import { Download, Flag } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export";
import {
  ATTENDANCE_SEED, PORTAL_KEYS, attendanceSummary,
  type AttendanceDay, type PortalRequest,
} from "@/data/student-portal";

const TONE: Record<AttendanceDay["status"], "default" | "secondary" | "destructive" | "outline"> = {
  present: "secondary", late: "outline", absent: "destructive", holiday: "outline",
};
const monthKey = (date: string) => date.slice(0, 7);
const monthLabel = (key: string) =>
  new Date(`${key}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export default function MyAttendance() {
  const { toast } = useToast();
  const { items: days } = useLocalCollection<AttendanceDay>(PORTAL_KEYS.attendance, ATTENDANCE_SEED);
  const { items: requests, add: addRequest } = useLocalCollection<PortalRequest>(PORTAL_KEYS.requests, []);
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [dispute, setDispute] = useState<AttendanceDay | null>(null);
  const [reason, setReason] = useState("");

  const months = useMemo(() => [...new Set(days.map((day) => monthKey(day.date)))].sort().reverse(), [days]);
  const rows = days
    .filter((day) => (month === "all" || monthKey(day.date) === month) && (status === "all" || day.status === status))
    .sort((a, b) => b.date.localeCompare(a.date));
  // The headline percentage follows the month filter, so a term view and a
  // month view never disagree about what is on screen.
  const summary = attendanceSummary(days.filter((day) => month === "all" || monthKey(day.date) === month));
  const raised = new Set(requests.filter((request) => request.kind === "Attendance correction").map((request) => request.detail.split(" — ")[0]));

  const submitDispute = () => {
    if (!dispute) return;
    if (!reason.trim()) return toast({ title: "Add a reason", description: "Tell the office what happened on that day.", variant: "destructive" });
    addRequest({
      kind: "Attendance correction",
      detail: `${dispute.date} — ${dispute.subject}: ${reason.trim()}`,
      raisedAt: new Date().toISOString(),
      status: "open",
    });
    toast({ title: "Correction requested", description: `The office will review ${new Date(dispute.date).toLocaleDateString("en-IN")}.` });
    setDispute(null);
    setReason("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="My attendance"
        description="Every session marked against your roll number, and where to query one."
        breadcrumbs={[{ label: "My attendance" }]}
        actions={
          <Button variant="outline" onClick={() => downloadCsv(`attendance-${month === "all" ? "all" : month}.csv`, rows)} disabled={!rows.length}>
            <Download />Export CSV
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4"><p className="eyebrow">Attendance</p><p className="metric mt-3">{summary.percentage}%</p><Progress value={summary.percentage} className="mt-3 h-2" /><p className="mt-2 text-xs text-muted-foreground">{summary.percentage >= 75 ? "Meets the 75% requirement" : "Below the 75% requirement"}</p></CardContent></Card>
        {[{ label: "Present", value: summary.present }, { label: "Late", value: summary.late }, { label: "Absent", value: summary.absent }].map((cell) => (
          <Card key={cell.label}><CardContent className="p-4"><p className="eyebrow">{cell.label}</p><p className="metric mt-3">{cell.value}</p><p className="mt-2 text-xs text-muted-foreground">of {summary.total} counted sessions</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All months</SelectItem>{months.map((key) => <SelectItem key={key} value={key}>{monthLabel(key)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{["all", "present", "late", "absent", "holiday"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "All statuses" : value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
            <span className="self-center text-xs text-muted-foreground">{rows.length} session{rows.length === 1 ? "" : "s"}</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Query</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((day) => (
                  <TableRow key={day.id}>
                    <TableCell className="whitespace-nowrap font-medium">{new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</TableCell>
                    <TableCell>{day.subject}</TableCell>
                    <TableCell><Badge variant={TONE[day.status]} className="capitalize">{day.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {day.status === "absent" || day.status === "late" ? (
                        raised.has(day.date)
                          ? <span className="text-xs text-muted-foreground">Under review</span>
                          : <Button variant="ghost" size="sm" onClick={() => { setDispute(day); setReason(""); }}><Flag className="mr-1.5 h-3.5 w-3.5" />Raise</Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Nothing marked for this filter.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!dispute} onOpenChange={(open) => !open && setDispute(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request an attendance correction</DialogTitle></DialogHeader>
          {dispute && <p className="text-sm text-muted-foreground">{new Date(dispute.date).toLocaleDateString("en-IN", { dateStyle: "full" })} · {dispute.subject} · marked <span className="font-medium text-foreground">{dispute.status}</span></p>}
          <div className="space-y-2">
            <Label htmlFor="reason">What happened?</Label>
            <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="I attended the session but was marked absent — the faculty can confirm." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispute(null)}>Cancel</Button>
            <Button onClick={submitDispute}>Send to office</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
