import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Video, Users, Calendar, Clock, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export";
import { getBatchTimings, updateBatchTiming } from "@/lib/supabase/data";

interface LiveClass {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  course: string;
  batch: string;
  date: string;
  time: string;
  duration: string;
  platform: string;
  meetingLink?: string;
  meetingId?: string;
  description?: string;
  attendees: number;
  totalStudents: number;
  status: "scheduled" | "active" | "completed" | "cancelled";
  recorded?: boolean;
}

const columns: Column<LiveClass>[] = [
  {
    key: "title",
    header: "Class",
    sortable: true,
    cell: (liveClass) => (
      <div>
        <p className="font-medium">{liveClass.title}</p>
        <p className="text-xs text-muted-foreground">{liveClass.subject}</p>
      </div>
    ),
  },
  {
    key: "instructor",
    header: "Instructor",
    cell: (liveClass) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">
            {liveClass.instructor.split(" ").slice(-1)[0][0]}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{liveClass.instructor}</span>
      </div>
    ),
  },
  {
    key: "batch",
    header: "Batch",
    cell: (liveClass) => (
      <div>
        <p className="font-medium">{liveClass.batch}</p>
        <p className="text-xs text-muted-foreground">{liveClass.course}</p>
      </div>
    ),
  },
  {
    key: "date",
    header: "Schedule",
    sortable: true,
    cell: (liveClass) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm">{new Date(liveClass.date).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">{liveClass.time} ({liveClass.duration})</p>
        </div>
      </div>
    ),
  },
  {
    key: "platform",
    header: "Platform",
    cell: (liveClass) => <Badge variant="secondary">{liveClass.platform}</Badge>,
  },
  {
    key: "attendees",
    header: "Attendance",
    cell: (liveClass) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{liveClass.attendees}/{liveClass.totalStudents}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (liveClass) => <StatusBadge status={liveClass.status} />,
  },
];

export default function ViewLiveClasses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [classesData, setClassesData] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<LiveClass | null>(null);
  const [editing, setEditing] = useState<LiveClass | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await api<{ items: LiveClass[] }>("/core/portal/classes");
        setClassesData(data.data.items);
      } catch {
        toast({ title: "Failed to load classes", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [toast]);

  const join = (liveClass: LiveClass) => {
    if (!liveClass.meetingLink) {
      toast({ title: "No meeting link on this class", variant: "destructive" });
      return;
    }
    window.open(liveClass.meetingLink, "_blank", "noopener");
    toast({ title: "Opening the class", description: `${liveClass.platform} · ${liveClass.title}` });
  };

  const cancelClass = async (liveClass: LiveClass) => {
    try {
      await updateBatchTiming(liveClass.id, { status: "cancelled" });
      setClassesData((prev) => prev.map((c) => (c.id === liveClass.id ? { ...c, status: "cancelled" } : c)));
      toast({ title: "Class cancelled", description: `${liveClass.title} was marked cancelled.` });
    } catch {
      toast({ title: "Failed to cancel class", variant: "destructive" });
    }
  };

  const recording = (liveClass: LiveClass) => {
    if (!liveClass.recorded) {
      toast({
        title: "No recording available",
        description: `${liveClass.title} was not recorded.`,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Recording ready", description: `Streaming ${liveClass.title} from ${liveClass.platform}.` });
    setDetails(liveClass);
  };

  const attendanceReport = (liveClass: LiveClass) => {
    downloadCsv(`attendance-${liveClass.title.toLowerCase().replace(/\s+/g, "-")}.csv`, [
      {
        Class: liveClass.title,
        Instructor: liveClass.instructor,
        Batch: liveClass.batch,
        Date: liveClass.date,
        Time: liveClass.time,
        Attended: liveClass.attendees,
        Enrolled: liveClass.totalStudents,
        "Attendance %": Math.round((liveClass.attendees / liveClass.totalStudents) * 100),
      },
    ]);
    toast({ title: "Attendance report exported" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast({ title: "Class title is required", variant: "destructive" });
      return;
    }
    try {
      await updateBatchTiming(editing.id, editing);
      setClassesData((prev) => prev.map((c) => (c.id === editing.id ? editing : c)));
      toast({ title: "Class updated", description: `${editing.title} was saved.` });
      setEditing(null);
    } catch {
      toast({ title: "Failed to update class", variant: "destructive" });
    }
  };

  const handleActions = (liveClass: LiveClass) => {
    const actions = [
      { label: "View Details", onClick: () => setDetails(liveClass) },
    ];

    if (liveClass.status === "active") {
      actions.unshift({ label: "Join Class", onClick: () => join(liveClass) });
    }
    if (liveClass.status === "scheduled") {
      actions.push({ label: "Edit", onClick: () => setEditing(liveClass) });
      actions.push({ label: "Cancel", onClick: () => cancelClass(liveClass) });
    }
    if (liveClass.status === "completed") {
      actions.push({ label: "View Recording", onClick: () => recording(liveClass) });
      actions.push({ label: "Attendance Report", onClick: () => attendanceReport(liveClass) });
    }

    return actions;
  };

  const liveNow = classesData.filter((c) => c.status === "active").length;
  const upcoming = classesData.filter((c) => c.status === "scheduled").length;
  const finished = classesData.filter((c) => c.status === "completed");
  const avgAttendance = finished.length
    ? Math.round(
        finished.reduce((sum, c) => sum + (c.attendees / c.totalStudents) * 100, 0) / finished.length,
      )
    : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading classes...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Live Classes"
        description="View and manage live class sessions"
        breadcrumbs={[
          { label: "Live Class", href: "/live-class/view" },
          { label: "View Classes" },
        ]}
        actions={
          <Button className="gap-2" onClick={() => navigate("/live-class/setup")}>
            <Plus className="h-4 w-4" />
            Schedule Class
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard title="Total Classes" value={classesData.length} subtitle="On the schedule" icon={Video} variant="primary" />
        <StatsCard title="Live Now" value={liveNow} subtitle="In progress" icon={Play} variant="success" />
        <StatsCard title="Upcoming" value={upcoming} subtitle="Scheduled" icon={Calendar} variant="info" />
        <StatsCard title="Avg. Attendance" value={`${avgAttendance}%`} subtitle="Completed classes" icon={Users} variant="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={classesData}
            columns={columns}
            searchPlaceholder="Search classes..."
            actions={handleActions}
          />
        </CardContent>
      </Card>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.title}</DialogTitle>
            <DialogDescription>{details?.subject} · {details?.instructor}</DialogDescription>
          </DialogHeader>
          {details && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Course", `${details.course} · ${details.batch}`],
                  ["Schedule", `${new Date(details.date).toLocaleDateString()} at ${details.time}`],
                  ["Duration", details.duration],
                  ["Platform", details.platform],
                  ["Attendance", `${details.attendees}/${details.totalStudents}`],
                  ["Recording", details.recorded ? "Available" : "Not recorded"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {details.description && <p className="text-sm text-muted-foreground">{details.description}</p>}
              {details.meetingLink && (
                <p className="truncate text-xs text-muted-foreground" title={details.meetingLink}>
                  {details.meetingLink}
                </p>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
            {details?.meetingLink && <Button onClick={() => join(details)}>Open meeting</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Change the schedule for this session.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="class-title">Title</Label>
                <Input id="class-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-date">Date</Label>
                <Input id="class-date" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-time">Time</Label>
                <Input id="class-time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="class-link">Meeting link</Label>
                <Input id="class-link" value={editing.meetingLink ?? ""} onChange={(e) => setEditing({ ...editing, meetingLink: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
