import { useState } from "react";
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
import { useLocalCollection, useLocalState } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { feeReceiptPdf, feeStatementPdf } from "@/lib/documents";
import { downloadCsv } from "@/lib/export";
import {
  INVOICE_SEED, PORTAL_KEYS, PROFILE_SEED, feeSummary, invoiceStatus, money,
  type PortalInvoice, type StudentProfile,
} from "@/data/student-portal";

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "secondary", partial: "outline", pending: "default", overdue: "destructive",
};
const METHODS = ["UPI", "Card", "Net Banking", "Wallet"];

export default function MyFees() {
  const { toast } = useToast();
  const [profile] = useLocalState<StudentProfile>(PORTAL_KEYS.profile, PROFILE_SEED);
  const { items: invoices, update } = useLocalCollection<PortalInvoice>(PORTAL_KEYS.fees, INVOICE_SEED);
  const [paying, setPaying] = useState<PortalInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);

  const summary = feeSummary(invoices);
  const balance = (invoice: PortalInvoice) => invoice.amount - invoice.paid;

  const openPayment = (invoice: PortalInvoice) => {
    setPaying(invoice);
    setAmount(String(balance(invoice)));
    setMethod(METHODS[0]);
  };

  /** A portal payment is a real state change: it books against the invoice and
   *  issues the receipt number the student then downloads. */
  const pay = () => {
    if (!paying) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast({ title: "Enter an amount", variant: "destructive" });
    if (value > balance(paying)) return toast({ title: "Amount is more than the balance", description: `The balance on ${paying.invoiceNo} is ${money(balance(paying))}.`, variant: "destructive" });
    const receiptNo = `RCT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    update(paying.id, { paid: paying.paid + value, method, paidAt: new Date().toISOString().slice(0, 10), receiptNo });
    toast({ title: "Payment recorded", description: `${money(value)} against ${paying.invoiceNo} · receipt ${receiptNo}` });
    setPaying(null);
  };

  const receipt = (invoice: PortalInvoice) =>
    feeReceiptPdf({
      studentName: profile.name,
      rollNo: profile.rollNo,
      feeType: invoice.description,
      amount: invoice.paid,
      method: invoice.method ?? "Cash",
      receiptNo: invoice.receiptNo,
      balanceAfter: balance(invoice),
    });

  const statement = (invoice: PortalInvoice) =>
    feeStatementPdf({
      studentName: profile.name,
      rollNo: profile.rollNo,
      feeType: invoice.description,
      totalAmount: invoice.amount,
      paidAmount: invoice.paid,
      dueAmount: balance(invoice),
      dueDate: invoice.dueDate,
    });

  return (
    <AppLayout>
      <PageHeader
        title="Fees & receipts"
        description="What you have been billed, what is still open, and every receipt you can download."
        breadcrumbs={[{ label: "Fees & receipts" }]}
        actions={<Button variant="outline" onClick={() => downloadCsv("my-fees.csv", invoices.map((invoice) => ({ ...invoice, balance: balance(invoice), status: invoiceStatus(invoice) })))}><Download />Export CSV</Button>}
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
                const status = invoiceStatus(invoice);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap font-medium">{invoice.invoiceNo}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="tabular text-right">{money(invoice.amount)}</TableCell>
                    <TableCell className="tabular text-right">{money(invoice.paid)}</TableCell>
                    <TableCell className="tabular text-right font-medium">{money(balance(invoice))}</TableCell>
                    <TableCell><Badge variant={TONE[status]} className="capitalize">{status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {balance(invoice) > 0 && <Button size="sm" onClick={() => openPayment(invoice)}><IndianRupee className="mr-1 h-3.5 w-3.5" />Pay</Button>}
                        {invoice.receiptNo && <Button size="sm" variant="outline" onClick={() => receipt(invoice)}><Receipt className="mr-1 h-3.5 w-3.5" />Receipt</Button>}
                        <Button size="sm" variant="ghost" onClick={() => statement(invoice)}>Statement</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay {paying?.invoiceNo}</DialogTitle></DialogHeader>
          {paying && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{paying.description} · balance {money(balance(paying))} · due {new Date(paying.dueDate).toLocaleDateString("en-IN")}</p>
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
            <Button variant="outline" onClick={() => setPaying(null)}>Cancel</Button>
            <Button onClick={pay}>Pay {amount ? money(Number(amount) || 0) : ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
