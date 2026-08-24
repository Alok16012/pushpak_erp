import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Users, IndianRupee, CheckCircle, Link2, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getStudents, getInvoices, createInvoice, updateInvoice, deleteInvoice, addPayment } from "@/lib/supabase/data";
import { FEE_GROUPS_KEY, FeeGroup } from "@/data/fee-catalog";

interface StudentAllocation {
  id: string;
  studentId: string;
  name: string;
  course: string;
  batch: string;
  feeGroup: string;
  totalFee: number;
  allocated: boolean;
  dueDate: string;
  discount?: number;
  discountNote?: string;
}

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  courseId: string;
  batchId: string;
}

interface FeeInvoice {
  id: string;
  studentId: string;
  feeGroupId: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
}

/** What the student actually owes once any discount is applied. */
const netFee = (student: StudentAllocation) => Math.max(0, student.totalFee - (student.discount ?? 0));

const columns: Column<StudentAllocation>[] = [
  {
    key: "studentId",
    header: "Student",
    cell: (student) => (
      <div>
        <p className="font-medium">{student.name}</p>
        <p className="text-xs text-muted-foreground">{student.studentId}</p>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    cell: (student) => (
      <div>
        <Badge variant="outline">{student.course}</Badge>
        <p className="text-xs text-muted-foreground mt-1">{student.batch}</p>
      </div>
    ),
  },
  {
    key: "feeGroup",
    header: "Fee Group",
    cell: (student) => (
      student.feeGroup ? (
        <Badge variant="secondary">{student.feeGroup}</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">Not assigned</span>
      )
    ),
  },
  {
    key: "totalFee",
    header: "Total Fee",
    sortable: true,
    cell: (student) => (
      student.totalFee > 0 ? (
        <div>
          <span className="font-medium">₹{netFee(student).toLocaleString()}</span>
          {!!student.discount && (
            <p className="text-xs text-success">-₹{student.discount.toLocaleString()} discount</p>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    ),
  },
  {
    key: "dueDate",
    header: "Due Date",
    cell: (student) => (
      student.dueDate !== "-" ? (
        <span>{student.dueDate}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    ),
  },
  {
    key: "allocated",
    header: "Status",
    cell: (student) => (
      student.allocated ? (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Allocated
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Pending
        </Badge>
      )
    ),
  },
];

export default function FeeAllocation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const branchId = user?.branchId || null;
  const [allocations, setAllocations] = useState<StudentAllocation[]>([]);
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeeGroup, setSelectedFeeGroup] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [details, setDetails] = useState<StudentAllocation | null>(null);
  const [changing, setChanging] = useState<StudentAllocation | null>(null);
  const [changeGroup, setChangeGroup] = useState("");
  const [changeDue, setChangeDue] = useState(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [discounting, setDiscounting] = useState<StudentAllocation | null>(null);
  const [discount, setDiscount] = useState({ mode: "amount", value: "", note: "" });
  const [removing, setRemoving] = useState<StudentAllocation | null>(null);

  const activeGroups = feeGroups.filter((group) => group.status === "active");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [studentsData, invoicesData, groupsData] = await Promise.all([
          getStudents(branchId, 1, 100),
          getInvoices(branchId),
          (async () => {
            try {
              const raw = localStorage.getItem(FEE_GROUPS_KEY);
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })(),
        ]);
        if (!cancelled) {
          setStudents(studentsData.data);
          setInvoices(invoicesData.data);
          setFeeGroups(groupsData);
        }
      } catch (err) {
        if (!cancelled) {
          toast({ title: "Failed to load fee allocation data", variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [toast]);

  // Build allocations view from students + invoices.
  useEffect(() => {
    const invoiceMap = new Map(invoices.map((inv) => [inv.studentId, inv]));
    const built: StudentAllocation[] = students.map((stu) => {
      const inv = invoiceMap.get(stu.id);
      if (inv) {
        const group = feeGroups.find((g) => g.id === inv.feeGroupId);
        return {
          id: inv.id,
          studentId: stu.studentId,
          name: `${stu.firstName} ${stu.lastName}`,
          course: stu.courseId,
          batch: stu.batchId,
          feeGroup: group?.name ?? "",
          totalFee: inv.totalAmount - inv.paidAmount,
          allocated: true,
          dueDate: inv.dueDate,
          discount: inv.paidAmount > 0 ? inv.paidAmount : undefined,
          discountNote: inv.paidAmount > 0 ? "Partial payment" : undefined,
        };
      }
      return {
        id: stu.id,
        studentId: stu.studentId,
        name: `${stu.firstName} ${stu.lastName}`,
        course: stu.courseId,
        batch: stu.batchId,
        feeGroup: "",
        totalFee: 0,
        allocated: false,
        dueDate: "-",
      };
    });
    setAllocations(built);
  }, [students, invoices, feeGroups]);

  const courses = Array.from(new Set(allocations.map((s) => s.course))).sort();
  const batches = Array.from(new Set(allocations.map((s) => s.batch))).sort();

  const visible = allocations.filter(
    (student) =>
      (courseFilter === "all" || student.course === courseFilter) &&
      (batchFilter === "all" || student.batch === batchFilter),
  );

  const targetIds = selectedIds.filter((id) => visible.some((student) => student.id === id));

  const allocateSelected = async () => {
    const group = activeGroups.find((item) => item.id === selectedFeeGroup);
    if (!group) {
      toast({ title: "Pick a fee group first", variant: "destructive" });
      return;
    }
    if (!targetIds.length) {
      toast({ title: "Select students in the list", description: "Tick the rows you want to allocate.", variant: "destructive" });
      return;
    }
    if (!dueDate) {
      toast({ title: "Pick a due date", variant: "destructive" });
      return;
    }

    for (const id of targetIds) {
      const existing = invoices.find((inv) => inv.studentId === id);
      if (existing) {
        await updateInvoice(existing.id, branchId, {
          feeGroupId: group.id,
          totalAmount: group.totalAmount,
          dueDate,
        });
      } else {
        await createInvoice(branchId, {
          studentId: id,
          feeGroupId: group.id,
          totalAmount: group.totalAmount,
          dueDate,
        });
      }
    }

    try {
      const refreshed = await getInvoices(branchId);
      setInvoices(refreshed);
    } catch {
      // Refresh failed; state will reconcile on next manual action.
    }

    toast({
      title: "Fee group allocated",
      description: `${group.name} applied to ${targetIds.length} student${targetIds.length === 1 ? "" : "s"} · ₹${(group.totalAmount * targetIds.length).toLocaleString()} billed.`,
    });
    setSelectedIds([]);
  };

  const saveChange = async () => {
    if (!changing) return;
    const group = activeGroups.find((item) => item.id === changeGroup);
    if (!group) {
      toast({ title: "Pick a fee group", variant: "destructive" });
      return;
    }
    const existing = invoices.find((inv) => inv.studentId === changing.id);
    if (existing) {
      try {
        await updateInvoice(existing.id, branchId, {
          feeGroupId: group.id,
          totalAmount: group.totalAmount,
          dueDate: changeDue,
        });
        const refreshed = await getInvoices(branchId);
        setInvoices(refreshed);
        toast({ title: "Fee group updated", description: `${changing.name} → ${group.name}.` });
      } catch {
        toast({ title: "Failed to update fee group", variant: "destructive" });
      }
    }
    setChanging(null);
  };

  const saveDiscount = async () => {
    if (!discounting) return;
    const value = Number(discount.value);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Enter a discount greater than zero", variant: "destructive" });
      return;
    }
    const amount = discount.mode === "percent"
      ? Math.round((discounting.totalFee * value) / 100)
      : Math.round(value);
    if (amount > discounting.totalFee) {
      toast({ title: "Discount exceeds the total fee", description: `Maximum is ₹${discounting.totalFee.toLocaleString()}.`, variant: "destructive" });
      return;
    }
    const existing = invoices.find((inv) => inv.studentId === discounting.id);
    if (existing) {
      try {
        await addPayment(existing.id, { amount, note: discount.note.trim() || (discount.mode === "percent" ? `${value}% concession` : "Flat concession") });
        const refreshed = await getInvoices(branchId);
        setInvoices(refreshed);
        toast({
          title: "Discount applied",
          description: `₹${amount.toLocaleString()} off — ${discounting.name} now owes ₹${(discounting.totalFee - amount).toLocaleString()}.`,
        });
      } catch {
        toast({ title: "Failed to apply discount", variant: "destructive" });
      }
    }
    setDiscounting(null);
  };

  const handleActions = (student: StudentAllocation) => [
    { label: "View Details", onClick: () => setDetails(student) },
    {
      label: "Change Fee Group",
      onClick: () => {
        setChangeGroup(activeGroups.find((g) => g.name === student.feeGroup)?.id ?? "");
        setChangeDue(student.dueDate !== "-" ? student.dueDate : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
        setChanging(student);
      },
    },
    {
      label: "Add Discount",
      onClick: () => {
        if (!student.allocated) {
          toast({ title: "Allocate a fee group first", description: `${student.name} has no fee to discount.`, variant: "destructive" });
          return;
        }
        setDiscount({ mode: "amount", value: "", note: "" });
        setDiscounting(student);
      },
    },
    {
      label: "Remove Allocation",
      onClick: () => {
        if (!student.allocated) {
          toast({ title: "Nothing to remove", description: `${student.name} has no fee group.` });
          return;
        }
        setRemoving(student);
      },
      destructive: true,
    },
  ];

  const allocatedRows = allocations.filter((s) => s.allocated);
  const pendingCount = allocations.length - allocatedRows.length;
  const totalAllocated = allocatedRows.reduce((sum, s) => sum + netFee(s), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Fee Allocation"
        description="Assign fee groups to students"
        breadcrumbs={[
          { label: "Fee Management", href: "/fee/collection" },
          { label: "Fee Allocation" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { value: allocations.length, label: "Total Students", icon: Users, bg: "bg-primary/10", fg: "text-primary" },
          { value: allocatedRows.length, label: "Fee Allocated", icon: CheckCircle, bg: "bg-success/10", fg: "text-success" },
          { value: pendingCount, label: "Pending Allocation", icon: AlertCircle, bg: "bg-destructive/10", fg: "text-destructive" },
          { value: `₹${(totalAllocated / 100000).toFixed(1)}L`, label: "Total Allocated", icon: IndianRupee, bg: "bg-warning/10", fg: "text-warning" },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${tile.bg} flex items-center justify-center`}>
                  <tile.icon className={`h-5 w-5 ${tile.fg}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tile.value}</p>
                  <p className="text-sm text-muted-foreground">{tile.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-4 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Quick Allocation
            </CardTitle>
            <CardDescription>Assign fee group to multiple students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fee Group</Label>
              <Select value={selectedFeeGroup} onValueChange={setSelectedFeeGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee group" />
                </SelectTrigger>
                <SelectContent>
                  {activeGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex flex-col">
                        <span>{group.name}</span>
                        <span className="text-xs text-muted-foreground">₹{group.totalAmount.toLocaleString()}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by Batch</Label>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading || !selectedFeeGroup || !targetIds.length} onClick={allocateSelected}>
              Allocate to Selected{targetIds.length ? ` (${targetIds.length})` : ""}
            </Button>
            {!targetIds.length && (
              <p className="text-xs text-muted-foreground">Tick students in the list to enable allocation.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <CardDescription>
              Select students to allocate fee groups
              {visible.length !== allocations.length && ` · showing ${visible.length} of ${allocations.length}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={visible}
              columns={columns}
              searchPlaceholder="Search students..."
              actions={handleActions}
              selectable
              onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
              emptyMessage="No students match these filters"
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.studentId} · {details?.course} · {details?.batch}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Fee group", details.feeGroup || "Not assigned"],
                ["Gross fee", details.totalFee ? `₹${details.totalFee.toLocaleString()}` : "-"],
                ["Discount", details.discount ? `₹${details.discount.toLocaleString()}` : "None"],
                ["Payable", details.totalFee ? `₹${netFee(details).toLocaleString()}` : "-"],
                ["Due date", details.dueDate],
                ["Status", details.allocated ? "Allocated" : "Pending"],
                ...(details.discountNote ? [["Discount note", details.discountNote]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!details) return;
                setChangeGroup(activeGroups.find((g) => g.name === details.feeGroup)?.id ?? "");
                setChangeDue(details.dueDate !== "-" ? details.dueDate : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
                setChanging(details);
                setDetails(null);
              }}
            >
              Change fee group
            </Button>
            <Button onClick={() => setDetails(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!changing} onOpenChange={(open) => !open && setChanging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change fee group</DialogTitle>
            <DialogDescription>
              {changing?.name} · {changing?.feeGroup || "no group assigned"} — any existing discount is cleared.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fee group</Label>
              <Select value={changeGroup} onValueChange={setChangeGroup}>
                <SelectTrigger><SelectValue placeholder="Select fee group" /></SelectTrigger>
                <SelectContent>
                  {activeGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} · ₹{group.totalAmount.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={changeDue} onChange={(e) => setChangeDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChanging(null)}>Cancel</Button>
            <Button onClick={saveChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!discounting} onOpenChange={(open) => !open && setDiscounting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add discount</DialogTitle>
            <DialogDescription>
              {discounting?.name} · gross ₹{discounting?.totalFee.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Discount type</Label>
                <Select value={discount.mode} onValueChange={(value) => setDiscount((c) => ({ ...c, mode: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Flat amount (₹)</SelectItem>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{discount.mode === "percent" ? "Percentage" : "Amount"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={discount.value}
                  onChange={(e) => setDiscount((c) => ({ ...c, value: e.target.value }))}
                  placeholder={discount.mode === "percent" ? "10" : "5000"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={discount.note}
                onChange={(e) => setDiscount((c) => ({ ...c, note: e.target.value }))}
                placeholder="Merit scholarship, sibling concession..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscounting(null)}>Cancel</Button>
            <Button onClick={saveDiscount}>Apply discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this allocation?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} will go back to pending and the ₹{removing ? netFee(removing).toLocaleString() : 0} billing is dropped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!removing) return;
                const existing = invoices.find((inv) => inv.studentId === removing.id);
                if (existing) {
                  try {
                    await deleteInvoice(existing.id, branchId);
                    const refreshed = await getInvoices(branchId);
                    setInvoices(refreshed);
                    toast({ title: "Allocation removed", description: `${removing.name} is pending allocation.` });
                  } catch {
                    toast({ title: "Failed to remove allocation", variant: "destructive" });
                  }
                }
                setRemoving(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}