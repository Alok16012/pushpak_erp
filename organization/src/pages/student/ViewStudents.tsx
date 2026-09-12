import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StudentRoster, formatAdmissionDate } from "@/components/student/StudentRoster";
import { StudentLoginDialog } from "@/components/student/StudentLoginDialog";
import { StudentContact } from "@/components/student/StudentContact";
import { canIssueStudentLogin } from "@/lib/roles";
import { formatPhone } from "@/lib/phone";
import {
  getStudentRoster,
  getStudent,
  getStudentInvoices,
  deleteStudent,
  type StudentInvoice,
  type StudentRosterRow,
} from "@/lib/supabase/data";
import { rupees } from "@/lib/fees";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/** Shape of the student detail response the profile / fee dialogs read. */
interface StudentDetail {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  admissionStatus?: string;
  course?: { name: string };
  batch?: { name: string };
  attendance?: Array<{ date: string; status: string }>;
}

export default function ViewStudents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const branchId = user?.branchId;

  const [students, setStudents] = useState<StudentRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginFor, setLoginFor] = useState<StudentRosterRow | null>(null);

  // Both an organisation admin and the branch that enrolled the student may
  // issue the portal login; other branch staff may not. The edge function
  // enforces this too -- here it only decides whether to offer the action.
  const mayIssueLogin = canIssueStudentLogin(user?.role);

  useEffect(() => {
    setLoading(true);
    getStudentRoster(branchId)
      .then((result) => setStudents(result.data))
      .catch((error) =>
        toast({
          title: "Could not load students",
          description: error instanceof Error ? error.message : "Database connection error.",
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [branchId, toast]);

  /** Exports whatever the roster is currently showing, not the whole branch. */
  const exportCsv = (rows: StudentRosterRow[]) => {
    const csv = [
      "Name,Admission No,Admission Date,Course,Course Code,Father,Father Phone,Phone,WhatsApp,Address,Course Fee,Paid,Balance,Status",
      ...rows.map((s) =>
        [
          s.name,
          s.admissionNo,
          formatAdmissionDate(s.admissionDate),
          s.course,
          s.courseCode,
          s.fatherName,
          formatPhone(s.fatherPhone),
          formatPhone(s.phone),
          formatPhone(s.whatsapp),
          s.address,
          s.fee,
          s.paid,
          s.balance,
          s.status,
        ]
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${rows.length} students downloaded to CSV.` });
  };

  const [details, setDetails] = useState<StudentRosterRow | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "fees">("profile");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailInvoices, setDetailInvoices] = useState<StudentInvoice[] | null>(null);
  const [editing, setEditing] = useState<StudentRosterRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentRosterRow | null>(null);

  const openDetail = (student: StudentRosterRow, tab: "profile" | "fees") => {
    setDetails(student);
    setDetailTab(tab);
    setDetail(null);
    setDetailInvoices(null);
    setDetailError(null);
    getStudent(student.id, branchId)
      .then((result) => setDetail(result.data as unknown as StudentDetail))
      .catch((error) => setDetailError(error.message));
    // A separate call, because `getStudent` selects the students row alone --
    // the fee tab used to read a `feeInvoices` key that was never on it, and so
    // told every branch that no invoice had ever been raised.
    getStudentInvoices(student.id, branchId)
      .then((result) => setDetailInvoices(result.data))
      .catch(() => setDetailInvoices([]));
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    setStudents((list) => list.map((s) => (s.id === editing.id ? editing : s)));
    toast({
      title: "Student updated",
      description: "Applied to this session — the students API has no update endpoint yet.",
    });
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteStudent(pendingDelete.id, branchId);
      setStudents((list) => list.filter((s) => s.id !== pendingDelete.id));
      toast({ title: "Student removed", description: `${pendingDelete.name} has been deleted.` });
    } catch (e) {
      toast({
        title: "Could not delete student",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    }
    setPendingDelete(null);
  };

  // `getStudentInvoices` has already resolved amount / paid / balance, so the
  // dialog and the roster row behind it cannot drift apart.
  const invoiceTotals = detailInvoices ?? [];

  return (
    <AppLayout>
      <PageHeader
        title="View Students"
        description="Manage and view all enrolled students"
        breadcrumbs={[
          { label: "Student Management", href: "/student/view" },
          { label: "View Students" },
        ]}
        actions={
          <>
            <Button variant="outline" className="gap-2" asChild>
              <a href="/import-templates/students.csv" download>
                <Upload className="h-4 w-4" />
                Import template
              </a>
            </Button>
            <Button onClick={() => navigate("/student/add")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </>
        }
      />

      <StudentRoster
        rows={students}
        loading={loading}
        onView={(student) => openDetail(student, "profile")}
        onEdit={(student) => setEditing({ ...student })}
        onDelete={setPendingDelete}
        onExport={exportCsv}
        onSetLogin={mayIssueLogin ? setLoginFor : undefined}
      />

      <StudentLoginDialog
        student={loginFor}
        onOpenChange={() => setLoginFor(null)}
        onSaved={(studentId) =>
          setStudents((list) =>
            list.map((s) => (s.id === studentId ? { ...s, hasLogin: true } : s)),
          )
        }
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>
              {details?.admissionNo} · {details?.course}
            </DialogDescription>
          </DialogHeader>

          {!detail && !detailError && <p className="text-sm text-muted-foreground">Loading student record…</p>}
          {detailError && (
            <p className="text-sm text-destructive">
              Could not load the full record ({detailError}). Showing what the list already knows.
            </p>
          )}

          {detailTab === "profile" && details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {([
                ["Email", detail?.email ?? details.email],
                [
                  "Phone / WhatsApp",
                  <StudentContact
                    name={details.name}
                    phone={detail?.phone ?? details.phone}
                    whatsapp={detail?.whatsappNumber ?? details.whatsapp}
                  />,
                ],
                ["Gender", detail?.gender ?? "—"],
                ["Date of birth", detail?.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : "—"],
                ["Father", detail?.fatherName ?? details.fatherName],
                ["Father's phone", formatPhone(detail?.fatherPhone ?? details.fatherPhone)],
                ["Mother", detail?.motherName ?? "—"],
                [
                  "Address",
                  detail?.streetAddress
                    ? [detail.streetAddress, detail.city, detail.state, detail.pincode].filter(Boolean).join(", ")
                    : details.address,
                ],
                ["Admission status", detail?.admissionStatus ?? details.status],
                ["Admitted on", formatAdmissionDate(details.admissionDate)],
                [
                  "Attendance (last 30)",
                  Array.isArray(detail?.attendance) && detail.attendance.length
                    ? `${detail.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length}/${detail.attendance.length} present`
                    : "—",
                ],
              ] as [string, React.ReactNode][]).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {detailTab === "fees" && details && (
            <div className="space-y-3">
              {/* The same three figures as the student's own login and the row
                  in the table behind this dialog, from the same calculation. */}
              <dl className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center">
                {([
                  ["Course fee", rupees(details.fee), "font-semibold"],
                  ["Paid", rupees(details.paid), "font-semibold text-success"],
                  [
                    "Balance",
                    rupees(details.balance),
                    details.balance > 0 ? "font-semibold text-destructive" : "font-semibold text-success",
                  ],
                ] as [string, string, string][]).map(([label, value, tone]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className={`tabular ${tone}`}>{value}</dd>
                  </div>
                ))}
              </dl>

              {invoiceTotals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {detailInvoices
                    ? "No invoice raised yet — the figure above is what the course costs."
                    : "Fetching invoices…"}
                </p>
              ) : (
                <ul className="divide-y rounded-lg border text-sm">
                  {invoiceTotals.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{invoice.description || "Fee invoice"}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.dueDate
                            ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}`
                            : "No due date"}{" "}
                          · paid {rupees(invoice.paid)} of {rupees(invoice.amount)}
                        </p>
                      </div>
                      <Badge variant={invoice.balance > 0 ? "secondary" : "default"}>
                        {invoice.balance > 0 ? `${rupees(invoice.balance)} due` : "Cleared"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTab(detailTab === "profile" ? "fees" : "profile")}>
              {detailTab === "profile" ? "Fee details" : "Profile"}
            </Button>
            <Button onClick={() => navigate("/fee/collection")}>Collect fee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
            <DialogDescription>{editing?.admissionNo}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="student-name">Name</Label>
                <Input
                  id="student-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-email">Email</Label>
                <Input
                  id="student-email"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-phone">Phone</Label>
                <Input
                  id="student-phone"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-father">Father / Guardian</Label>
                <Input
                  id="student-father"
                  value={editing.fatherName}
                  onChange={(e) => setEditing({ ...editing, fatherName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-course">Course</Label>
                <Input
                  id="student-course"
                  value={editing.course}
                  onChange={(e) => setEditing({ ...editing, course: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the student record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
