import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, IndianRupee, Users, Clock, Download, Bell } from "lucide-react";
import { useState } from "react";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export";

interface Receipt {
  date: string;
  amount: number;
  method: string;
  reference: string;
  note?: string;
}

interface DueFee {
  id: string;
  studentId: string;
  name: string;
  course: string;
  batch: string;
  phone: string;
  totalDue: number;
  dueDate: string;
  daysOverdue: number;
  lastReminder: string;
  status: "overdue" | "due_today" | "due_soon" | "cleared";
  history: Receipt[];
}

const today = () => new Date().toISOString().slice(0, 10);

/** Due dates are stored relative to today so the overdue counts stay truthful. */
const dueOn = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (dueDate: string) =>
  Math.round((Date.parse(today()) - Date.parse(dueDate)) / 86_400_000);

/** Status and overdue days are derived from the due date, never stored stale. */
const derive = (fee: DueFee): DueFee => {
  if (fee.totalDue <= 0) return { ...fee, daysOverdue: 0, status: "cleared" };
  const daysOverdue = daysBetween(fee.dueDate);
  return {
    ...fee,
    daysOverdue,
    status: daysOverdue > 0 ? "overdue" : daysOverdue === 0 ? "due_today" : "due_soon",
  };
};

const SEED: DueFee[] = [
  { id: "1", studentId: "STU001", name: "Rahul Sharma", course: "Computer Science", batch: "CS-2024-A", phone: "+91 98765 43210", totalDue: 25000, dueDate: dueOn(-14), daysOverdue: 14, lastReminder: dueOn(-4), status: "overdue", history: [{ date: dueOn(-45), amount: 15000, method: "UPI", reference: "UPI-441290" }] },
  { id: "2", studentId: "STU002", name: "Priya Patel", course: "Commerce", batch: "COM-2024-A", phone: "+91 87654 32109", totalDue: 15000, dueDate: dueOn(-10), daysOverdue: 10, lastReminder: dueOn(-3), status: "overdue", history: [] },
  { id: "3", studentId: "STU003", name: "Amit Kumar", course: "Engineering", batch: "ENG-2024-A", phone: "+91 76543 21098", totalDue: 35000, dueDate: dueOn(0), daysOverdue: 0, lastReminder: "-", status: "due_today", history: [{ date: dueOn(-60), amount: 20000, method: "Bank Transfer", reference: "NEFT-88210" }] },
  { id: "4", studentId: "STU004", name: "Sneha Gupta", course: "Science", batch: "SCI-2024-A", phone: "+91 65432 10987", totalDue: 12000, dueDate: dueOn(5), daysOverdue: -5, lastReminder: "-", status: "due_soon", history: [] },
  { id: "5", studentId: "STU005", name: "Vikram Singh", course: "Arts", batch: "ART-2024-A", phone: "+91 54321 09876", totalDue: 8000, dueDate: dueOn(-31), daysOverdue: 31, lastReminder: dueOn(-9), status: "overdue", history: [{ date: dueOn(-90), amount: 6000, method: "Cash", reference: "CASH-1180" }] },
  { id: "6", studentId: "STU006", name: "Anita Reddy", course: "Computer Science", batch: "CS-2024-B", phone: "+91 43210 98765", totalDue: 20000, dueDate: dueOn(3), daysOverdue: -3, lastReminder: "-", status: "due_soon", history: [] },
];

const STATUS_LABEL: Record<DueFee["status"], string> = {
  overdue: "Overdue",
  due_today: "Due Today",
  due_soon: "Due Soon",
  cleared: "Cleared",
};

const columns: Column<DueFee>[] = [
  {
    key: "studentId",
    header: "Student",
    cell: (fee) => (
      <div>
        <p className="font-medium">{fee.name}</p>
        <p className="text-xs text-muted-foreground">{fee.studentId} • {fee.phone}</p>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    cell: (fee) => (
      <div>
        <Badge variant="outline">{fee.course}</Badge>
        <p className="text-xs text-muted-foreground mt-1">{fee.batch}</p>
      </div>
    ),
  },
  {
    key: "totalDue",
    header: "Amount Due",
    sortable: true,
    cell: (fee) => (
      <span className={fee.totalDue > 0 ? "font-medium text-destructive" : "font-medium text-success"}>
        ₹{fee.totalDue.toLocaleString()}
      </span>
    ),
  },
  {
    key: "dueDate",
    header: "Due Date",
    sortable: true,
  },
  {
    key: "daysOverdue",
    header: "Overdue",
    sortable: true,
    cell: (fee) => (
      fee.status === "cleared" ? (
        <Badge variant="secondary">Settled</Badge>
      ) : fee.daysOverdue > 0 ? (
        <Badge variant="destructive">{fee.daysOverdue} days</Badge>
      ) : fee.daysOverdue === 0 ? (
        <Badge variant="default">Today</Badge>
      ) : (
        <Badge variant="secondary">In {Math.abs(fee.daysOverdue)} days</Badge>
      )
    ),
  },
  {
    key: "lastReminder",
    header: "Last Reminder",
    cell: (fee) => (
      fee.lastReminder !== "-" ? (
        <span className="text-sm">{fee.lastReminder}</span>
      ) : (
        <span className="text-muted-foreground text-sm">Not sent</span>
      )
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (fee) => (
      <Badge variant={fee.status === "overdue" ? "destructive" : fee.status === "due_today" ? "default" : "secondary"}>
        {STATUS_LABEL[fee.status]}
      </Badge>
    ),
  },
];

const BLANK_PAYMENT = { amount: "", method: "", lateFee: "", reference: "" };

export default function DueFeeCollection() {
  const { toast } = useToast();
  const { items, setItems, update } = useLocalCollection<DueFee>("erp-due-fees", SEED);
  const fees = items.map(derive);

  const [collecting, setCollecting] = useState<DueFee | null>(null);
  const [payment, setPayment] = useState(BLANK_PAYMENT);
  const [history, setHistory] = useState<DueFee | null>(null);
  const [penalty, setPenalty] = useState<DueFee | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState("");

  const openCollect = (fee: DueFee) => {
    setCollecting(fee);
    setPayment({ ...BLANK_PAYMENT, amount: String(fee.totalDue) });
  };

  const remind = (fee: DueFee) => {
    update(fee.id, { lastReminder: today() });
    toast({
      title: "Reminder sent",
      description: `${fee.name} was texted at ${fee.phone} about ₹${fee.totalDue.toLocaleString()}.`,
    });
  };

  const bulkRemind = () => {
    const pending = fees.filter((fee) => fee.status === "overdue" || fee.status === "due_today");
    if (!pending.length) {
      toast({ title: "Nothing to chase", description: "No overdue or due-today balances right now." });
      return;
    }
    const stamped = today();
    const ids = new Set(pending.map((fee) => fee.id));
    setItems((list) => list.map((fee) => (ids.has(fee.id) ? { ...fee, lastReminder: stamped } : fee)));
    toast({
      title: `Reminders sent to ${pending.length} students`,
      description: `₹${pending.reduce((sum, fee) => sum + fee.totalDue, 0).toLocaleString()} chased in this run.`,
    });
  };

  const exportReport = () => {
    downloadCsv(
      `due-fees-${today()}.csv`,
      fees.map((fee) => ({
        "Student ID": fee.studentId,
        Name: fee.name,
        Course: fee.course,
        Batch: fee.batch,
        Phone: fee.phone,
        "Amount Due": fee.totalDue,
        "Due Date": fee.dueDate,
        "Days Overdue": fee.daysOverdue,
        "Last Reminder": fee.lastReminder,
        Status: STATUS_LABEL[fee.status],
      })),
    );
    toast({ title: "Report exported", description: `${fees.length} rows written to CSV.` });
  };

  const collect = () => {
    if (!collecting) return;
    const amount = Number(payment.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Enter an amount to collect", variant: "destructive" });
      return;
    }
    if (amount > collecting.totalDue) {
      toast({
        title: "Amount exceeds the balance",
        description: `₹${collecting.totalDue.toLocaleString()} is outstanding.`,
        variant: "destructive",
      });
      return;
    }
    if (!payment.method) {
      toast({ title: "Pick a payment method", variant: "destructive" });
      return;
    }
    const lateFee = Number(payment.lateFee) || 0;
    const remaining = collecting.totalDue - amount + lateFee;
    update(collecting.id, {
      totalDue: remaining,
      history: [
        {
          date: today(),
          amount,
          method: payment.method,
          reference: payment.reference.trim() || "—",
          note: lateFee ? `Late fee ₹${lateFee.toLocaleString()} added` : undefined,
        },
        ...collecting.history,
      ],
    });
    toast({
      title: "Payment collected",
      description: remaining > 0
        ? `₹${amount.toLocaleString()} received · ₹${remaining.toLocaleString()} still due.`
        : `₹${amount.toLocaleString()} received · balance cleared.`,
    });
    setCollecting(null);
  };

  const applyPenalty = () => {
    if (!penalty) return;
    const amount = Number(penaltyAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Enter a penalty amount", variant: "destructive" });
      return;
    }
    update(penalty.id, {
      totalDue: penalty.totalDue + amount,
      history: [{ date: today(), amount: -amount, method: "Penalty", reference: "—" }, ...penalty.history],
    });
    toast({ title: "Penalty added", description: `₹${amount.toLocaleString()} charged to ${penalty.name}.` });
    setPenalty(null);
    setPenaltyAmount("");
  };

  const waive = (fee: DueFee) => {
    const charged = fee.history.filter((entry) => entry.method === "Penalty");
    if (!charged.length) {
      toast({ title: "No late fee to waive", description: `${fee.name} has no penalty on record.` });
      return;
    }
    const total = charged.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
    update(fee.id, {
      totalDue: Math.max(0, fee.totalDue - total),
      history: fee.history.filter((entry) => entry.method !== "Penalty"),
    });
    toast({ title: "Late fee waived", description: `₹${total.toLocaleString()} removed from ${fee.name}'s balance.` });
  };

  const handleActions = (fee: DueFee) => [
    { label: "Collect Payment", onClick: () => openCollect(fee) },
    { label: "Send Reminder", onClick: () => remind(fee) },
    { label: "View History", onClick: () => setHistory(fee) },
    { label: "Add Penalty", onClick: () => { setPenalty(fee); setPenaltyAmount("500"); } },
    { label: "Waive Late Fee", onClick: () => waive(fee) },
  ];

  const totalDue = fees.reduce((sum, f) => sum + f.totalDue, 0);
  const overdueCount = fees.filter(f => f.status === "overdue").length;
  const dueTodayCount = fees.filter(f => f.status === "due_today").length;
  const pendingCount = fees.filter(f => f.totalDue > 0).length;

  return (
    <AppLayout>
      <PageHeader
        title="Due Fee Collection"
        description="Track and collect overdue fees from students"
        breadcrumbs={[
          { label: "Fee Management", href: "/fee/collection" },
          { label: "Due Fee Collection" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={bulkRemind}>
              <Bell className="h-4 w-4" />
              Send Bulk Reminder
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportReport}>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Due Amount"
          value={`₹${(totalDue / 1000).toFixed(0)}K`}
          subtitle="From all students"
          icon={IndianRupee}
        />
        <StatsCard
          title="Students with Dues"
          value={pendingCount}
          subtitle="Need follow-up"
          icon={Users}
        />
        <StatsCard
          title="Overdue"
          value={overdueCount}
          subtitle="Past due date"
          icon={AlertTriangle}
        />
        <StatsCard
          title="Due Today"
          value={dueTodayCount}
          subtitle="Payment expected"
          icon={Clock}
        />
      </div>

      <DataTable
        data={fees}
        columns={columns}
        searchPlaceholder="Search students with dues..."
        actions={handleActions}
        selectable
      />

      <Dialog open={!!collecting} onOpenChange={(open) => !open && setCollecting(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Collect Due Payment</DialogTitle>
          </DialogHeader>
          {collecting && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium">{collecting.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total Due:</span>
                  <span className="font-medium text-destructive">₹{collecting.totalDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days Overdue:</span>
                  <span className="font-medium">{collecting.daysOverdue > 0 ? `${collecting.daysOverdue} days` : "Not overdue"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collect-amount">Amount to Collect *</Label>
                <Input
                  id="collect-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="collect-method">Payment Method *</Label>
                  <Select value={payment.method} onValueChange={(method) => setPayment({ ...payment, method })}>
                    <SelectTrigger id="collect-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collect-late">Late Fee</Label>
                  <Input
                    id="collect-late"
                    type="number"
                    placeholder="e.g., 500"
                    value={payment.lateFee}
                    onChange={(e) => setPayment({ ...payment, lateFee: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collect-ref">Reference Number</Label>
                <Input
                  id="collect-ref"
                  placeholder="Transaction reference"
                  value={payment.reference}
                  onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setCollecting(null)}>Cancel</Button>
                <Button onClick={collect}>
                  <IndianRupee className="h-4 w-4 mr-2" />
                  Collect Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(open) => !open && setHistory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment history</DialogTitle>
            <DialogDescription>{history?.name} · {history?.studentId}</DialogDescription>
          </DialogHeader>
          {history?.history.length ? (
            <div className="divide-y">
              {history.history.map((entry, index) => (
                <div key={`${entry.date}-${index}`} className="flex items-start justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{entry.method}</p>
                    <p className="text-xs text-muted-foreground">{entry.date} · Ref {entry.reference}</p>
                    {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                  </div>
                  <span className={entry.amount < 0 ? "font-medium text-destructive" : "font-medium text-success"}>
                    {entry.amount < 0 ? "+" : "−"}₹{Math.abs(entry.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!penalty} onOpenChange={(open) => !open && setPenalty(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add penalty</DialogTitle>
            <DialogDescription>
              Charged on top of {penalty?.name}'s ₹{penalty?.totalDue.toLocaleString()} balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="penalty-amount">Penalty amount</Label>
            <Input
              id="penalty-amount"
              type="number"
              value={penaltyAmount}
              onChange={(e) => setPenaltyAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPenalty(null)}>Cancel</Button>
            <Button onClick={applyPenalty}>Add penalty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
