import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownLeft, IndianRupee, TrendingUp, TrendingDown, Download } from "lucide-react";
import { useState } from "react";
import { downloadCsv, downloadHtml, printHtml } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  date: string;
  branch: string;
  type: "credit" | "debit";
  category: string;
  description: string;
  amount: number;
  balance: number;
  reference: string;
}

const transactionsData: Transaction[] = [
  { id: "1", date: "2024-01-15", branch: "Main Campus", type: "credit", category: "Fee Collection", description: "Student fee payment - Batch A", amount: 125000, balance: 485000, reference: "TXN001234" },
  { id: "2", date: "2024-01-15", branch: "Main Campus", type: "debit", category: "Salary", description: "Staff salary disbursement", amount: 85000, balance: 400000, reference: "TXN001235" },
  { id: "3", date: "2024-01-14", branch: "North Campus", type: "credit", category: "Fee Collection", description: "Exam fee collection", amount: 45000, balance: 485000, reference: "TXN001236" },
  { id: "4", date: "2024-01-14", branch: "South Campus", type: "debit", category: "Utilities", description: "Electricity bill payment", amount: 12000, balance: 53000, reference: "TXN001237" },
  { id: "5", date: "2024-01-13", branch: "Main Campus", type: "credit", category: "Wallet Recharge", description: "Admin wallet recharge", amount: 50000, balance: 485000, reference: "TXN001238" },
  { id: "6", date: "2024-01-13", branch: "East Campus", type: "debit", category: "Maintenance", description: "Building repair work", amount: 25000, balance: 45000, reference: "TXN001239" },
  { id: "7", date: "2024-01-12", branch: "North Campus", type: "credit", category: "Fee Collection", description: "Late fee payment - 15 students", amount: 7500, balance: 440000, reference: "TXN001240" },
  { id: "8", date: "2024-01-12", branch: "Main Campus", type: "debit", category: "Purchase", description: "Lab equipment purchase", amount: 35000, balance: 435000, reference: "TXN001241" },
];

const columns: Column<Transaction>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
  },
  {
    key: "branch",
    header: "Branch",
    sortable: true,
  },
  {
    key: "type",
    header: "Type",
    cell: (txn) => (
      <div className="flex items-center gap-2">
        {txn.type === "credit" ? (
          <ArrowDownLeft className="h-4 w-4 text-success" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-destructive" />
        )}
        <Badge variant={txn.type === "credit" ? "default" : "secondary"}>
          {txn.type === "credit" ? "Credit" : "Debit"}
        </Badge>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (txn) => <Badge variant="outline">{txn.category}</Badge>,
  },
  {
    key: "description",
    header: "Description",
    cell: (txn) => (
      <div>
        <p className="text-sm">{txn.description}</p>
        <p className="text-xs text-muted-foreground">{txn.reference}</p>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    cell: (txn) => (
      <span className={`font-medium ${txn.type === "credit" ? "text-success" : "text-destructive"}`}>
        {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString()}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Balance",
    cell: (txn) => <span className="font-medium">₹{txn.balance.toLocaleString()}</span>,
  },
];

/** The printable/downloadable receipt body for one transaction. */
const receiptHtml = (txn: Transaction) => `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
    <h1 style="margin:0;font-size:20px">Pushpak Institute</h1>
    <p style="margin:4px 0 20px;color:#6b7280;font-size:13px">Transaction receipt · ${txn.reference}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      ${[
        ["Date", txn.date],
        ["Branch", txn.branch],
        ["Category", txn.category],
        ["Description", txn.description],
        ["Type", txn.type === "credit" ? "Credit" : "Debit"],
        ["Amount", `${txn.type === "credit" ? "+" : "−"}₹${txn.amount.toLocaleString()}`],
        ["Balance after", `₹${txn.balance.toLocaleString()}`],
      ]
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 0;color:#6b7280">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600">${value}</td></tr>`,
        )
        .join("")}
    </table>
    <p style="margin-top:28px;font-size:11px;color:#6b7280">Generated ${new Date().toLocaleString()} · system generated, no signature required.</p>
  </div>`;

export default function BranchTransactions() {
  const { toast } = useToast();
  const [details, setDetails] = useState<Transaction | null>(null);

  const downloadReceipt = (txn: Transaction) => {
    downloadHtml(`receipt-${txn.reference}.html`, `Receipt ${txn.reference}`, receiptHtml(txn));
    toast({ title: "Receipt downloaded", description: `receipt-${txn.reference}.html` });
  };

  const exportAll = () => {
    downloadCsv(
      "branch-transactions.csv",
      transactionsData.map((txn) => ({
        Date: txn.date,
        Branch: txn.branch,
        Type: txn.type,
        Category: txn.category,
        Description: txn.description,
        Amount: txn.amount,
        Balance: txn.balance,
        Reference: txn.reference,
      })),
    );
    toast({ title: "Transactions exported", description: `${transactionsData.length} rows written to CSV.` });
  };

  const handleActions = (txn: Transaction) => [
    { label: "View Details", onClick: () => setDetails(txn) },
    { label: "Download Receipt", onClick: () => downloadReceipt(txn) },
    { label: "Print", onClick: () => printHtml(`Receipt ${txn.reference}`, receiptHtml(txn)) },
  ];

  const totalCredits = transactionsData.filter(t => t.type === "credit").reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactionsData.filter(t => t.type === "debit").reduce((sum, t) => sum + t.amount, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Branch Transactions"
        description="View all financial transactions across branches"
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "Transactions" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={exportAll}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Transactions"
          value={transactionsData.length}
          subtitle="This month"
          icon={IndianRupee}
        />
        <StatsCard
          title="Total Credits"
          value={`₹${(totalCredits / 1000).toFixed(0)}K`}
          subtitle="Incoming funds"
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Debits"
          value={`₹${(totalDebits / 1000).toFixed(0)}K`}
          subtitle="Outgoing funds"
          icon={TrendingDown}
          trend={{ value: 5, isPositive: false }}
        />
        <StatsCard
          title="Net Balance"
          value={`₹${((totalCredits - totalDebits) / 1000).toFixed(0)}K`}
          subtitle="Credits - Debits"
          icon={IndianRupee}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <DataTable
        data={transactionsData}
        columns={columns}
        searchPlaceholder="Search transactions..."
        actions={handleActions}
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.description}</DialogTitle>
            <DialogDescription>{details?.reference} · {details?.branch}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Date", details.date],
                ["Category", details.category],
                ["Type", details.type === "credit" ? "Credit" : "Debit"],
                ["Amount", `${details.type === "credit" ? "+" : "−"}₹${details.amount.toLocaleString()}`],
                ["Balance after", `₹${details.balance.toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => details && downloadReceipt(details)}>Download receipt</Button>
            <Button onClick={() => details && printHtml(`Receipt ${details.reference}`, receiptHtml(details))}>Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
