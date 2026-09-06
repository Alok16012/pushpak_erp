import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Receipt, AlertCircle, CheckCircle, Plus, Printer, Download } from "lucide-react";
import { downloadCsv } from "@/lib/export";
import {
  listInvoices,
  listStudents,
  createInvoiceRow,
  recordPayment,
  paidFromPayments,
  studentCode,
  studentName,
  toNumber,
  formatDate,
  type InvoiceRow,
} from "@/lib/supabase/studentFee";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { feeReceiptPdf, feeStatementPdf } from "@/lib/documents";

interface FeeRecord {
  id: string;
  studentName: string;
  rollNo: string;
  course: string;
  feeType: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: "paid" | "due" | "partial";
  invoice: InvoiceRow;
}

const columns: Column<FeeRecord>[] = [
  {
    key: "studentName",
    header: "Student",
    sortable: true,
    cell: (record) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {(record.studentName || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2) || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{record.studentName}</p>
          <p className="text-xs text-muted-foreground">{record.rollNo}</p>
        </div>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    sortable: true,
  },
  {
    key: "feeType",
    header: "Fee Type",
    sortable: true,
  },
  {
    key: "totalAmount",
    header: "Total",
    cell: (record) => (
      <span className="font-medium">₹{toNumber(record.totalAmount).toLocaleString("en-IN")}</span>
    ),
  },
  {
    key: "paidAmount",
    header: "Paid",
    cell: (record) => (
      <span className="text-success font-medium">₹{toNumber(record.paidAmount).toLocaleString("en-IN")}</span>
    ),
  },
  {
    key: "dueAmount",
    header: "Due",
    cell: (record) => (
      <span className={record.dueAmount > 0 ? "text-destructive font-medium" : ""}>
        ₹{toNumber(record.dueAmount).toLocaleString("en-IN")}
      </span>
    ),
  },
  {
    key: "dueDate",
    header: "Due Date",
    sortable: true,
    cell: (record) => (
      <span className="text-sm">{formatDate(record.dueDate)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (record) => <StatusBadge status={record.status} />,
  },
];

export default function FeeCollection() {
  const {toast}=useToast();
  const { user } = useAuth();
  const branchId = user?.branchId;
  const [records,setRecords]=useState<FeeRecord[]>([]);
  const [isCollectDialogOpen, setIsCollectDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);
  const [amount,setAmount]=useState("");const [method,setMethod]=useState("CASH");
  const [remarks,setRemarks]=useState("");
  /** Receipt number handed back by the last successful collection, so the
   *  receipt can be reprinted for real instead of as a provisional copy. */
  const [lastReceipt,setLastReceipt]=useState<{recordId:string;receiptNo:string}|null>(null);
  const [students,setStudents]=useState<Array<{id:string;firstName:string;lastName:string;enrollmentNo?:string}>>([]);
  const [isCreateDialogOpen,setIsCreateDialogOpen]=useState(false);
  const [invoice,setInvoice]=useState({studentId:"",description:"",amount:"",dueDate:""});
  const [creating,setCreating]=useState(false);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      // fee_invoices has no `amount` column — the live column is `totalAmount`,
      // and what has been paid comes from the fee_payments rows.
      const result = await listInvoices(branchId || null, { includeVoid: false });
      const mapped: FeeRecord[] = (result.data || []).map((i) => {
        const total = toNumber(i.totalAmount);
        const paid = paidFromPayments(i);
        const due = Math.max(0, total - paid);
        const status: FeeRecord["status"] =
          String(i.status || "").toUpperCase() === "PAID" || due === 0
            ? "paid"
            : paid > 0
              ? "partial"
              : "due";
        return {
          id: i.id,
          studentName: studentName(i.student, i.studentId ? `Student ${String(i.studentId).slice(-4)}` : "Unlinked invoice"),
          rollNo: studentCode(i.student as never) !== "—" ? studentCode(i.student as never) : (i.invoiceNo || "—"),
          course: i.invoiceNo || "—",
          feeType: i.description || "Fee",
          totalAmount: total,
          paidAmount: paid,
          dueAmount: due,
          dueDate: i.dueDate || "",
          status,
          invoice: i,
        };
      });
      setRecords(mapped);
    } catch (error) {
      setRecords([]);
      toast({ title: "Could not load fees", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);
  useEffect(() => {
    listStudents(branchId || null, 200).then(result => {
      setStudents((result.data || []).map((s) => ({
        id: s.id,
        firstName: s.firstName || "",
        lastName: s.lastName || "",
        enrollmentNo: s.enrollmentNo || undefined,
      })));
    }).catch(() => { /* the invoice dialog surfaces this on open */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const createInvoice = async () => {
    const total = Number(invoice.amount);
    if (!invoice.studentId) {
      toast({ title: "Pick a student", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      toast({ title: "Enter an amount greater than zero", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createInvoiceRow(branchId || null, {
        studentId: invoice.studentId,
        description: invoice.description.trim(),
        totalAmount: total,
        dueDate: invoice.dueDate || null,
      });
      toast({ title: "Invoice created", description: `${invoice.description} raised successfully.` });
      setIsCreateDialogOpen(false);
      setInvoice({ studentId: "", description: "", amount: "", dueDate: "" });
      await load();
    } catch (error) {
      toast({ title: "Could not create invoice", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const collected = !!selectedRecord && lastReceipt?.recordId === selectedRecord.id;
  const [collecting, setCollecting] = useState(false);

  const totalCollected = records.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalPending = records.reduce((sum, r) => sum + r.dueAmount, 0);
  const paidCount = records.filter((r) => r.status === "paid").length;
  const dueCount = records.filter((r) => r.status === "due").length;

  const exportRecords = () => {
    if (!records.length) {
      toast({ title: "Nothing to export", description: "No invoices for this branch yet." });
      return;
    }
    downloadCsv(
      "fee-collection.csv",
      records.map((r) => ({
        Student: r.studentName,
        RollNo: r.rollNo,
        Course: r.course,
        FeeType: r.feeType,
        TotalAmount: r.totalAmount,
        PaidAmount: r.paidAmount,
        DueAmount: r.dueAmount,
        DueDate: r.dueDate ? formatDate(r.dueDate) : "",
        Status: r.status,
      })),
    );
    toast({ title: "Fee records exported", description: `${records.length} rows written to CSV.` });
  };

  const handleCollectFee = (record: FeeRecord) => {
    setSelectedRecord(record);
    setAmount(String(record.dueAmount));
    setRemarks("");
    setLastReceipt(null);
    setIsCollectDialogOpen(true);
  };

  const printReceipt=()=>{
    if(!selectedRecord)return;
    const paid=Number(amount);
    if(!paid||paid<=0){toast({title:"Enter an amount",description:"A receipt needs the amount being collected.",variant:"destructive"});return}
    const receiptNo=lastReceipt?.recordId===selectedRecord.id?lastReceipt.receiptNo:undefined;
    feeReceiptPdf({
      studentName:selectedRecord.studentName,
      rollNo:selectedRecord.rollNo,
      feeType:selectedRecord.feeType,
      amount:paid,
      method,
      remarks,
      receiptNo,
      balanceAfter:Math.max(0,selectedRecord.dueAmount-paid),
    });
    toast({
      title:receiptNo?"Receipt generated":"Provisional receipt generated",
      description:receiptNo?`Receipt ${receiptNo} is in Downloads.`:"Collect the payment to issue a numbered receipt.",
    });
  };

  const handleActions = (record: FeeRecord) => [
    { label: "Collect Payment", onClick: () => handleCollectFee(record) },
    { label: "Print Statement", onClick: () => printStatement(record) },
  ];
  const printStatement=(record:FeeRecord)=>{feeStatementPdf({...record,dueDate:record.dueDate?formatDate(record.dueDate):"—"});toast({title:"PDF statement generated",description:"The print-ready statement is in Downloads."})};
  const collect = async () => {
    if (!selectedRecord) return;
    const paid = Number(amount);
    if (!Number.isFinite(paid) || paid <= 0) {
      toast({ title: "Enter an amount to collect", description: "The payment amount must be greater than zero.", variant: "destructive" });
      return;
    }
    if (paid > selectedRecord.dueAmount) {
      toast({
        title: "Amount exceeds the balance",
        description: `₹${selectedRecord.dueAmount.toLocaleString("en-IN")} is outstanding on this invoice.`,
        variant: "destructive",
      });
      return;
    }
    setCollecting(true);
    try {
      const payment = await recordPayment(selectedRecord.invoice, {
        amount: paid,
        method,
        referenceNo: remarks.trim() || undefined,
      });
      const receiptNo = String((payment.data.payment as Record<string, unknown>)?.receiptNo || "");
      setLastReceipt({ recordId: selectedRecord.id, receiptNo });
      toast({
        title: "Payment collected",
        description: receiptNo ? `Receipt ${receiptNo} created successfully.` : `₹${paid.toLocaleString("en-IN")} received.`,
      });
      await load();
    } catch (error) {
      toast({ title: "Payment failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setCollecting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Fee Collection"
        description="Manage student fee payments and collections"
        breadcrumbs={[
          { label: "Fee Management", href: "/fee/collection" },
          { label: "Fee Collection" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportRecords} disabled={records.length === 0}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Collection
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard
          title="Total Collected"
          value={`₹${(totalCollected / 100000).toFixed(1)}L`}
          subtitle="This month"
          icon={CreditCard}
          variant="success"
        />
        <StatsCard
          title="Pending Amount"
          value={`₹${(totalPending / 100000).toFixed(1)}L`}
          subtitle={`${dueCount + records.filter((r) => r.status === "partial").length} students`}
          icon={AlertCircle}
          variant="warning"
        />
        <StatsCard
          title="Fully Paid"
          value={paidCount}
          subtitle="Students with no dues"
          icon={CheckCircle}
          variant="primary"
        />
        <StatsCard
          title="Overdue"
          value={dueCount}
          subtitle="Requires follow-up"
          icon={Receipt}
          variant="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading invoices…</p>
          ) : (
            <DataTable
              data={records}
              columns={columns}
              selectable
              searchPlaceholder="Search by student name, roll no, or course..."
              actions={handleActions}
              emptyMessage="No fee invoices for this branch yet."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Fee Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceStudent">Student *</Label>
              <Select
                value={invoice.studentId}
                onValueChange={(studentId) => setInvoice((i) => ({ ...i, studentId }))}
              >
                <SelectTrigger id="invoiceStudent">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} · {s.enrollmentNo || "Pending"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDescription">Description *</Label>
              <Input
                id="invoiceDescription"
                placeholder="e.g. Tuition Fee - Term 1"
                value={invoice.description}
                onChange={(e) => setInvoice((i) => ({ ...i, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceAmount">Amount *</Label>
              <Input
                id="invoiceAmount"
                type="number"
                min={1}
                placeholder="Enter amount"
                value={invoice.amount}
                onChange={(e) => setInvoice((i) => ({ ...i, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDueDate">Due Date *</Label>
              <Input
                id="invoiceDueDate"
                type="date"
                value={invoice.dueDate}
                onChange={(e) => setInvoice((i) => ({ ...i, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                creating ||
                !invoice.studentId ||
                invoice.description.trim().length < 2 ||
                Number(invoice.amount) <= 0 ||
                !invoice.dueDate
              }
              onClick={createInvoice}
            >
              {creating ? "Creating…" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCollectDialogOpen} onOpenChange={setIsCollectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Fee Payment</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(selectedRecord.studentName || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedRecord.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRecord.rollNo} • {selectedRecord.course}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Due Amount:</span>
                    <span className="ml-2 font-medium text-destructive">
                      ₹{toNumber(selectedRecord.dueAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fee Type:</span>
                    <span className="ml-2 font-medium">{selectedRecord.feeType}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e=>setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem><SelectItem value="CARD">Card</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem><SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  placeholder="Optional remarks"
                  value={remarks}
                  onChange={e=>setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCollectDialogOpen(false)}>
              {collected ? "Close" : "Cancel"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={printReceipt}>
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button onClick={collect} disabled={collected || collecting}>
              {collected ? "Collected" : collecting ? "Collecting…" : "Collect Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
