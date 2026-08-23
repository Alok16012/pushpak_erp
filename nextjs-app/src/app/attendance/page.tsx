"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UsersRound, Loader2 } from "lucide-react";

interface AttendanceRecord {
  id: string;
  student: { id: string; firstName: string; lastName: string; enrollmentNo?: string };
  course: string | null;
  batch: { name: string } | null;
  attendance: { status: string; remarks?: string }[];
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${date}`);
      if (res.ok) setRecords(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [date]);

  const updateStatus = (studentId: string, status: string) => {
    setRecords(list => list.map(r => {
      if (r.id !== studentId) return r;
      return { ...r, attendance: [{ status }] };
    }));
  };

  const submitAttendance = async () => {
    setSaving(true);
    try {
      const payload = { date, records: records.map(r => ({ studentId: r.id, status: r.attendance[0]?.status || "PRESENT" })) };
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      alert("Attendance saved successfully!");
    } catch {
      alert("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Mark Attendance"
        description="Record daily attendance for students"
        breadcrumbs={[
          { label: "Attendance", href: "/attendance" },
          { label: "Mark Attendance" },
        ]}
        actions={
          <Button onClick={submitAttendance} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Attendance
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-auto" />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No students found for attendance.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5" />{records.length} Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {records.map(record => (
                <div key={record.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-sm font-semibold">
                      {record.student.firstName[0]}{record.student.lastName?.[0] || ""}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{record.student.firstName} {record.student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{record.student.enrollmentNo || "—"} {record.batch ? `· ${record.batch.name}` : ""}</p>
                    </div>
                  </div>
                  <Select value={record.attendance[0]?.status || "PRESENT"} onValueChange={(v) => updateStatus(record.id, v)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT"><Badge variant="default">Present</Badge></SelectItem>
                      <SelectItem value="ABSENT"><Badge variant="destructive">Absent</Badge></SelectItem>
                      <SelectItem value="LATE"><Badge variant="secondary">Late</Badge></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
