import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, BookOpen, ClipboardCheck, IndianRupee, MoreHorizontal, Plus, Receipt, UserPlus, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/** One franchise's own month — the organisation-wide roll-up is the admin's. */
const collections = [
  { m: "Apr", collected: 3.2, due: 0.9 }, { m: "May", collected: 3.8, due: 0.7 },
  { m: "Jun", collected: 3.1, due: 1.2 }, { m: "Jul", collected: 4.4, due: 0.6 },
  { m: "Aug", collected: 4.1, due: 0.8 },
];
const funnel = [
  { stage: "New enquiries", count: 18, to: "/enquiry/branch" },
  { stage: "Follow-up due", count: 7, to: "/reception/enquiry" },
  { stage: "Online applications", count: 5, to: "/student/online-admissions" },
  { stage: "Admitted this month", count: 11, to: "/student/view" },
];
const batchesToday = [
  { name: "2026-A · Computer Applications", time: "09:30 – 11:00", faculty: "Prof. Sarah Johnson", strength: 32 },
  { name: "2026-B · Tally & Accounting", time: "11:30 – 13:00", faculty: "Mr. Michael Brown", strength: 26 },
  { name: "2026-C · Spoken English", time: "16:00 – 17:30", faculty: "Ms. Emily Davis", strength: 21 },
];
const WALLET_BALANCE = 18_400;
const WALLET_FLOOR = 25_000;

const quickActions = [
  { label: "New admission", hint: "Enrol a student", to: "/student/admission-form", icon: UserPlus },
  { label: "Collect fee", hint: "Record a payment", to: "/fee/collection", icon: IndianRupee },
  { label: "Mark attendance", hint: "Today's batches", to: "/attendance/mark", icon: ClipboardCheck },
  { label: "Recharge wallet", hint: "Top up the branch", to: "/branch/wallet", icon: Wallet },
];

type DashboardData = { students: number; courses: number; feesCollected: number; outstanding: number; attendancePercentage: number; enquiriesToday: number };

export default function FranchiseDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const load = useCallback(
    () => api<DashboardData>("/core/dashboard").then(setMetrics).catch((error) => toast({ title: "Live metrics unavailable", description: error.message, variant: "destructive" })),
    [toast],
  );
  useEffect(() => { load(); }, [load]);

  const money = (value: number) => (value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${Math.round(value / 1000)}K`);
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const branch = user?.name ?? "Your branch";

  const stats = [
    { label: "Students on roll", value: metrics?.students ?? "—", note: `${metrics?.courses ?? 0} courses running`, icon: Users, to: "/student/view" },
    { label: "Attendance today", value: metrics ? `${metrics.attendancePercentage}%` : "—", note: `${batchesToday.length} batches scheduled`, icon: ClipboardCheck, to: "/attendance/report" },
    { label: "Fees collected", value: metrics ? money(metrics.feesCollected) : "—", note: "this month", icon: Receipt, to: "/fee/collection" },
    { label: "Outstanding", value: metrics ? money(metrics.outstanding) : "—", note: "across invoices", icon: IndianRupee, to: "/fee/due-collection" },
  ];

  const alerts = [
    ...(WALLET_BALANCE < WALLET_FLOOR ? [{ text: `Wallet balance is ₹${WALLET_BALANCE.toLocaleString("en-IN")} — below the ₹${WALLET_FLOOR.toLocaleString("en-IN")} floor for issuing certificates.`, to: "/branch/wallet", action: "Recharge" }] : []),
    { text: `${funnel[1].count} enquiries are waiting on a follow-up call.`, to: "/reception/enquiry", action: "Open reception" },
    { text: "9 students are below the 75% attendance requirement.", to: "/attendance/report", action: "See report" },
  ];

  return (
    <AppLayout>
      <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow-muted mb-2.5">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{greeting}.</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{branch} · everything below is scoped to this branch only.</p>
        </div>
        <Button asChild className="w-fit"><Link to="/student/admission-form"><Plus />New admission</Link></Button>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group">
            <Card className="h-full transition-colors hover:border-brand/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="eyebrow pt-1">{stat.label}</p>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand/12 group-hover:text-brand-ink"><stat.icon className="h-4 w-4" /></span>
                </div>
                <p className="metric mt-4">{stat.value}</p>
                <p className="mt-3 text-xs text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Collections</CardTitle><div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px] bg-chart-1" />Collected</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px] bg-chart-4" />Still due</span><span>· ₹ lakh, last five months</span></div></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => { load(); toast({ title: "Metrics refreshed" }); }}>Refresh metrics</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadCsv("branch-collections.csv", collections)}>Export collections (CSV)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/fee/due-collection")}>Open due collection</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={collections} barGap={5} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" />
                <XAxis dataKey="m" axisLine={false} tickLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / .5)" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", fontSize: 12 }} />
                <Bar name="Collected" dataKey="collected" fill="hsl(var(--chart-1))" radius={[5, 5, 2, 2]} maxBarSize={22} />
                <Bar name="Still due" dataKey="due" fill="hsl(var(--chart-4))" radius={[5, 5, 2, 2]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" />Branch wallet</CardTitle><Button size="sm" asChild><Link to="/branch/wallet">Recharge</Link></Button></CardHeader>
            <CardContent>
              <p className="metric">₹{WALLET_BALANCE.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Certificates and ID cards are issued against this balance.</p>
              {WALLET_BALANCE < WALLET_FLOOR && <p className="mt-3 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Below the ₹{WALLET_FLOOR.toLocaleString("en-IN")} working floor.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.to} className="group flex items-center gap-3 rounded-2xl border border-border/70 p-3 transition hover:border-foreground/20 hover:bg-muted/60">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted transition-colors group-hover:bg-brand group-hover:text-brand-foreground"><action.icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{action.label}</span><span className="block text-xs text-muted-foreground">{action.hint}</span></span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Admissions pipeline</CardTitle><Button variant="ghost" size="icon" title="Open enquiries" onClick={() => navigate("/enquiry/branch")}><BookOpen /></Button></CardHeader>
          <CardContent className="space-y-1">
            {funnel.map((stage) => (
              <Link key={stage.stage} to={stage.to} className="flex items-center justify-between gap-3 border-b py-3 last:border-0 hover:text-brand-ink">
                <span className="text-sm">{stage.stage}</span>
                <span className="tabular text-sm font-semibold">{stage.count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Today's batches</CardTitle><Button variant="outline" size="sm" asChild><Link to="/attendance/mark">Mark attendance</Link></Button></CardHeader>
          <CardContent className="space-y-1">
            {batchesToday.map((batch) => (
              <div key={batch.name} className="flex flex-wrap items-center gap-3 border-b py-3 last:border-0">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{batch.name}</p><p className="text-xs text-muted-foreground">{batch.time} · {batch.faculty}</p></div>
                <Badge variant="outline">{batch.strength} students</Badge>
              </div>
            ))}
            <div className="space-y-2 pt-3">
              {alerts.map((alert) => (
                <div key={alert.text} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3">
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground">{alert.text}</p>
                  <Button size="sm" variant="ghost" asChild><Link to={alert.to}>{alert.action}</Link></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
