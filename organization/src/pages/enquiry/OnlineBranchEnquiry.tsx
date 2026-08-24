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
import { Globe, Building2, Clock, CheckCircle, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv } from "@/lib/export";
import { getEnquiries, updateEnquiry } from "@/lib/supabase/data";

interface OnlineEnquiry {
  id: string;
  visitorName: string;
  phone: string;
  email: string;
  enquiryReason: string;
  status: "NEW" | "CONTACTED" | "VISITED" | "ADMITTED" | "CLOSED";
  branchId: string;
  visitDate: string;
}

const COURSE_OPTIONS = [
  "Computer Science",
  "Commerce",
  "Engineering",
  "Medical",
  "Arts",
  "Science",
];

const STAFF_OPTIONS = ["John Doe", "Jane Smith", "Mike Johnson"];

const columns: Column<OnlineEnquiry>[] = [
  {
    key: "visitDate",
    header: "Received",
    sortable: true,
    cell: (enquiry) => (
      <span className="text-sm">
        {new Date(enquiry.visitDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
  {
    key: "branch",
    header: "Branch",
    cell: (enquiry) => <Badge variant="outline">{enquiry.branch}</Badge>,
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
      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{enquiry.enquiryReason || enquiry.enquiryReason || "—"}</p>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (enquiry) => <StatusBadge status={enquiry.status.toLowerCase() as "pending" | "reviewed" | "responded" | "closed"} />,
  },
];

export default function OnlineBranchEnquiry() {
  const { toast } = useToast();
  const { user } = useAuth();
  const branchId = user?.branchId || "";
  const [enquiries, setEnquiries] = useState<OnlineEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<OnlineEnquiry | null>(null);
  const [responding, setResponding] = useState<OnlineEnquiry | null>(null);
  const [response, setResponse] = useState("");
  const [converting, setConverting] = useState<OnlineEnquiry | null>(null);
  const [lead, setLead] = useState({ course: COURSE_OPTIONS[0], assignedTo: STAFF_OPTIONS[0] });
  const [closing, setClosing] = useState<OnlineEnquiry | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadEnquiries() {
      try {
        const result = await getEnquiries(branchId);
        if (!cancelled) {
          setEnquiries(result.data as unknown as OnlineEnquiry[]);
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
      const result = await getEnquiries(branchId);
      setEnquiries(result.data as unknown as OnlineEnquiry[]);
    } catch {
      // silent
    }
  };

  const markReviewed = async (enquiry: OnlineEnquiry) => {
    if (enquiry.status !== "NEW") {
      toast({ title: "Already reviewed", description: `This enquiry is ${enquiry.status}.` });
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

  const sendResponse = async () => {
    if (!responding) return;
    if (!response.trim()) {
      toast({ title: "Write a response first", variant: "destructive" });
      return;
    }
    try {
      await updateEnquiry(responding.id, branchId, { status: "CONTACTED", response: response.trim() });
      await refreshEnquiries();
      toast({ title: "Response sent", description: `Emailed to ${responding.email}.` });
      setResponding(null);
    } catch {
      toast({ title: "Failed to send response", variant: "destructive" });
    }
  };

  const convertToLead = async () => {
    if (!converting) return;
    try {
      const notes = converting.enquiryReason ? `Enquiry reason: ${converting.enquiryReason}` : "";
      await updateEnquiry(converting.id, branchId, {
        status: "CONTACTED",
        enquiryReason: converting.enquiryReason ? `[Converted] ${converting.enquiryReason}` : converting.enquiryReason,
      });
      await refreshEnquiries();
      toast({
        title: "Marked for follow-up",
        description: `${converting.visitorName} has been flagged for conversion.`,
      });
      setConverting(null);
    } catch {
      toast({ title: "Failed to update enquiry", variant: "destructive" });
    }
  };

  const exportAll = () => {
    downloadCsv(
      "online-branch-enquiries.csv",
      enquiries.map((enquiry) => ({
        Visitor: enquiry.visitorName,
        Phone: enquiry.phone,
        Email: enquiry.email,
        Reason: enquiry.enquiryReason,
        BranchId: enquiry.branchId,
        VisitDate: enquiry.visitDate,
        Status: enquiry.status,
      })),
    );
    toast({ title: "Enquiries exported", description: `${enquiries.length} rows written to CSV.` });
  };

  const handleActions = (enquiry: OnlineEnquiry) => [
    { label: "View Details", onClick: () => setDetails(enquiry) },
    { label: "Mark as Contacted", onClick: () => markReviewed(enquiry) },
    {
      label: "Send Response",
      onClick: () => {
        setResponse(enquiry.enquiryReason ?? "");
        setResponding(enquiry);
      },
    },
    {
      label: "Flag for Lead",
      onClick: () => {
        setConverting(enquiry);
      },
    },
    { label: "Close", onClick: () => setClosing(enquiry), destructive: true },
  ];

  const branchCount = new Set(enquiries.map((enquiry) => enquiry.branchId)).size;

  return (
    <AppLayout>
      <PageHeader
        title="Online Branch Enquiries"
        description="Manage enquiries received from branch websites"
        breadcrumbs={[
          { label: "Enquiry Management", href: "/enquiry/branch" },
          { label: "Online Branch Enquiry" },
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
          title="Total Online Enquiries"
          value={enquiries.length}
          subtitle="All records"
          icon={Globe}
          trend={{ value: 20, isPositive: true }}
        />
        <StatsCard
          title="New Enquiries"
          value={enquiries.filter(e => e.status === "NEW").length}
          subtitle="Needs attention"
          icon={Clock}
        />
        <StatsCard
          title="Contacted"
          value={enquiries.filter(e => e.status === "CONTACTED").length}
          subtitle="In progress"
          icon={CheckCircle}
        />
        <StatsCard
          title="By Branch"
          value={new Set(enquiries.map((enquiry) => enquiry.branchId)).size}
          subtitle="Branches with enquiries"
          icon={Building2}
        />
      </div>

      <DataTable
        data={enquiries}
        columns={columns}
        searchPlaceholder="Search online enquiries..."
        actions={handleActions}
        emptyMessage="No online enquiries received"
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.visitorName}</DialogTitle>
            <DialogDescription>{details?.phone} · {details?.email}</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Visit date", details.visitDate],
                  ["Branch", details.branchId],
                  ["Status", details.status],
                  ["Reason", details.enquiryReason],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
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
            <DialogDescription>Update status or notes for {responding?.visitorName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              {responding?.enquiryReason || "No details provided."}
            </p>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={4}
                placeholder="Add follow-up notes..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponding(null)}>Cancel</Button>
            <Button onClick={sendResponse}>Save update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!converting} onOpenChange={(open) => !open && setConverting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag for lead</DialogTitle>
            <DialogDescription>
              Mark {converting?.visitorName}'s enquiry for follow-up conversion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConverting(null)}>Cancel</Button>
            <Button onClick={convertToLead}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {closing?.name}'s submission will be marked closed and drop out of the pending queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!closing) return;
                try {
                  await updateEnquiry(closing.id, branchId, { status: "CLOSED" });
                  await refreshEnquiries();
                  toast({ title: "Enquiry closed", description: closing.name });
                } catch {
                  toast({ title: "Failed to close enquiry", variant: "destructive" });
                }
                setClosing(null);
              }}
            >
              Close enquiry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}