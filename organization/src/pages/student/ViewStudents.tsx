import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  phone: string;
  course: string;
  batch: string;
  status: "active" | "inactive" | "pending";
  admissionDate: string;
  avatar?: string;
}

const studentsData: Student[] = [
  {
    id: "1",
    name: "John Doe",
    rollNo: "STU001",
    email: "john.doe@email.com",
    phone: "+91 98765 43210",
    course: "Computer Science",
    batch: "2024-A",
    status: "active",
    admissionDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Sarah Smith",
    rollNo: "STU002",
    email: "sarah.smith@email.com",
    phone: "+91 98765 43211",
    course: "Commerce",
    batch: "2024-B",
    status: "active",
    admissionDate: "2024-01-18",
  },
  {
    id: "3",
    name: "Mike Johnson",
    rollNo: "STU003",
    email: "mike.j@email.com",
    phone: "+91 98765 43212",
    course: "Arts",
    batch: "2024-A",
    status: "pending",
    admissionDate: "2024-01-20",
  },
  {
    id: "4",
    name: "Emily Brown",
    rollNo: "STU004",
    email: "emily.b@email.com",
    phone: "+91 98765 43213",
    course: "Science",
    batch: "2024-C",
    status: "active",
    admissionDate: "2024-01-22",
  },
  {
    id: "5",
    name: "David Wilson",
    rollNo: "STU005",
    email: "david.w@email.com",
    phone: "+91 98765 43214",
    course: "Engineering",
    batch: "2024-A",
    status: "inactive",
    admissionDate: "2024-01-10",
  },
  {
    id: "6",
    name: "Lisa Anderson",
    rollNo: "STU006",
    email: "lisa.a@email.com",
    phone: "+91 98765 43215",
    course: "Medical",
    batch: "2024-B",
    status: "active",
    admissionDate: "2024-01-25",
  },
  {
    id: "7",
    name: "James Taylor",
    rollNo: "STU007",
    email: "james.t@email.com",
    phone: "+91 98765 43216",
    course: "Computer Science",
    batch: "2024-C",
    status: "active",
    admissionDate: "2024-01-28",
  },
  {
    id: "8",
    name: "Emma Martinez",
    rollNo: "STU008",
    email: "emma.m@email.com",
    phone: "+91 98765 43217",
    course: "Commerce",
    batch: "2024-A",
    status: "pending",
    admissionDate: "2024-02-01",
  },
];

const columns: Column<Student>[] = [
  {
    key: "name",
    header: "Student",
    sortable: true,
    cell: (student) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={student.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {student.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.rollNo}</p>
        </div>
      </div>
    ),
  },
  {
    key: "email",
    header: "Contact",
    cell: (student) => (
      <div>
        <p className="text-sm">{student.email}</p>
        <p className="text-xs text-muted-foreground">{student.phone}</p>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    sortable: true,
  },
  {
    key: "batch",
    header: "Batch",
    sortable: true,
  },
  {
    key: "admissionDate",
    header: "Admission Date",
    sortable: true,
    cell: (student) => (
      <span className="text-sm">
        {new Date(student.admissionDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (student) => <StatusBadge status={student.status} />,
  },
];

/** Shape of the `/core/students/:id` detail response we actually read. */
interface StudentDetail {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fatherName?: string;
  motherName?: string;
  admissionStatus?: string;
  course?: { name: string };
  batch?: { name: string };
  feeInvoices?: Array<{
    id: string;
    description?: string;
    amount: string | number;
    dueDate?: string;
    status?: string;
    payments?: Array<{ amount: string | number; reversedAt?: string | null }>;
  }>;
  attendance?: Array<{ date: string; status: string }>;
}

export default function ViewStudents() {
  const navigate = useNavigate();
  const {toast}=useToast();
  const [students,setStudents]=useState<Student[]>([]);
  useEffect(()=>{api<Array<{id:string;firstName:string;middleName?:string;lastName:string;enrollmentNo?:string;applicationNo?:string;email?:string;phone:string;course?:{name:string};batch?:{name:string};isActive:boolean;admissionStatus:string;admissionDate:string}>>("/core/students?limit=100").then(data=>setStudents(data.map(s=>({id:s.id,name:[s.firstName,s.middleName,s.lastName].filter(Boolean).join(" "),rollNo:s.enrollmentNo||s.applicationNo||"Pending",email:s.email||"—",phone:s.phone,course:s.course?.name||"Not assigned",batch:s.batch?.name||"Not assigned",status:!s.isActive?"inactive":s.admissionStatus==="APPROVED"?"active":"pending",admissionDate:s.admissionDate})))).catch(error=>{
    // Offline / API down: fall back to the sample roll so the screen is still usable.
    setStudents(studentsData);
    toast({title:"Showing sample students",description:error.message,variant:"destructive"});
  })},[]);
  const exportCsv=()=>{const csv=["Name,Enrollment,Email,Phone,Course,Batch,Status",...students.map(s=>[s.name,s.rollNo,s.email,s.phone,s.course,s.batch,s.status].map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))].join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="idealdigiskills-students.csv";a.click();URL.revokeObjectURL(url)};

  const [details, setDetails] = useState<Student | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "fees">("profile");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  /** Both "View Details" and "Fee Details" hang off the same detail fetch. */
  const openDetail = (student: Student, tab: "profile" | "fees") => {
    setDetails(student);
    setDetailTab(tab);
    setDetail(null);
    setDetailError(null);
    api<StudentDetail>(`/core/students/${student.id}`)
      .then(setDetail)
      .catch((error) => setDetailError(error.message));
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

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setStudents((list) => list.filter((s) => s.id !== pendingDelete.id));
    toast({
      title: "Student removed from the list",
      description: "Applied to this session — the students API has no delete endpoint yet.",
    });
    setPendingDelete(null);
  };

  const handleActions = (student: Student) => [
    { label: "View Details", onClick: () => openDetail(student, "profile") },
    { label: "Edit", onClick: () => setEditing({ ...student }) },
    { label: "Fee Details", onClick: () => openDetail(student, "fees") },
    { label: "Delete", onClick: () => setPendingDelete(student), destructive: true },
  ];

  const invoices = detail?.feeInvoices ?? [];
  const invoiceTotals = invoices.map((invoice) => {
    const billed = Number(invoice.amount) || 0;
    const paid = (invoice.payments ?? [])
      .filter((p) => !p.reversedAt)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return { invoice, billed, paid, balance: billed - paid };
  });
  const outstanding = invoiceTotals.reduce((sum, row) => sum + row.balance, 0);

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
            <Button variant="outline" className="gap-2" asChild><a href="/import-templates/students.csv" download>
              <Upload className="h-4 w-4" />
              Import template
            </a></Button>
            <Button variant="outline" className="gap-2" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => navigate("/student/add")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </>
        }
      />

      <DataTable
        data={students}
        columns={columns}
        selectable
        searchPlaceholder="Search students..."
        actions={handleActions}
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>
              {details?.rollNo} · {details?.course} · {details?.batch}
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
              {[
                ["Email", detail?.email ?? details.email],
                ["Phone", detail?.phone ?? details.phone],
                ["Gender", detail?.gender ?? "—"],
                ["Date of birth", detail?.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : "—"],
                ["Father", detail?.fatherName ?? "—"],
                ["Mother", detail?.motherName ?? "—"],
                [
                  "Address",
                  detail?.streetAddress
                    ? [detail.streetAddress, detail.city, detail.state, detail.pincode].filter(Boolean).join(", ")
                    : "—",
                ],
                ["Admission status", detail?.admissionStatus ?? details.status],
                ["Admitted on", new Date(details.admissionDate).toLocaleDateString()],
                [
                  "Attendance (last 30)",
                  detail?.attendance?.length
                    ? `${detail.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length}/${detail.attendance.length} present`
                    : "—",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {detailTab === "fees" && (
            <div className="space-y-3">
              {invoiceTotals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {detail ? "No invoices raised for this student." : "Fetching invoices…"}
                </p>
              ) : (
                <>
                  <ul className="divide-y rounded-lg border text-sm">
                    {invoiceTotals.map(({ invoice, billed, paid, balance }) => (
                      <li key={invoice.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{invoice.description || "Fee invoice"}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}` : "No due date"} ·
                            paid ₹{paid.toLocaleString()} of ₹{billed.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={balance > 0 ? "secondary" : "default"}>
                          {balance > 0 ? `₹${balance.toLocaleString()} due` : "Cleared"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total outstanding: </span>
                    <span className="font-semibold">₹{outstanding.toLocaleString()}</span>
                  </p>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailTab(detailTab === "profile" ? "fees" : "profile")}
            >
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
            <DialogDescription>{editing?.rollNo}</DialogDescription>
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
                <Label htmlFor="student-course">Course</Label>
                <Input
                  id="student-course"
                  value={editing.course}
                  onChange={(e) => setEditing({ ...editing, course: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-batch">Batch</Label>
                <Input
                  id="student-batch"
                  value={editing.batch}
                  onChange={(e) => setEditing({ ...editing, batch: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the student for the rest of this session. The students API has no delete
              endpoint, so the record returns on reload.
            </AlertDialogDescription>
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
