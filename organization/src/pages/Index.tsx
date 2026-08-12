import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, BookOpen, CalendarDays, IndianRupee, Clock3, GraduationCap, MoreHorizontal, Plus, Receipt, UserPlus, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const weekly = [
  { day: "Mon", attendance: 91, fees: 42 }, { day: "Tue", attendance: 94, fees: 56 },
  { day: "Wed", attendance: 89, fees: 49 }, { day: "Thu", attendance: 96, fees: 71 },
  { day: "Fri", attendance: 93, fees: 64 }, { day: "Sat", attendance: 86, fees: 38 },
];
const fees = [{ m: "Apr", paid: 68, due: 22 }, { m: "May", paid: 78, due: 18 }, { m: "Jun", paid: 74, due: 26 }, { m: "Jul", paid: 89, due: 14 }, { m: "Aug", paid: 83, due: 17 }];
const quickActions = [
  { label: "New admission", hint: "Add a student", to: "/student/admission-form", icon: UserPlus },
  { label: "Collect fee", hint: "Record a payment", to: "/fee/collection", icon: IndianRupee },
  { label: "Mark attendance", hint: "Today's classes", to: "/attendance/mark", icon: Users },
  { label: "Create batch", hint: "Plan a cohort", to: "/course/batch/create", icon: BookOpen },
];

type DashboardData={students:number;courses:number;feesCollected:number;outstanding:number;attendancePercentage:number;enquiriesToday:number};
const Index = () => { const {toast}=useToast();const [metrics,setMetrics]=useState<DashboardData|null>(null);useEffect(()=>{api<DashboardData>("/core/dashboard").then(setMetrics).catch(error=>toast({title:"Live dashboard unavailable",description:error.message,variant:"destructive"}))},[]); const money=(value:number)=>value>=100000?`₹${(value/100000).toFixed(1)}L`:`₹${Math.round(value/1000)}K`; return (
  <AppLayout>
    <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Wednesday, 12 August</p><h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Good evening, Admin.</h1><p className="mt-1.5 text-sm text-muted-foreground">Here’s what needs your attention across the institution.</p></div>
      <Button asChild className="w-fit"><Link to="/student/admission-form"><Plus/>New admission</Link></Button>
    </section>

    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"Active students",value:metrics?.students??"—",delta:`${metrics?.courses??0}`,note:"active courses",icon:GraduationCap},{label:"Attendance today",value:metrics?`${metrics.attendancePercentage}%`:"—",delta:`${metrics?.enquiriesToday??0}`,note:"enquiries today",icon:Users},{label:"Fees collected",value:metrics?money(metrics.feesCollected):"—",delta:"Live",note:"this month",icon:Receipt},{label:"Outstanding",value:metrics?money(metrics.outstanding):"—",delta:"Due",note:"across invoices",icon:Clock3}].map((stat,i)=><Card key={stat.label} className={i===0?"border-foreground bg-foreground text-background":""}><CardContent className="p-4"><div className="mb-5 flex items-start justify-between"><p className={i===0?"text-sm text-background/60":"text-sm text-muted-foreground"}>{stat.label}</p><span className={i===0?"grid h-9 w-9 place-items-center rounded-xl bg-[#c7ff2f] text-[#171719]":"grid h-9 w-9 place-items-center rounded-xl bg-muted"}><stat.icon className="h-4 w-4"/></span></div><div className="flex items-end justify-between gap-2"><p className="text-3xl font-semibold tracking-[-.05em]">{stat.value}</p><p className={i===0?"pb-1 text-xs text-background/55":"pb-1 text-xs text-muted-foreground"}><span className={i===3?"mr-1 text-orange-500":"mr-1 text-emerald-500"}>{stat.delta}</span>{stat.note}</p></div></CardContent></Card>)}
    </section>

    <section className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_.9fr]">
      <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Institution pulse</CardTitle><p className="mt-1 text-xs text-muted-foreground">Attendance performance · this week</p></div><Button variant="ghost" size="icon"><MoreHorizontal/></Button></CardHeader><CardContent><div className="mb-2 flex items-end gap-2"><span className="text-4xl font-semibold tracking-[-.05em]">93.4%</span><Badge className="mb-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">+2.1%</Badge></div><ResponsiveContainer width="100%" height={230}><AreaChart data={weekly}><defs><linearGradient id="attendance" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7ff2f" stopOpacity={.45}/><stop offset="100%" stopColor="#c7ff2f" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={11}/><YAxis domain={[70,100]} axisLine={false} tickLine={false} fontSize={11}/><Tooltip contentStyle={{borderRadius:14,border:"1px solid hsl(var(--border))"}}/><Area type="monotone" dataKey="attendance" stroke="#8fb900" strokeWidth={3} fill="url(#attendance)"/></AreaChart></ResponsiveContainer></CardContent></Card>

      <Card><CardHeader><CardTitle>Quick actions</CardTitle><p className="text-xs text-muted-foreground">Your most-used workflows, directly accessible</p></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{quickActions.map(action=><Link key={action.label} to={action.to} className="group flex items-center gap-3 rounded-2xl border border-border/70 p-3 transition hover:border-foreground/20 hover:bg-muted/60"><span className="grid h-10 w-10 place-items-center rounded-xl bg-muted group-hover:bg-[#c7ff2f] group-hover:text-[#171719]"><action.icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{action.label}</span><span className="block text-xs text-muted-foreground">{action.hint}</span></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>)}</CardContent></Card>
    </section>

    <section className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Fee collection</CardTitle><p className="mt-1 text-xs text-muted-foreground">Paid and outstanding · last five months</p></div><Button variant="outline" size="sm" asChild><Link to="/fee/collection">View details</Link></Button></CardHeader><CardContent><ResponsiveContainer width="100%" height={220}><BarChart data={fees} barGap={5}><CartesianGrid vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="m" axisLine={false} tickLine={false} fontSize={11}/><YAxis axisLine={false} tickLine={false} fontSize={11}/><Tooltip contentStyle={{borderRadius:14,border:"1px solid hsl(var(--border))"}}/><Bar dataKey="paid" fill="#18181b" radius={[8,8,2,2]} maxBarSize={24}/><Bar dataKey="due" fill="#c7ff2f" radius={[8,8,2,2]} maxBarSize={24}/></BarChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Coming up</CardTitle><Button variant="ghost" size="icon"><CalendarDays/></Button></CardHeader><CardContent className="space-y-1">{[{day:"18",mon:"AUG",title:"Mid-term examinations",time:"09:00 · All branches"},{day:"21",mon:"AUG",title:"Parent–teacher meeting",time:"11:30 · Main campus"},{day:"28",mon:"AUG",title:"Fee payment deadline",time:"End of day"}].map((event,i)=><div key={event.title} className="flex items-center gap-3 border-b py-3 last:border-0"><div className={i===0?"grid h-12 w-12 place-items-center rounded-xl bg-[#c7ff2f] text-[#171719]":"grid h-12 w-12 place-items-center rounded-xl bg-muted"}><span className="text-center text-base font-bold leading-3">{event.day}<small className="mt-1 block text-[8px] font-semibold">{event.mon}</small></span></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{event.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{event.time}</p></div></div>)}</CardContent></Card>
    </section>
  </AppLayout>
);

};
export default Index;
