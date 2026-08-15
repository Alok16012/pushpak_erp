import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export";

interface OnlineAdmission {
  id: string;
  applicationNo: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  batch: string;
  documents: string[];
  paymentStatus: "paid" | "pending" | "failed";
  status: "pending" | "approved" | "rejected" | "under_review";
  /** Set by "Request Documents" / "Reject" so the decision trail survives a reload. */
  requestedDocuments?: string[];
  decisionNote?: string;
}

const REQUIRED_DOCUMENTS = [
  "Photo",
  "10th Marksheet",
  "12th Marksheet",
  "Aadhar",
  "Transfer Certificate",
  "Caste Certificate",
];

const admissionsData: OnlineAdmission[] = [
  { id: "1", applicationNo: "APP2024001", date: "2024-01-15", name: "Rahul Verma", email: "rahul@example.com", phone: "+91 98765 43210", course: "Computer Science", batch: "CS-2024-A", documents: ["Photo", "10th Marksheet", "12th Marksheet", "Aadhar"], paymentStatus: "paid", status: "pending" },
  { id: "2", applicationNo: "APP2024002", date: "2024-01-14", name: "Priya Singh", email: "priya@example.com", phone: "+91 87654 32109", course: "Commerce", batch: "COM-2024-A", documents: ["Photo", "10th Marksheet", "12th Marksheet"], paymentStatus: "paid", status: "under_review" },
  { id: "3", applicationNo: "APP2024003", date: "2024-01-14", name: "Amit Kumar", email: "amit@example.com", phone: "+91 76543 21098", course: "Engineering", batch: "ENG-2024-A", documents: ["Photo", "10th Marksheet", "12th Marksheet", "Aadhar", "Transfer Certificate"], paymentStatus: "paid", status: "approved" },
  { id: "4", applicationNo: "APP2024004", date: "2024-01-13", name: "Sneha Gupta", email: "sneha@example.com", phone: "+91 65432 10987", course: "Science", batch: "SCI-2024-A", documents: ["Photo", "10th Marksheet"], paymentStatus: "pending", status: "pending" },
  { id: "5", applicationNo: "APP2024005", date: "2024-01-12", name: "Vikram Rao", email: "vikram@example.com", phone: "+91 54321 09876", course: "Arts", batch: "ART-2024-A", documents: ["Photo", "10th Marksheet", "12th Marksheet", "Aadhar"], paymentStatus: "failed", status: "rejected" },
];

const columns: Column<OnlineAdmission>[] = [
  {
    key: "applicationNo",
    header: "Application",
    sortable: true,
    cell: (admission) => (
      <div>
        <p className="font-medium">{admission.applicationNo}</p>
        <p className="text-xs text-muted-foreground">{admission.date}</p>
      </div>
    ),
  },
  {
    key: "name",
    header: "Applicant",
    cell: (admission) => (
      <div>
        <p className="font-medium">{admission.name}</p>
        <p className="text-xs text-muted-foreground">{admission.email}</p>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    cell: (admission) => (
      <div>
        <Badge variant="outline">{admission.course}</Badge>
        <p className="text-xs text-muted-foreground mt-1">{admission.batch}</p>
      </div>
    ),
  },
  {
    key: "documents",
    header: "Documents",
    cell: (admission) => (
      <div className="flex items-center gap-1">
        <Badge variant="secondary">{admission.documents.length} uploaded</Badge>
      </div>
    ),
  },
  {
    key: "paymentStatus",
    header: "Payment",
    cell: (admission) => (
      <Badge variant={admission.paymentStatus === "paid" ? "default" : admission.paymentStatus === "pending" ? "secondary" : "destructive"}>
        {admission.paymentStatus}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (admission) => <StatusBadge status={admission.status} />,
  },
];

export default function OnlineAdmissionList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: admissions, update } = useLocalCollection<OnlineAdmission>(
    "erp-online-admissions",
    admissionsData,
  );

  const [details, setDetails] = useState<OnlineAdmission | null>(null);
  const [requesting, setRequesting] = useState<OnlineAdmission | null>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState<OnlineAdmission | null>(null);
  const [reason, setReason] = useState("");

  const approve = (admission: OnlineAdmission) => {
    if (admission.status === "approved") {
      toast({ title: "Already approved", description: admission.applicationNo });
      return;
    }
    if (admission.paymentStatus !== "paid") {
      toast({
        title: "Payment not settled",
        description: `${admission.applicationNo} shows payment ${admission.paymentStatus}. Collect the fee first.`,
        variant: "destructive",
      });
      return;
    }
    update(admission.id, { status: "approved", decisionNote: "" });
    toast({ title: "Application approved", description: `${admission.name} · ${admission.course}` });
  };

  const openRequest = (admission: OnlineAdmission) => {
    setRequesting(admission);
    // Pre-tick whatever the applicant has not uploaded yet.
    setRequested(REQUIRED_DOCUMENTS.filter((doc) => !admission.documents.includes(doc)));
  };

  const sendRequest = () => {
    if (!requesting) return;
    if (!requested.length) {
      toast({ title: "Pick at least one document to request", variant: "destructive" });
      return;
    }
    update(requesting.id, { status: "under_review", requestedDocuments: requested });
    toast({
      title: "Documents requested",
      description: `${requested.length} document(s) requested from ${requesting.name}.`,
    });
    setRequesting(null);
  };

  const confirmReject = () => {
    if (!rejecting) return;
    if (!reason.trim()) {
      toast({ title: "Add a rejection reason", variant: "destructive" });
      return;
    }
    update(rejecting.id, { status: "rejected", decisionNote: reason.trim() });
    toast({ title: "Application rejected", description: rejecting.applicationNo });
    setRejecting(null);
    setReason("");
  };

  const exportData = () => {
    downloadCsv(
      "online-admissions.csv",
      admissions.map((admission) => ({
        Application: admission.applicationNo,
        Date: admission.date,
        Name: admission.name,
        Email: admission.email,
        Phone: admission.phone,
        Course: admission.course,
        Batch: admission.batch,
        Documents: admission.documents.join(" | "),
        Payment: admission.paymentStatus,
        Status: admission.status,
      })),
    );
    toast({ title: "Applications exported", description: `${admissions.length} rows written to CSV.` });
  };

  const handleActions = (admission: OnlineAdmission) => [
    { label: "View Application", onClick: () => setDetails(admission) },
    { label: "Approve", onClick: () => approve(admission) },
    { label: "Request Documents", onClick: () => openRequest(admission) },
    {
      label: "Reject",
      onClick: () => {
        setRejecting(admission);
        setReason("");
      },
      destructive: true,
    },
  ];

  const statusCounts = {
    pending: admissions.filter(a => a.status === "pending").length,
    under_review: admissions.filter(a => a.status === "under_review").length,
    approved: admissions.filter(a => a.status === "approved").length,
    rejected: admissions.filter(a => a.status === "rejected").length,
  };

  return (
    <AppLayout>
      <PageHeader
        title="Online Admission List"
        description="Manage online admission applications"
        breadcrumbs={[
          { label: "Student Management", href: "/student/view" },
          { label: "Online Admission List" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={exportData}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Applications"
          value={admissions.length}
          subtitle="This session"
          icon={GraduationCap}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending Review"
          value={statusCounts.pending + statusCounts.under_review}
          subtitle="Needs attention"
          icon={Clock}
        />
        <StatsCard
          title="Approved"
          value={statusCounts.approved}
          subtitle="Ready for enrollment"
          icon={CheckCircle}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Rejected"
          value={statusCounts.rejected}
          subtitle="This session"
          icon={XCircle}
        />
      </div>

      <DataTable
        data={admissions}
        columns={columns}
        searchPlaceholder="Search applications..."
        actions={handleActions}
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.applicationNo} · applied {details?.date}</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  ["Email", details.email],
                  ["Phone", details.phone],
                  ["Course", details.course],
                  ["Batch", details.batch],
                  ["Payment", details.paymentStatus],
                  ["Status", details.status.replace("_", " ")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Documents uploaded</p>
                <div className="flex flex-wrap gap-1">
                  {details.documents.map((doc) => (
                    <Badge key={doc} variant="secondary">{doc}</Badge>
                  ))}
                </div>
              </div>
              {details.requestedDocuments?.length ? (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Requested from applicant</p>
                  <div className="flex flex-wrap gap-1">
                    {details.requestedDocuments.map((doc) => (
                      <Badge key={doc} variant="outline">{doc}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {details.decisionNote && (
                <div>
                  <p className="text-xs text-muted-foreground">Rejection reason</p>
                  <p>{details.decisionNote}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate("/student/add")}>Open admission form</Button>
            <Button
              onClick={() => {
                if (details) approve(details);
                setDetails(null);
              }}
              disabled={details?.status === "approved"}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requesting} onOpenChange={(open) => !open && setRequesting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request documents</DialogTitle>
            <DialogDescription>
              {requesting?.name} · {requesting?.applicationNo}. Missing documents are pre-selected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {REQUIRED_DOCUMENTS.map((doc) => {
              const uploaded = requesting?.documents.includes(doc);
              return (
                <label key={doc} htmlFor={`doc-${doc}`} className="flex cursor-pointer items-center gap-3 text-sm">
                  <Checkbox
                    id={`doc-${doc}`}
                    checked={requested.includes(doc)}
                    onCheckedChange={() =>
                      setRequested((prev) =>
                        prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc],
                      )
                    }
                  />
                  <span>{doc}</span>
                  {uploaded && <Badge variant="secondary" className="text-xs">already uploaded</Badge>}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequesting(null)}>Cancel</Button>
            <Button onClick={sendRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejecting}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting?.applicationNo}?</DialogTitle>
            <DialogDescription>The reason is stored against the application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason *</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              placeholder="e.g., Marksheet does not meet the minimum percentage."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Reject application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
