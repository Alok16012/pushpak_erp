import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Clock3,
  Download,
  RotateCcw,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNo?: string;
  course?: { name: string };
  batch?: { id: string; name: string };
  attendance: Array<{ status: Status; remarks?: string }>;
};
const statusStyle: Record<Status, string> = {
  PRESENT: "bg-emerald-500 text-white",
  ABSENT: "bg-red-500 text-white",
  LATE: "bg-amber-400 text-black",
  EXCUSED: "bg-violet-500 text-white",
};
export default function Attendance() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("all");
  const [saving, setSaving] = useState(false);
  const load = () =>
    api<Student[]>(`/core/attendance?date=${date}`)
      .then((data) => {
        setStudents(data);
        setMarks(
          Object.fromEntries(
            data.map((s) => [s.id, s.attendance[0]?.status || "PRESENT"]),
          ),
        );
      })
      .catch((e) =>
        toast({
          title: "Attendance unavailable",
          description: e.message,
          variant: "destructive",
        }),
      );
  useEffect(() => {
    void load();
  }, [date]);
  const batches = useMemo(
    () =>
      Array.from(
        new Map(
          students.filter((s) => s.batch).map((s) => [s.batch!.id, s.batch!]),
        ).values(),
      ),
    [students],
  );
  const visible = students.filter(
    (s) =>
      (batch === "all" || s.batch?.id === batch) &&
      `${s.firstName} ${s.lastName} ${s.enrollmentNo}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const counts = (Object.values(marks) as Status[]).reduce<
    Record<string, number>
  >((a, s) => ((a[s] = (a[s] || 0) + 1), a), {});
  const save = async () => {
    setSaving(true);
    try {
      await api("/core/attendance", {
        method: "POST",
        body: JSON.stringify({
          date,
          records: visible.map((s) => ({
            studentId: s.id,
            status: marks[s.id],
          })),
        }),
      });
      toast({
        title: "Attendance saved",
        description: `${visible.length} student records updated for ${new Date(date).toLocaleDateString()}.`,
      });
    } catch (e) {
      toast({
        title: "Could not save attendance",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const exportCsv = () => {
    const csv = [
      "Date,Enrollment,Student,Batch,Status",
      ...visible.map((s) =>
        [
          date,
          s.enrollmentNo || "",
          `${s.firstName} ${s.lastName}`,
          s.batch?.name || "",
          marks[s.id],
        ]
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ].join("\n");
    const u = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = `attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <AppLayout>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
            Attendance
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-.04em]">
            Daily class register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review everyone at once, then save a complete register.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Export
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save />
            {saving ? "Saving…" : "Save register"}
          </Button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          { l: "Students", v: visible.length, c: "" },
          { l: "Present", v: counts.PRESENT || 0, c: "text-emerald-500" },
          { l: "Late", v: counts.LATE || 0, c: "text-amber-500" },
          { l: "Absent", v: counts.ABSENT || 0, c: "text-red-500" },
        ].map((x) => (
          <Card key={x.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{x.l}</p>
              <p className={`mt-1 text-2xl font-semibold ${x.c}`}>{x.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="grid gap-3 border-b p-4 md:grid-cols-[180px_220px_1fr_auto]">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students…"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setMarks(
                  Object.fromEntries(visible.map((s) => [s.id, "PRESENT"])),
                )
              }
            >
              <Check />
              Mark all present
            </Button>
          </div>
          <div className="divide-y">
            {visible.map((s) => (
              <div
                key={s.id}
                className="grid items-center gap-3 p-4 md:grid-cols-[1fr_1fr_400px]"
              >
                <div>
                  <p className="font-semibold">
                    {s.firstName} {s.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.enrollmentNo || "Application pending"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.batch?.name || "No batch"} ·{" "}
                  {s.course?.name || "No course"}
                </p>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
                  {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as Status[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                        className={`rounded-lg px-2 py-2 text-[10px] font-bold transition-all ${marks[s.id] === st ? statusStyle[st] + " shadow-sm" : "text-muted-foreground hover:bg-card"}`}
                      >
                        {st[0] + st.slice(1).toLowerCase()}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          {!visible.length && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No students match this selection.
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
