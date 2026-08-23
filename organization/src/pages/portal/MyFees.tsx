import { useState, useEffect } from "react";
import { Download, IndianRupee, Receipt } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export";

interface StudentProfile {
  id: string;
  enrollmentNo: string;
  applicationNo: string;
  name: string;
  email?: string;
  phone?: string;
  course?: string;
  batch?: string;
  branch?: string;
  academicYear?: string;
  admissionDate?: string;
  photo?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  admissionStatus?: string;
}

interface PortalInvoice {
  id: string;
  invoiceNo?: string;
  description?: string;
  amount: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
  payments?: { id?: string; amount: number; reversedAt?: string; method?: string; referenceNo?: string; paidAt?: string }[];
  student?: { firstName?: string; lastName?: string; enrollmentNo?: string };
}

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "secondary", PARTIAL: "outline", DUE: "default", OVERDUE: "destructive",
};
const METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export default function MyFees() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<PortalInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [profileRes, invoicesRes] = await Promise.all([
          api<{ success: boolean; data: StudentProfile }>("/core/student/profile"),
          api<{ success: boolean; data: PortalInvoice[] }>("/core/portal/invoices"),
        ]);
        if (!cancelled) {
          if (profileRes.success) setProfile(profileRes.data);
          if (invoicesRes.success) setInvoices(invoicesRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          toast({ title: "Failed to load fees", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [toast]);

  const balance = (invoice: PortalInvoice) => {
    const paid = invoice.payments?.filter((p) => !p.reversedAt).reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
    return Math.max(0, Number(invoice.amount || 0) - paid);
  };

  const invoiceStatus = (invoice: PortalInvoice): string => {
    const bal = balance(invoice);
    if (bal <= 0) return "PAID";
    const today = new Date().toISOString().slice(0, 10);
    if (invoice.dueDate && invoice.dueDate < today) return "OVERDUE";
    return "PARTIAL";
  };

  const openPayment = (invoice: PortalInvoice) => {
    setPaying(invoice);
    setAmount(String(balance(invoice)));
    setMethod(METHODS[0]);
  };

  const pay = async () => {
    if (!paying) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast({ title: "Enter a valid amount", variant: "destructive" });
    const bal = balance(paying);
    if (value > bal) return toast({ title: "Amount exceeds balance", description: `The balance on ${paying.invoiceNo} is ${money(bal)}.`, variant: "destructive" });
    setProcessing(true);
    try {
      await api<{ success: boolean; data: { id: string; amount: number; method: string; paidAt: string } }>(`/core/fees/invoices/${paying.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: value, method }),
      });
      toast({ title: "Payment recorded", description: `${money(value)} paid against ${paying.invoiceNo}.` });
      setPaying(null);
      // Refresh invoices
      const res = await api<{ success: boolean; data: PortalInvoice[] }>("/core/portal/invoices");
      if (res.success) setInvoices(res.data);
    } catch (err) {
      toast({ title: "Payment failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const summary = invoices.reduce(
    (acc, inv) => {
      const bal = balance(inv);
      const status = invoiceStatus(inv);
      acc.billed += Number(inv.amount || 0);
      acc.paid += Number(inv.amount || 0) - bal;
      acc.due += bal;
      if (status === "OVERDUE") acc.overdue += bal;
      return acc;
    },
    { billed: 0, paid: 0, due: 0, overdue: 0 },
  );

  const exportCsv = () => {
    const rows = invoices.map((invoice) => ({
      invoiceNo: invoice.invoiceNo || invoice.id,
      description: invoice.description || "",
      dueDate: invoice.dueDate || "",
      amount: Number(invoice.amount || 0),
      balance: balance(invoice),
      status: invoiceStatus(invoice),
    }));
    downloadCsv("my-fees.csv", rows, ["invoiceNo", "description", "dueDate", "amount", "balance", "status"]);
    toast({ title: "Exported", description: `${rows.length} invoice(s) downloaded.` });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading fees...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Fees & receipts"
        description="What you have been billed, what is still open, and every receipt you can download."
        breadcrumbs={[{ label: "Fees & receipts" }]}
        actions={<Button variant="outline" onClick={exportCsv}><Download />Export CSV</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Billed", value: money(summary.billed), note: `${invoices.length} invoices` },
          { label: "Paid", value: money(summary.paid), note: "receipts available below" },
          { label: "Outstanding", value: money(summary.due), note: summary.due ? "payable online" : "all clear" },
          { label: "Overdue", value: money(summary.overdue), note: summary.overdue ? "past due date" : "nothing overdue" },
        ].map((stat) => (
          <Card key={stat.label}><CardContent className="p-4"><p className="eyebrow">{stat.label}</p><p className="metric mt-3">{stat.value}</p><p className="mt-2 text-xs text-muted-foreground">{stat.note}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Description</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const bal = balance(invoice);
                const status = invoiceStatus(invoice);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap font-medium">{invoice.invoiceNo || invoice.id}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell className="whitespace-nowrap">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                    <TableCell className="tabular text-right">{money(Number(invoice.amount || 0))}</TableCell>
                    <TableCell className="tabular text-right">{money(Number(invoice.amount || 0) - bal)}</TableCell>
                    <TableCell className="tabular text-right font-medium">{money(bal)}</TableCell>
                    <TableCell><Badge variant={TONE[status]} className="capitalize">{status.toLowerCase()}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {bal > 0 && <Button size="sm" onClick={() => openPayment(invoice)}><IndianRupee className="mr-1 h-3.5 w-3.5" />Pay</Button>}
                        {invoice.payments?.length ? <Button size="sm" variant="outline" onClick={() => toast({ title: "Receipt", description: "Receipt download coming soon." })}><Receipt className="mr-1 h-3.5 w-3.5" />Receipt</Button> : null}
                        <Button size="sm" variant="ghost" onClick={() => toast({ title: "Statement", description: "Statement download coming soon." })}>Statement</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!invoices.length && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay {paying?.invoiceNo}</DialogTitle></DialogHeader>
          {paying && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{paying.description} · balance {money(balance(paying))} · due {paying.dueDate ? new Date(paying.dueDate).toLocaleDateString("en-IN") : "—"}</p>
              <div className="space-y-2"><Label htmlFor="amount">Amount (₹)</Label><Input id="amount" type="number" min={1} max={balance(paying)} value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">A receipt number is issued as soon as the payment is booked; you can download the receipt from the table.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={processing}>Cancel</Button>
            <Button onClick={pay} disabled={processing}>{processing ? "Processing..." : `Pay ${amount ? money(Number(amount) || 0) : ""}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
