import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Clock, TrendingUp, Download, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv } from "@/lib/export";
import { getEnquiries, createEnquiry, updateEnquiry } from "@/lib/supabase/data";

interface StudentEnquiry {
  id: string;
  date: string;
  name: string;
  phone: string;
  email: string;
  currentClass: string;
  applyingFor: string;
  parentName: string;
  parentPhone: string;
  preferredBranch: string;
  city: string;
  status: "new" | "contacted" | "scheduled" | "visited" | "applied" | "closed";
  visitDate?: string;
  infoPackSentOn?: string;
  closedReason?: string;
}

const STAFF_OPTIONS = ["John Doe", "Jane Smith", "Mike Johnson"];

const columns: Column<StudentEnquiry>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
  },
  {
    key: "name",
    header: "Student",
    cell: (enquiry) => (
      <div>
        <p className="font-medium">{enquiry.name}</p>
        <p className="text-xs text-muted-foreground">{enquiry.email}</p>
      </div>
    ),
  },
  {
    key: "currentClass",
    header: "Current Class",
  },
  {
    key: "applyingFor",
    header: "Applying For",
    cell: (enquiry) => <Badge variant="secondary">{enquiry.applyingFor}</Badge>,
  },
  {
    key: "parentName",
    header: "Parent",
    cell: (enquiry) => (
      <div>
        <p className="text-sm">{enquiry.parentName}</p>
        <p className="text-xs text-muted-foreground">{enquiry.parentPhone}</p>
      </div>
    ),
  },
  {
    key: "preferredBranch",
    header: "Preferred Branch",
  },
  {
    key: "city",
    header: "City",
  },
  {
    key: "status",
    header: "Status",
    cell: (enquiry) => <StatusBadge status={enquiry.status} />,
  },
];

export default function OnlineStudentEnquiry() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<StudentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<StudentEnquiry | null>(null);
  const [scheduling, setScheduling] = useState<StudentEnquiry | null>(null);
  const [visitDate, setVisitDate] = useState(
    new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
  );
  const [converting, setConverting] = useState<StudentEnquiry | null>(null);
  const [assignedTo, setAssignedTo] = useState(STAFF_OPTIONS[0]);
  const [closing, setClosing] = useState<StudentEnquiry | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadEnquiries() {
      try {
        const result = await getEnquiries(user!.branchId);
        if (!cancelled) {
          setEnquiries(result.data as unknown as StudentEnquiry[]);
        }
      } catch (err) {
        if (!cancelled) {
          toast({ title: "Failed to load enquiries", variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadEnquiries();
    return () => { cancelled = true; };
  }, [toast]);

  const refreshEnquiries = async () => {
    try {
      const result = await getEnquiries(user!.branchId);
      setEnquiries(result.data as unknown as StudentEnquiry[]);
    } catch {
      // silent
    }
  };

  const scheduleVisit = async () => {
    if (!scheduling) return;
    if (!visitDate) {
      toast({ title: "Pick a visit date", variant: "destructive" });
      return;
    }
    try {
      await updateEnquiry(scheduling.id, user!.branchId, { status: "scheduled", visitDate });
      await refreshEnquiries();
      toast({ title: "Campus visit scheduled", description: `${scheduling.name} on ${visitDate}.` });
      setScheduling(null);
    } catch {
      toast({ title: "Failed to schedule visit", variant: "destructive" });
    }
  };

  const sendInfoPack = async (enquiry: StudentEnquiry) => {
    const today = new Date().toISOString().slice(0, 10);
    const newStatus = enquiry.status === "new" ? "contacted" : enquiry.status;
    try {
      await updateEnquiry(enquiry.id, user!.branchId, { infoPackSentOn: today, status: newStatus });
      await refreshEnquiries();
      toast({
        title: "Info pack sent",
        description: `Prospectus for ${enquiry.applyingFor} emailed to ${enquiry.email}.`,
      });
    } catch {
      toast({ title: "Failed to send info pack", variant: "destructive" });
    }
  };

  const convertToApplication = async () => {
    if (!converting) return;
    try {
      const leadData = {
        date: new Date().toISOString().slice(0, 10),
        name: converting.name,
        phone: converting.phone,
        email: converting.email,
        course: converting.applyingFor,
        source: "Website",
        assignedTo,
        followUpDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        status: "interested",
        priority: "high",
        notes: `Online student enquiry · ${converting.currentClass} → ${converting.applyingFor} · parent ${converting.parentName} (${converting.parentPhone}) · ${converting.preferredBranch}`,
      };
      const newLead = await createEnquiry(user!.branchId, leadData);
      await updateEnquiry(converting.id, user!.branchId, { status: "applied" });
      await refreshEnquiries();
      toast({
        title: "Converted to application",
        description: `${converting.name} added to Branch Enquiries for ${assignedTo}.`,
      });
      setConverting(null);
    } catch {
      toast({ title: "Failed to convert to application", variant: "destructive" });
    }
  };

  const closeEnquiry = async () => {
    if (!closing) return;
    try {
      await updateEnquiry(closing.id, user!.branchId, { status: "closed" });
      await refreshEnquiries();
      toast({ title: "Enquiry closed", description: closing.name });
    } catch {
      toast({ title: "Failed to close enquiry", variant: "destructive" });
    }
    setClosing(null);
  };

  const exportAll = () => {
    downloadCsv(
      "online-student-enquiries.csv",
      enquiries.map((enquiry) => ({
        Date: enquiry.date,
        Student: enquiry.name,
        Phone: enquiry.phone,
        Email: enquiry.email,
        CurrentClass: enquiry.currentClass,
        ApplyingFor: enquiry.applyingFor,
        Parent: enquiry.parentName,
        ParentPhone: enquiry.parentPhone,
        City: enquiry.city,
        PreferredBranch: enquiry.preferredBranch,
        Status: enquiry.status,
        VisitDate: enquiry.visitDate ?? "",
      })),
    );
    toast({ title: "Enquiries exported", description: `${enquiries.length} rows written to CSV.` });
  };

  const handleActions = (enquiry: StudentEnquiry) => [
    { label: "View Details", onClick: () => setDetails(enquiry) },
    {
      label: "Schedule Visit",
      onClick: () => {
        setVisitDate(enquiry.visitDate ?? new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
        setScheduling(enquiry);
      },
    },
    { label: "Send Info Pack", onClick: () => sendInfoPack(enquiry) },
    {
      label: "Convert to Application",
      onClick: () => {
        setAssignedTo(STAFF_OPTIONS[0]);
        setConverting(enquiry);
      },
    },
    { label: "Mark as Closed", onClick: () => setClosing(enquiry), destructive: true },
  ];

  const statusCounts = {
    new: enquiries.filter(e => e.status === "new").length,
    contacted: enquiries.filter(e => e.status === "contacted").length,
    scheduled: enquiries.filter(e => e.status === "scheduled").length,
    visited: enquiries.filter(e => e.status === "visited").length,
    applied: enquiries.filter(e => e.status === "applied").length,
  };

  const conversionRate = enquiries.length
    ? Math.round((statusCounts.applied / enquiries.length) * 100)
    : 0;

  return (
    <AppLayout>
      <PageHeader
        title="Online Student Enquiries"
        description="Manage admission enquiries from prospective students"
        breadcrumbs={[
          { label: "Enquiry Management", href: "/enquiry/branch" },
          { label: "Online Student Enquiry" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={exportAll}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Enquiries"
          value={enquiries.length}
          subtitle="This month"
          icon={GraduationCap}
          trend={{ value: 18, isPositive: true }}
        />
        <StatsCard
          title="New Leads"
          value={statusCounts.new}
          subtitle="Pending contact"
          icon={Users}
        />
        <StatsCard
          title="Visits Scheduled"
          value={statusCounts.scheduled}
          subtitle="This week"
          icon={Clock}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Enquiry to application"
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-6">
        {[
          { label: "New", value: statusCounts.new, tone: "text-muted-foreground" },
          { label: "Contacted", value: statusCounts.contacted, tone: "text-primary" },
          { label: "Scheduled", value: statusCounts.scheduled, tone: "text-warning" },
          { label: "Visited", value: statusCounts.visited, tone: "text-success" },
          { label: "Applied", value: statusCounts.applied, tone: "text-success" },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${tile.tone}`}>{tile.value}</p>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable
        data={enquiries}
        columns={columns}
        searchPlaceholder="Search student enquiries..."
        actions={handleActions}
        emptyMessage="No student enquiries received"
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.phone} · {details?.email}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Enquiry date", details.date],
                ["Current class", details.currentClass],
                ["Applying for", details.applyingFor],
                ["Preferred branch", details.preferredBranch],
                ["City", details.city],
                ["Parent", `${details.parentName} · ${details.parentPhone}`],
                ["Status", details.status],
                ["Campus visit", details.visitDate ?? "not scheduled"],
                ["Info pack sent", details.infoPackSentOn ?? "not sent"],
                ...(details.closedReason ? [["Closed because", details.closedReason]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!details) return;
                setVisitDate(details.visitDate ?? new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
                setScheduling(details);
                setDetails(null);
              }}
            >
              Schedule visit
            </Button>
            <Button onClick={() => details && sendInfoPack(details)}>Send info pack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduling} onOpenChange={(open) => !open && setScheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule campus visit</DialogTitle>
            <DialogDescription>
              {scheduling?.name} · {scheduling?.preferredBranch}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Visit date</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduling(null)}>Cancel</Button>
            <Button onClick={scheduleVisit}>Schedule visit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!converting} onOpenChange={(open) => !open && setConverting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to application</DialogTitle>
            <DialogDescription>
              Creates a branch enquiry for {converting?.name} ({converting?.applyingFor}) on the follow-up desk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Assign to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAFF_OPTIONS.map((staff) => (
                  <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConverting(null)}>Cancel</Button>
            <Button onClick={convertToApplication}>Convert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {closing?.name}'s enquiry will be removed from the list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await closeEnquiry();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}