import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck, CalendarDays, FileText, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type HolidayType = "public_holiday" | "casual_leave" | "sick_leave" | "earned_leave" | "other";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  branchId: string;
}

interface Application {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  holidayType: HolidayType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: string;
}

const HOLIDAY_TYPES: { value: HolidayType; label: string }[] = [
  { value: "public_holiday", label: "Public Holiday" },
  { value: "casual_leave", label: "Casual Leave" },
  { value: "sick_leave", label: "Sick Leave" },
  { value: "earned_leave", label: "Earned Leave" },
  { value: "other", label: "Other" },
];

/** Seeded employee list matching the app's user metadata shape. */
const EMPLOYEES: Employee[] = [
  { id: "EMP-001", name: "Rahul Verma", email: "rahul@pushpak.local", department: "Administration", designation: "Office Manager", branchId: "branch-1" },
  { id: "EMP-002", name: "Priya Sharma", email: "priya@pushpak.local", department: "Academics", designation: "Faculty", branchId: "branch-1" },
  { id: "EMP-003", name: "Amit Patel", email: "amit@pushpak.local", department: "IT", designation: "System Admin", branchId: "branch-1" },
  { id: "EMP-004", name: "Sneha Gupta", email: "sneha@pushpak.local", department: "Accounts", designation: "Accountant", branchId: "branch-1" },
  { id: "EMP-005", name: "Vikram Singh", email: "vikram@pushpak.local", department: "Examination", designation: "Exam Coordinator", branchId: "branch-1" },
  { id: "EMP-006", name: "Kavita Joshi", email: "kavita@pushpak.local", department: "Science", designation: "Lab Incharge", branchId: "branch-1" },
  { id: "EMP-007", name: "Rajesh Kumar", email: "rajesh@pushpak.local", department: "Reception", designation: "Receptionist", branchId: "branch-1" },
  { id: "EMP-008", name: "Anita Desai", email: "anita@pushpak.local", department: "Library", designation: "Librarian", branchId: "branch-1" },
];

const STORAGE_KEY = "erp-holiday-applications";

const SEED_APPLICATIONS: Application[] = [
  { id: "HOL-1001", employeeId: "EMP-001", employeeName: "Rahul Verma", department: "Administration", designation: "Office Manager", holidayType: "public_holiday", fromDate: "2026-08-15", toDate: "2026-08-15", reason: "Independence Day", status: "approved", appliedAt: "2026-08-01 09:00" },
  { id: "HOL-1002", employeeId: "EMP-002", employeeName: "Priya Sharma", department: "Academics", designation: "Faculty", holidayType: "casual_leave", fromDate: "2026-08-20", toDate: "2026-08-21", reason: "Personal work", status: "pending", appliedAt: "2026-08-18 10:30" },
  { id: "HOL-1003", employeeId: "EMP-003", employeeName: "Amit Patel", department: "IT", designation: "System Admin", holidayType: "sick_leave", fromDate: "2026-08-25", toDate: "2026-08-26", reason: "Fever", status: "pending", appliedAt: "2026-08-24 08:15" },
];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

export default function HolidayApply() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [applications, setApplications] = useState<Application[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* fall through */ }
    return SEED_APPLICATIONS;
  });

  const [mode, setMode] = useState<"list" | "form">("list");
  const [employeeId, setEmployeeId] = useState("");
  const [holidayType, setHolidayType] = useState<HolidayType>("casual_leave");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  const selectedEmployee = useMemo(
    () => EMPLOYEES.find((e) => e.id === employeeId),
    [employeeId],
  );

  /** Auto-detect current logged-in employee by email. */
  useEffect(() => {
    if (!user?.email) return;
    const match = EMPLOYEES.find((e) => e.email.toLowerCase() === user.email!.toLowerCase());
    if (match) {
      setEmployeeId(match.id);
    }
  }, [user?.email]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(applications)); }, [applications]);

  useEffect(() => {
    if (selectedEmployee) {
      toast({ title: "Employee selected", description: `${selectedEmployee.name} — ${selectedEmployee.department}` });
    }
  }, [employeeId]);

  const reset = () => {
    setEmployeeId("");
    setHolidayType("casual_leave");
    setFromDate(new Date().toISOString().slice(0, 10));
    setToDate(new Date().toISOString().slice(0, 10));
    setReason("");
  };

  const submit = () => {
    if (!employeeId || !selectedEmployee) {
      toast({ title: "Employee ID required", description: "Select an employee to apply holiday.", variant: "destructive" });
      return;
    }
    if (!fromDate || !toDate) {
      toast({ title: "Dates required", description: "Select both from and to dates.", variant: "destructive" });
      return;
    }
    if (toDate < fromDate) {
      toast({ title: "Invalid dates", description: "To date cannot be before from date.", variant: "destructive" });
      return;
    }
    const entry: Application = {
      id: `HOL-${Math.floor(Math.random() * 9000 + 1000)}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      department: selectedEmployee.department,
      designation: selectedEmployee.designation,
      holidayType,
      fromDate,
      toDate,
      reason: reason.trim() || "—",
      status: "pending",
      appliedAt: new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
    };
    setApplications((list) => [entry, ...list]);
    toast({ title: "Holiday applied", description: `${entry.id} for ${selectedEmployee.name} submitted.` });
    reset();
    setMode("list");
  };

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [applications]);

  return (
    <AppLayout>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Attendance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-.04em]">Holiday Apply</h1>
          <p className="mt-1 text-sm text-muted-foreground">Apply leave or holiday for any employee. Employee data is auto-filled from the employee directory.</p>
        </div>
        {mode === "list"
          ? <Button onClick={() => setMode("form")}><CalendarCheck />New Application</Button>
          : <Button variant="outline" onClick={() => { reset(); setMode("list"); }}><X />Close</Button>
        }
      </div>

      {mode === "list" ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            {[
              { l: "Total Applications", v: String(stats.total), i: FileText },
              { l: "Pending", v: String(stats.pending), i: Clock3 },
              { l: "Approved", v: String(stats.approved), i: Check },
              { l: "Rejected", v: String(stats.rejected), i: X },
            ].map((x) => (
              <Card key={x.l}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{x.l}</p>
                    <p className="mt-1 text-2xl font-semibold">{x.v}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><x.i className="h-4 w-4" /></span>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="border-b p-4">
                <Input placeholder="Search by employee name, ID, or reason..." />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/35 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Employee</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">From</th>
                      <th className="px-4 py-3 font-medium">To</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/25">
                        <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeId} · {r.designation}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                        <td className="px-4 py-3 capitalize">{r.holidayType.replace("_", " ")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.fromDate}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.toDate}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.appliedAt}</td>
                      </tr>
                    ))}
                    {applications.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No holiday applications yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/25 px-5 py-4">
            <p className="text-sm font-semibold">New Holiday Application</p>
            <p className="text-xs text-muted-foreground">Select an employee to auto-fill their details.</p>
          </div>
          <CardContent className="p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Employee ID</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEES.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.id} — {e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedEmployee && (
                  <>
                    <div className="sm:col-span-2 rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Auto-filled Employee Details</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="font-medium">{selectedEmployee.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium">{selectedEmployee.department}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Designation</p>
                          <p className="font-medium">{selectedEmployee.designation}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <Label>Holiday / Leave Type</Label>
                  <Select value={holidayType} onValueChange={(v) => setHolidayType(v as HolidayType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_TYPES.map((h) => (
                        <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>From Date</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for holiday / leave" rows={3} />
                </div>
              </div>
            </div>
          </CardContent>
          <div className="flex items-center justify-between border-t bg-card/95 p-4">
            <Button variant="ghost" onClick={() => { reset(); setMode("list"); }}>Cancel</Button>
            <Button onClick={submit}><CalendarCheck />Submit Application</Button>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
