import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/ui/StatsCard";
import { Wallet, CreditCard, Building2, History, Plus, ArrowUpRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { qrDataUrl, upiUri } from "@/lib/upi";
import {
  getWalletsByOrg,
  getTransactionsByOrg,
  rechargeWallet,
  getBranches,
  getWallet,
  getTransactions,
  getBranchDetails,
  getRechargeUpi,
  setRechargeUpi,
  requestWalletRecharge,
  uploadRechargeProof,
  getPendingRecharges,
  getRechargeProofUrl,
  approveRecharge,
  rejectRecharge,
} from "@/lib/supabase/data";

interface Institute {
  id: string;
  name: string;
  directorName: string;
  balance: number;
}

type Recharge = {
  id: string;
  branchId: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  description?: string;
};

const METHODS = [
  { id: "upi", label: "UPI Payment", enumValue: "UPI", icon: Wallet },
  { id: "card", label: "Credit/Debit Card", enumValue: "CARD", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", enumValue: "NET_BANKING", icon: Building2 },
];

const quickAmounts = [5000, 10000, 25000, 50000, 100000];

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const newRechargeId = () => `rch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function WalletRecharge() {
  const { toast } = useToast();
  // `branchId` is set for a franchise/branch login and null for an org admin.
  // Everything below is scoped by it: a branch account must see its own wallet
  // and its own transactions, never the rest of the organisation's.
  const { user, branchId } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [history, setHistory] = useState<Recharge[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [remarks, setRemarks] = useState("");
  // Branch side of the approval flow: pay the org's UPI, then file proof.
  const [upi, setUpi] = useState<{ upiId: string; merchantName: string } | null>(null);
  const [qr, setQr] = useState("");
  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Admin side: what is waiting on a decision.
  const [pendingRows, setPendingRows] = useState<Recharge[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [upiDraft, setUpiDraft] = useState({ upiId: "", merchantName: "" });
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadWallet() {
      try {
        const orgId = user?.organizationId || null;
        // A branch login carries an organizationId too, so the branch has to be
        // checked first - keying off the org alone showed every branch's wallet.
        const [branches, wallets, txs] = branchId
          ? await Promise.all([
              getBranchDetails(orgId || "", branchId)
                .then((r) => [r.data])
                .catch(() => []),
              getWallet(branchId).then((r) => (r.data ? [r.data] : [])),
              getTransactions(branchId).then((r) => r.data || []),
            ])
          : await Promise.all([
              getBranches(orgId).then((r) => r.data || []),
              getWalletsByOrg(orgId).then((r) => r.data || []),
              getTransactionsByOrg(orgId).then((r) => r.data || []),
            ]);
        if (!cancelled) {
          const active = (branches as any[]).filter((b) => b && b.isActive !== false);
          const walletMap = new Map((wallets as any[]).map((w: any) => [w.branchId, Number(w.balance || 0)]));
          setInstitutes(
            active.map((b: any) => ({
              id: b.id,
              name: b.name,
              directorName: b.code,
              balance: Number(walletMap.get(b.id) ?? 0),
            }))
          );
          setHistory((txs as any[]).map((tx: any) => ({ ...tx, createdAt: tx.createdAt })));
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Failed to load wallet data",
            description: error instanceof Error ? error.message : undefined,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadWallet();
    return () => { cancelled = true; };
  }, [user?.organizationId, branchId, toast]);

  // With one branch there is nothing to search for, so it is simply selected.
  useEffect(() => {
    if (branchId && institutes.length === 1) setSelectedInstitute(institutes[0]);
  }, [branchId, institutes]);

  // The UPI account the branch is told to pay. Set by an admin on this page.
  useEffect(() => {
    const orgId = user?.organizationId;
    if (!orgId) return;
    getRechargeUpi(orgId)
      .then((r) => {
        setUpi(r.data);
        if (r.data) setUpiDraft({ upiId: r.data.upiId, merchantName: r.data.merchantName });
      })
      .catch(() => setUpi(null));
  }, [user?.organizationId]);

  // A QR carrying the amount, so the branch cannot mistype it into the app.
  useEffect(() => {
    const value = Number(amount);
    if (!upi || !Number.isFinite(value) || value <= 0) { setQr(""); return; }
    let live = true;
    qrDataUrl(upiUri({ upiId: upi.upiId, merchantName: upi.merchantName, amount: value, note: "Wallet recharge" }))
      .then((img) => { if (live) setQr(img); })
      .catch(() => { if (live) setQr(""); });
    return () => { live = false; };
  }, [upi, amount]);

  const loadPending = useCallback(() => {
    if (branchId || !user?.organizationId) return;
    getPendingRecharges(user.organizationId)
      .then((r) => setPendingRows(r.data as Recharge[]))
      .catch(() => setPendingRows([]));
  }, [branchId, user?.organizationId]);
  useEffect(() => { loadPending(); }, [loadPending]);

  const openProof = async (path?: string) => {
    if (!path) return;
    try {
      const { data } = await getRechargeProofUrl(path);
      window.open(data, "_blank", "noopener");
    } catch (e) {
      toast({ title: "Could not open the screenshot", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const decide = async (id: string, approve: boolean) => {
    setReviewing(id);
    try {
      const res = approve ? await approveRecharge(id, user?.id) : await rejectRecharge(id, "Rejected by admin", user?.id);
      if (!res.success) {
        toast({ title: "Could not review", description: (res as any).error, variant: "destructive" });
        return;
      }
      toast({ title: approve ? "Recharge approved" : "Recharge rejected" });
      setPendingRows((rows) => rows.filter((r) => r.id !== id));
      if (approve) window.location.reload();
    } catch (e) {
      toast({ title: "Could not review", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setReviewing(null);
    }
  };

  const saveUpi = async () => {
    if (!user?.organizationId) return;
    if (!upiDraft.upiId.trim()) {
      toast({ title: "Enter the UPI ID", description: "For example pushpak@ybl.", variant: "destructive" });
      return;
    }
    setSavingUpi(true);
    try {
      await setRechargeUpi(user.organizationId, upiDraft.upiId.trim(), upiDraft.merchantName.trim());
      setUpi({ upiId: upiDraft.upiId.trim(), merchantName: upiDraft.merchantName.trim() });
      toast({ title: "UPI account saved", description: "Branches will now see a QR for this account." });
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSavingUpi(false);
    }
  };

  /** The branch path: pay first, then file the UTR and the screenshot. */
  const submitForApproval = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Invalid amount", description: "Enter a recharge amount greater than zero.", variant: "destructive" });
      return;
    }
    if (!utr.trim()) {
      toast({ title: "UTR is required", description: "Enter the UTR / reference number from your payment app.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let proofPath: string | undefined;
      if (proof) proofPath = (await uploadRechargeProof(branchId!, proof)).data;
      const res = await requestWalletRecharge(branchId, {
        amount: value,
        paymentMethod: METHODS.find((m) => m.id === method)?.enumValue ?? "UPI",
        utr,
        proofPath,
        description: remarks || "Wallet recharge",
      });
      if (!res.success) {
        toast({ title: "Could not send for approval", description: res.error, variant: "destructive" });
        return;
      }
      setHistory((list) => [res.data as any, ...list]);
      toast({ title: "Sent for approval", description: `${inr(value)} is waiting on an admin. The balance moves once it is approved.` });
      setAmount(""); setUtr(""); setProof(null); setRemarks("");
    } catch (e) {
      toast({ title: "Could not send for approval", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInstitutes = institutes.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.directorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalance = institutes.reduce((sum, i) => sum + i.balance, 0);
  const thisMonth = history.filter((h) => h.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7));
  const pending = history.filter((h) => h.status === "PENDING");

  const reset = () => {
    setSelectedInstitute(null);
    setSearchQuery("");
    setAmount("");
    setRemarks("");
  };

  const recharge = async () => {
    const value = Number(amount);
    if (!selectedInstitute) {
      toast({ title: "Select an institute", description: "Search for the branch you want to top up.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Invalid amount", description: "Enter a recharge amount greater than zero.", variant: "destructive" });
      return;
    }
    const methodEnum = METHODS.find((m) => m.id === method)?.enumValue ?? "UPI";
    try {
      const res = await rechargeWallet(selectedInstitute.id, {
        amount: value,
        paymentMethod: methodEnum,
        description: remarks || `Wallet recharge for ${selectedInstitute.name}`,
      });
      if (res.success && res.data) {
        setHistory((list) => [res.data as any, ...list]);
        setInstitutes((list) =>
          list.map((i) => (i.id === selectedInstitute.id ? { ...i, balance: Number((res.data as any).balanceAfter || i.balance + value) } : i)),
        );
        toast({ title: "Recharge successful", description: `${inr(value)} added to ${selectedInstitute.name}.` });
        reset();
      } else {
        toast({ title: "Recharge failed", description: (res as any).error || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Recharge failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Wallet Recharge"
        description={branchId ? "Recharge your branch wallet" : "Recharge branch wallets for transactions"}
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "Wallet Recharge" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title={branchId ? "Wallet Balance" : "Total Balance"}
          value={inr(totalBalance)}
          subtitle={branchId ? "This branch" : "All branches combined"}
          icon={Wallet}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="This Month Recharge"
          value={inr(thisMonth.reduce((sum, h) => sum + h.amount, 0))}
          subtitle={`${thisMonth.length} transactions`}
          icon={CreditCard}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Pending Recharges"
          value={String(pending.length)}
          subtitle={`${inr(pending.reduce((sum, h) => sum + h.amount, 0))} pending`}
          icon={History}
        />
        <StatsCard
          title={branchId ? "Branch" : "Active Branches"}
          value={branchId ? institutes[0]?.name ?? "—" : String(institutes.length)}
          subtitle={branchId ? institutes[0]?.directorName ?? "" : "With wallet enabled"}
          icon={Building2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                New Recharge
              </CardTitle>
              <CardDescription>{branchId ? "Pay the amount below, then send it for approval" : "Add funds to a branch wallet"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                   <Label htmlFor="searchInstitute">{branchId ? "Institute" : "Search Institute *"}</Label>
                   {!branchId && (
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="searchInstitute"
                         placeholder="Search by name or director..."
                         className="pl-9"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                       />
                     </div>
                   )}
                   {!branchId && searchQuery && filteredInstitutes.length > 0 && (
                     <div className="border rounded-md mt-1 max-h-48 overflow-auto bg-background shadow-lg">
                       {filteredInstitutes.map((inst) => (
                         <div
                           key={inst.id}
                           className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                           onClick={() => {
                             setSelectedInstitute(inst);
                             setSearchQuery(inst.name);
                           }}
                         >
                           <p className="font-medium text-sm">{inst.name}</p>
                           <p className="text-xs text-muted-foreground">Director: {inst.directorName}</p>
                           <p className="text-xs text-success">Balance: ₹{inst.balance.toLocaleString()}</p>
                         </div>
                       ))}
                     </div>
                   )}
                   {selectedInstitute && (
                     <div className="bg-muted/50 p-3 rounded-md mt-2">
                       <p className="text-sm font-medium">{selectedInstitute.name}</p>
                       <p className="text-xs text-muted-foreground">Director: {selectedInstitute.directorName}</p>
                       <p className="text-xs text-success">Current Balance: ₹{selectedInstitute.balance.toLocaleString()}</p>
                     </div>
                   )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Recharge Amount *</Label>
                  <Input id="amount" type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Select Amount</Label>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((value) => (
                    <Button
                      key={value}
                      variant={Number(amount) === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(String(value))}
                    >
                      {inr(value)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {METHODS.map(({ id, label, icon: Icon }) => (
                    <Card
                      key={id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setMethod(id)}
                      onKeyDown={(e) => e.key === "Enter" && setMethod(id)}
                      className={`cursor-pointer border-2 transition-colors ${
                        method === id ? "border-primary" : "hover:border-primary"
                      }`}
                    >
                      <CardContent className="p-4 text-center">
                        <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-sm">{label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {branchId && (
                <div className="space-y-4 rounded-xl border p-4">
                  <div>
                    <p className="text-sm font-medium">Pay {Number(amount) > 0 ? inr(Number(amount)) : "the amount"}</p>
                    <p className="text-xs text-muted-foreground">
                      {upi
                        ? "Scan with any UPI app. The amount is already set in the code."
                        : "No UPI account has been set yet — ask an admin to add one on this page."}
                    </p>
                  </div>
                  {qr ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={qr} alt="UPI QR code" className="h-52 w-52 rounded-lg border bg-white p-2" />
                      <p className="text-xs text-muted-foreground">{upi?.merchantName} · {upi?.upiId}</p>
                    </div>
                  ) : (
                    upi && <p className="text-xs text-muted-foreground">Enter an amount to get the QR code.</p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="utr">UTR / Reference no *</Label>
                      <Input id="utr" placeholder="From your payment app" value={utr} onChange={(e) => setUtr(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proof">Payment screenshot</Label>
                      <Input id="proof" type="file" accept="image/*" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input id="remarks" placeholder="Add a note for this recharge" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                {branchId ? (
                  <Button className="gap-2" onClick={submitForApproval} disabled={submitting}>
                    <ArrowUpRight className="h-4 w-4" />
                    {submitting ? "Sending..." : "Send for approval"}
                  </Button>
                ) : (
                  <Button className="gap-2" onClick={recharge}>
                    <ArrowUpRight className="h-4 w-4" />
                    Proceed to Payment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!branchId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Recharge UPI account
                </CardTitle>
                <CardDescription>The account branches are shown a QR for.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <Input id="upi-id" placeholder="name@ybl" value={upiDraft.upiId} onChange={(e) => setUpiDraft({ ...upiDraft, upiId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upi-name">Account name</Label>
                  <Input id="upi-name" placeholder="Pushpak Kumar" value={upiDraft.merchantName} onChange={(e) => setUpiDraft({ ...upiDraft, merchantName: e.target.value })} />
                </div>
                <Button size="sm" onClick={saveUpi} disabled={savingUpi}>{savingUpi ? "Saving..." : "Save"}</Button>
              </CardContent>
            </Card>
          )}

          {!branchId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Awaiting approval
                </CardTitle>
                <CardDescription>
                  {pendingRows.length
                    ? "A branch has paid and filed proof. The balance moves when you approve."
                    : "Nothing is waiting on a decision."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRows.map((row) => {
                  const name = institutes.find((i) => i.id === row.branchId)?.name ?? row.branchId;
                  const proofPath = (row as any).proofUrl as string | undefined;
                  return (
                    <div key={row.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            UTR: {(row as any).reference || "—"} · {(row.createdAt || "").slice(0, 10)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{inr(row.amount)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {proofPath && (
                          <Button size="sm" variant="outline" onClick={() => openProof(proofPath)}>
                            View screenshot
                          </Button>
                        )}
                        <Button size="sm" onClick={() => decide(row.id, true)} disabled={reviewing === row.id}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(row.id, false)} disabled={reviewing === row.id}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Recharges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.slice(0, 5).map((item) => {
                  const branchName = institutes.find((i) => i.id === item.branchId)?.name ?? item.branchId;
                  const itemDate = item.createdAt ?? "";
                  // `branch_transactions` stores this as `paymentMethod`; there is no `method`.
                  const itemMethod = item.paymentMethod ?? "—";
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{branchName}</p>
                        <p className="text-xs text-muted-foreground">{itemDate} · {itemMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₹{item.amount.toLocaleString()}</p>
                        <Badge
                          variant={item.status === "COMPLETED" ? "default" : item.status === "PENDING" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="ghost" className="w-full mt-4" size="sm" onClick={() => navigate("/branch/transactions")}>
                View All Transactions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                 {institutes.map((inst) => (
                   <div key={inst.id} className="flex items-center justify-between">
                     <div>
                       <span className="text-sm">{inst.name}</span>
                       <p className="text-xs text-muted-foreground">{inst.directorName}</p>
                     </div>
                     <span className="font-medium text-success">₹{inst.balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
