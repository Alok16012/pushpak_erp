"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2 } from "lucide-react";

interface AttendanceLog {
  id: string;
  date: string;
  status: string;
  remarks?: string;
  marked_at: string;
  student: { id: string; first_name: string; last_name: string; enrollment_no: string };
  marked_by: { id: string; full_name: string };
  branch: { name: string };
}

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const url = filterDate ? `/api/attendance/logs?date=${filterDate}` : "/api/attendance/logs";
      const res = await fetch(url);
      if (res.ok) setLogs(await res.json());
    } catch {
      toast({ title: "Could not load attendance logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filterDate]);

  // Group by date
  const grouped = logs.reduce<Record<string, AttendanceLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});

  return (
    <AppLayout>
      <PageHeader
        title="Attendance Logs"
        description="Review attendance history"
        breadcrumbs={[
          { label: "Attendance", href: "/attendance" },
          { label: "Attendance Logs" },
        ]}
        actions={
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-auto" />
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No attendance records found.</CardContent></Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayLogs]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <Badge variant="secondary">{dayLogs.length} records</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dayLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between rounded-xl border p-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-sm font-semibold">
                          {log.student.first_name[0]}{log.student.last_name?.[0] || ""}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{log.student.first_name} {log.student.last_name}</p>
                          <p className="text-xs text-muted-foreground">{log.student.enrollment_no || "—"}</p>
                        </div>
                      </div>
                      <Badge variant={log.status === "PRESENT" || log.status === "LATE" ? "default" : "destructive"}>{log.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
