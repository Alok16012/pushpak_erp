import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Clock, Phone, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv } from "@/lib/export";
import { getEnquiries, updateEnquiry } from "@/lib/supabase/data";

interface StudentEnquiry {
  id: string;
  visitorName: string;
  phone: string;
  email: string;
  enquiryReason: string;
  status: "NEW" | "CONTACTED" | "VISITED" | "ADMITTED" | "CLOSED";
  branchId: string;
  visitDate: string;
  visitTime?: string;
  purpose?: string;
  personToMeet?: string;
}

const columns: Column<StudentEnquiry>[] = [
  {
    key: "visitDate",
    header: "Visit Date",
    sortable: true,
    cell: (enquiry) => (
      <span className="text-sm">
        {new Date(enquiry.visitDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
  {
    key: "visitorName",
    header: "Visitor",
    cell: (enquiry) => (
      <div>
        <p className="font-medium">{enquiry.visitorName}</p>
        <p className="text-xs text-muted-foreground">{enquiry.phone}</p>
      </div>
    ),
  },
  {
    key: "enquiryReason",
    header: "Reason",
    cell: (enquiry) => (
      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{enquiry.enquiryReason || "—"}</p>
    ),
  },
  {
    key: "purpose",
    header: "Purpose",
    cell: (enquiry) => <Badge variant="secondary">{enquiry.purpose || "General"}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    cell: (enquiry) => <StatusBadge status={enquiry.status.toLowerCase() as any} />,
  },
];

const statusLabel = (status: StudentEnquiry["status"]) =>
  status === "NEW" ? "New"
  : status === "CONTACTED" ? "Contacted"
  : status === "VISITED" ? "Visited"
  : status === "ADMITTED" ? "Admitted"
  : "Closed";

export default function OnlineStudentEnquiry() {
  const { toast } = useToast();
  const { user } = useAuth();
  const branchId = user?.branchId || "";
  const [enquiries, setEnquiries] = useState<StudentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<StudentEnquiry | null>(null);
  const [responding, setResponding] = useState<StudentEnquiry | null>(null);
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState<StudentEnquiry | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadEnquiries() {
      try {
        const result = await getEnquiries(branchId);
        if (!cancelled) {
          setEnquiries(result.data as unknown as StudentEnquiry[]);
        }
      } catch {
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
  }, [branchId, toast]);

  const refreshEnquiries = async () => {
    try {
      const result = await getEnquiries(branchId);
      setEnquiries(result.data as unknown as StudentEnquiry[]);
    } catch {
      // silent
    }
  };

  const markContacted = async (enquiry: StudentEnquiry) => {
    if (enquiry.status !== "NEW") {
      toast({ title: "Already updated", description: `Status: ${statusLabel(enquiry.status)}.` });
      return;
    }
    try {
      await updateEnquiry(enquiry.id, branchId, { status: "CONTACTED" });
      await refreshEnquiries();
      toast({ title: "Marked as contacted", description: enquiry.visitorName });
    } catch {
      toast({ title: "Failed to update enquiry", variant: "destructive" });
    }
  };

  const saveNotes = async () => {
    if (!responding) return;
    if (!notes.trim()) {
      toast({ title: "Add a note first", variant: "destructive" });
      return;
    }
    try {
      await updateEnquiry(responding.id, branchId, {
        status: "CONTACTED",
        enquiryReason: notes.trim(),
      });
      await refreshEnquiries();
      toast({ title: "Notes saved", description: `Follow-up updated for ${responding.visitorName}.` });
      setResponding(null);
      setNotes("");
    } catch {
      toast({ title: "Failed to save notes", variant: "destructive" });
    }
  };

  const closeEnquiry = async () => {
    if (!closing) return;
    try {
      await updateEnquiry(closing.id, branchId, { status: "CLOSED" });
      await refreshEnquiries();
      toast({ title: "Enquiry closed", description: closing.visitorName });
    } catch {
      toast({ title: "Failed to close enquiry", variant: "destructive" });
    }
    setClosing(null);
  };

  const exportAll = () => {
    downloadCsv(
      "online-student-enquiries.csv",
      enquiries.map((enquiry) => ({
        Visitor: enquiry.visitorName,
        Phone: enquiry.phone,
        Email: enquiry.email,
        Reason: enquiry.enquiryReason,
        BranchId: enquiry.branchId,
        VisitDate: enquiry.visitDate,
        VisitTime: enquiry.visitTime ?? "",
        Purpose: enquiry.purpose ?? "",
        PersonToMeet: enquiry.personToMeet ?? "",
        Status: enquiry.status,
      })),
    );
    toast({ title: "Enquiries exported", description: `${enquiries.length} rows written to CSV.` });
  };

  const handleActions = (enquiry: StudentEnquiry) => [
    { label: "View Details", onClick: () => setDetails(enquiry) },
    { label: "Mark Contacted", onClick: () => markContacted(enquiry) },
    {
      label: "Add Notes",
      onClick: () => {
        setNotes(enquiry.enquiryReason ?? "");
        setResponding(enquiry);
      },
    },
    { label: "Close", onClick: () => setClosing(enquiry), destructive: true },
  ];

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
          subtitle="All records"
          icon={GraduationCap}
          trend={{ value: 18, isPositive: true }}
        />
        <StatsCard
          title="New"
          value={enquiries.filter(e => e.status === "NEW").length}
          subtitle="Needs attention"
          icon={Clock}
        />
        <StatsCard
          title="Contacted"
          value={enquiries.filter(e => e.status === "CONTACTED").length}
          subtitle="In progress"
          icon={Phone}
        />
        <StatsCard
          title="Converted"
          value={enquiries.filter(e => e.status === "ADMITTED").length}
          subtitle="Admitted students"
          icon={GraduationCap}
        />
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
            <DialogTitle>{details?.visitorName}</DialogTitle>
            <DialogDescription>{details?.phone} · {details?.email}</DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Visit date", details.visitDate],
                ["Visit time", details.visitTime ?? "—"],
                ["Purpose", details.purpose ?? "General"],
                ["Person to meet", details.personToMeet ?? "—"],
                ["Branch", details.branchId],
                ["Status", statusLabel(details.status)],
                ["Reason", details.enquiryReason],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs text-muted-foreground">{String(label)}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!responding} onOpenChange={(open) => !open && setResponding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update enquiry</DialogTitle>
            <DialogDescription>Follow-up notes for {responding?.visitorName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={4}
              placeholder="Add follow-up notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponding(null)}>Cancel</Button>
            <Button onClick={saveNotes}>Save notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {closing?.visitorName}'s enquiry will be marked closed and removed from the active queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={closeEnquiry}
            >
              Close enquiry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
