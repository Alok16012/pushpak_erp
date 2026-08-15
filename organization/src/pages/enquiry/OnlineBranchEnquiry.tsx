import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Building2, Clock, CheckCircle, Download } from "lucide-react";
import { useState } from "react";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export";
import {
  COURSE_OPTIONS,
  ONLINE_ENQUIRY_KEY,
  ONLINE_ENQUIRY_SEED,
  OnlineEnquiry,
  STAFF_OPTIONS,
  dayOffset,
  pushLead,
} from "@/data/enquiries";

const columns: Column<OnlineEnquiry>[] = [
  {
    key: "date",
    header: "Received",
    sortable: true,
    cell: (enquiry) => (
      <div>
        <p className="text-sm">{enquiry.date.split(" ")[0]}</p>
        <p className="text-xs text-muted-foreground">{enquiry.date.split(" ").slice(1).join(" ")}</p>
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch",
    cell: (enquiry) => <Badge variant="outline">{enquiry.branch}</Badge>,
  },
  {
    key: "name",
    header: "Enquirer",
    cell: (enquiry) => (
      <div>
        <p className="font-medium">{enquiry.name}</p>
        <p className="text-xs text-muted-foreground">{enquiry.email}</p>
      </div>
    ),
  },
  {
    key: "enquiryType",
    header: "Type",
    cell: (enquiry) => <Badge variant="secondary">{enquiry.enquiryType}</Badge>,
  },
  {
    key: "message",
    header: "Message",
    cell: (enquiry) => (
      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{enquiry.message}</p>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (enquiry) => <StatusBadge status={enquiry.status} />,
  },
];

export default function OnlineBranchEnquiry() {
  const { toast } = useToast();
  const { items: enquiries, update } = useLocalCollection<OnlineEnquiry>(
    ONLINE_ENQUIRY_KEY,
    ONLINE_ENQUIRY_SEED,
  );

  const [details, setDetails] = useState<OnlineEnquiry | null>(null);
  const [responding, setResponding] = useState<OnlineEnquiry | null>(null);
  const [response, setResponse] = useState("");
  const [converting, setConverting] = useState<OnlineEnquiry | null>(null);
  const [lead, setLead] = useState({ course: COURSE_OPTIONS[0], assignedTo: STAFF_OPTIONS[0] });
  const [closing, setClosing] = useState<OnlineEnquiry | null>(null);

  const markReviewed = (enquiry: OnlineEnquiry) => {
    if (enquiry.status !== "pending") {
      toast({ title: "Already reviewed", description: `This enquiry is ${enquiry.status}.` });
      return;
    }
    update(enquiry.id, { status: "reviewed" });
    toast({ title: "Marked as reviewed", description: enquiry.name });
  };

  const sendResponse = () => {
    if (!responding) return;
    if (!response.trim()) {
      toast({ title: "Write a response first", variant: "destructive" });
      return;
    }
    update(responding.id, { status: "responded", response: response.trim() });
    toast({ title: "Response sent", description: `Emailed to ${responding.email}.` });
    setResponding(null);
  };

  const convertToLead = () => {
    if (!converting) return;
    if (converting.convertedTo) {
      toast({ title: "Already converted", description: "A branch enquiry exists for this form submission." });
      return;
    }
    const row = pushLead({
      date: dayOffset(0),
      name: converting.name,
      phone: converting.phone,
      email: converting.email,
      course: lead.course,
      source: "Website",
      assignedTo: lead.assignedTo,
      followUpDate: dayOffset(2),
      status: "new",
      priority: converting.enquiryType === "Admission" ? "high" : "medium",
      notes: `From ${converting.branch} website (${converting.enquiryType}): ${converting.message}`,
    });
    if (!row) {
      toast({ title: "Could not create the lead", variant: "destructive" });
      return;
    }
    update(converting.id, { status: "closed", convertedTo: row.id });
    toast({
      title: "Converted to lead",
      description: `${converting.name} added to Branch Enquiries, assigned to ${lead.assignedTo}.`,
    });
    setConverting(null);
  };

  const exportAll = () => {
    downloadCsv(
      "online-branch-enquiries.csv",
      enquiries.map((enquiry) => ({
        Received: enquiry.date,
        Branch: enquiry.branch,
        Name: enquiry.name,
        Phone: enquiry.phone,
        Email: enquiry.email,
        Type: enquiry.enquiryType,
        Message: enquiry.message,
        IP: enquiry.ipAddress,
        Status: enquiry.status,
        Response: enquiry.response ?? "",
      })),
    );
    toast({ title: "Enquiries exported", description: `${enquiries.length} rows written to CSV.` });
  };

  const handleActions = (enquiry: OnlineEnquiry) => [
    { label: "View Full Message", onClick: () => setDetails(enquiry) },
    { label: "Mark as Reviewed", onClick: () => markReviewed(enquiry) },
    {
      label: "Send Response",
      onClick: () => {
        setResponse(enquiry.response ?? "");
        setResponding(enquiry);
      },
    },
    {
      label: "Convert to Lead",
      onClick: () => {
        setLead({ course: COURSE_OPTIONS[0], assignedTo: STAFF_OPTIONS[0] });
        setConverting(enquiry);
      },
    },
    { label: "Close", onClick: () => setClosing(enquiry), destructive: true },
  ];

  const branchCount = new Set(enquiries.map((enquiry) => enquiry.branch)).size;

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
          subtitle="This month"
          icon={Globe}
          trend={{ value: 20, isPositive: true }}
        />
        <StatsCard
          title="Pending Review"
          value={enquiries.filter(e => e.status === "pending").length}
          subtitle="Needs attention"
          icon={Clock}
        />
        <StatsCard
          title="Responded"
          value={enquiries.filter(e => e.status === "responded").length}
          subtitle="This week"
          icon={CheckCircle}
        />
        <StatsCard
          title="By Branch"
          value={branchCount}
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
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.phone} · {details?.email}</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Received", details.date],
                  ["Branch", details.branch],
                  ["Enquiry type", details.enquiryType],
                  ["Source IP", details.ipAddress],
                  ["Status", details.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="text-xs text-muted-foreground">Message</p>
                <p className="rounded-lg border p-3 text-sm">{details.message}</p>
              </div>
              {details.response && (
                <div>
                  <p className="text-xs text-muted-foreground">Response sent</p>
                  <p className="rounded-lg border bg-muted/40 p-3 text-sm">{details.response}</p>
                </div>
              )}
              {details.convertedTo && (
                <p className="text-sm text-muted-foreground">Converted to a branch enquiry lead.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!details) return;
                setResponse(details.response ?? "");
                setResponding(details);
                setDetails(null);
              }}
            >
              Send response
            </Button>
            <Button onClick={() => details && markReviewed(details)}>Mark as reviewed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!responding} onOpenChange={(open) => !open && setResponding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send response</DialogTitle>
            <DialogDescription>Replying to {responding?.name} at {responding?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              {responding?.message}
            </p>
            <div className="space-y-2">
              <Label>Your response</Label>
              <Textarea
                rows={5}
                placeholder="Thanks for reaching out — here are the details you asked for..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponding(null)}>Cancel</Button>
            <Button onClick={sendResponse}>Send response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!converting} onOpenChange={(open) => !open && setConverting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to lead</DialogTitle>
            <DialogDescription>
              Creates a branch enquiry for {converting?.name} on the follow-up desk.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Course interest</Label>
              <Select value={lead.course} onValueChange={(value) => setLead((c) => ({ ...c, course: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURSE_OPTIONS.map((course) => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={lead.assignedTo} onValueChange={(value) => setLead((c) => ({ ...c, assignedTo: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_OPTIONS.map((staff) => (
                    <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConverting(null)}>Cancel</Button>
            <Button onClick={convertToLead}>Create lead</Button>
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
              onClick={() => {
                if (!closing) return;
                update(closing.id, { status: "closed" });
                toast({ title: "Enquiry closed", description: closing.name });
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
