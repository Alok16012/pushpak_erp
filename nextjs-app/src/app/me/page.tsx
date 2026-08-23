"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Mail, Phone, BookOpen, Calendar, IndianRupee, FileText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface FeeSummary {
  total: number;
  paid: number;
  pending: number;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  total: number;
}

export default function StudentPortal() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeSummary>({ total: 0, paid: 0, pending: 0 });
  const [attendance, setAttendance] = useState<AttendanceSummary>({ present: 0, absent: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const [feesRes, attRes] = await Promise.all([
          fetch(`/api/fees/students/${profile.id}`),
          fetch(`/api/attendance?studentId=${profile.id}`),
        ]);
        if (feesRes.ok) setFees(await feesRes.json());
        if (attRes.ok) setAttendance(await attRes.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [profile]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Student Portal</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="mb-5 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {profile?.full_name?.split(" ").map(n => n[0]).join("") || "S"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold">{profile?.full_name}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          <Badge variant="secondary" className="mt-1">Student</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><Calendar className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="text-xl font-semibold">{attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><IndianRupee className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Fees</p>
                    <p className="text-xl font-semibold">₹{fees.pending.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><FileText className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-semibold">₹{fees.paid.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Fee Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Total Fees</p><p className="text-lg font-semibold">₹{fees.total.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold text-green-600">₹{fees.paid.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-semibold text-destructive">₹{fees.pending.toLocaleString()}</p></div>
              </div>
              {fees.pending > 0 && (
                <Button asChild><Link href="/me/fees">View payment details</Link></Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Present</p><p className="text-lg font-semibold">{attendance.present}</p></div>
                <div><p className="text-xs text-muted-foreground">Absent</p><p className="text-lg font-semibold text-destructive">{attendance.absent}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Classes</p><p className="text-lg font-semibold">{attendance.total}</p></div>
              </div>
              <Button asChild variant="outline"><Link href="/me/attendance">View detailed history</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
