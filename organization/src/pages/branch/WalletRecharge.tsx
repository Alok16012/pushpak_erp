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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getWallet, rechargeWallet, getTransactions, getBranches } from "@/lib/supabase/data";

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
  const { user } = useAuth();
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

  useEffect(() => {
    let cancelled = false;
    async function loadWallet() {
      try {
        const orgId = user?.organizationId || null;
        const [branchesRes, walletRes, txRes] = await Promise.all([
          getBranches(orgId),
          getWallet(user?.branchId || ""),
          getTransactions(user?.branchId || ""),
        ]);
        if (!cancelled) {
          const branches = (branchesRes.data || []).filter((b: any) => b.isActive !== false);
          const walletMap = new Map((txRes.data || []).filter((t: any) => t.status === "COMPLETED").map((t: any) => [t.branchId, t.balanceAfter]));
          setInstitutes(
            branches.map((b: any) => ({
              id: b.id,
              name: b.name,
              directorName: b.code,
              balance: Number(walletMap.get(b.id) ?? 0),
            }))
          );
          setWalletData(walletRes.data);
          setHistory(txRes.data as Recharge[] || []);
        }
      } catch {
        if (!cancelled) {
          toast({ title: "Failed to load wallet data", variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadWallet();
    return () => { cancelled = true; };
  }, [user?.branchId, user?.organizationId, toast]);

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
        description="Recharge branch wallets for transactions"
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "Wallet Recharge" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Balance"
          value={inr(totalBalance)}
          subtitle="All branches combined"
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
          title="Active Branches"
          value={String(institutes.length)}
          subtitle="With wallet enabled"
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
              <CardDescription>Add funds to a branch wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                   <Label htmlFor="searchInstitute">Search Institute *</Label>
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
                   {searchQuery && filteredInstitutes.length > 0 && (
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

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input id="remarks" placeholder="Add a note for this recharge" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button className="gap-2" onClick={recharge}>
                  <ArrowUpRight className="h-4 w-4" />
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
                  const itemMethod = item.paymentMethod ?? item.method ?? "—";
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
