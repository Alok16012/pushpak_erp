import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, UserPlus, Clock, CheckCircle, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Enquiry {
  id: string;
  visitorName: string;
  phone: string;
  email?: string;
  purpose: string;
  personToMeet: string;
  department: string;
  enquiryReason?: string;
  remarks?: string;
  followUpDate?: string;
  followUpNotes?: string;
  status: "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";
  visitDate: string;
  visitTime: string;
  createdAt: string;
}

const BLANK = {
  visitorName: "",
  phone: "",
  email: "",
  purpose: "OTHER" as Enquiry["purpose"],
  personToMeet: "",
  department: "ADMINISTRATION" as Enquiry["department"],
  enquiryReason: "",
  remarks: "",
  followUpDate: "",
};

export default function BranchEnquiry() {
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [details, setDetails] = useState<Enquiry | null>(null);
  const [followingUp, setFollowingUp] = useState<Enquiry | null>(null);
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpNext, setFollowUpNext] = useState("");
  const [closing, setClosing] = useState<Enquiry | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api<{ data: Enquiry[] }>("/core/enquiries");
      setEnquiries(res.data);
    } catch {
      toast({ title: "Failed to load enquiries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const saveEnquiry = async () => {
    if (!form.visitorName.trim() || !form.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    if (!form.personToMeet.trim()) {
      toast({ title: "Person to meet is required", variant: "destructive" });
      return;
    }
    try {
      const data = await api<{ data: Enquiry }>("/core/enquiries", {
        method: "POST",
        body: JSON.stringify({
          visitorName: form.visitorName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          purpose: form.purpose,
          personToMeet: form.personToMeet.trim(),
          department: form.department,
          enquiryReason: form.enquiryReason.trim() || undefined,
          remarks: form.remarks.trim() || undefined,
        }),
      });
      setEnquiries((list) => [data.data, ...list]);
      toast({ title: "Enquiry logged", description: `${form.visitorName.trim()} recorded.` });
      setForm(BLANK);
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: "Failed to save enquiry", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const saveFollowUp = async () => {
    if (!followingUp || !followUpNote.trim()) return;
    try {
      const nextDate = followUpNext || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      await api<{ data: Enquiry }>(`/core/enquiries/${followingUp.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          followUpDate: nextDate,
          followUpNote: followUpNote.trim(),
        }),
      });
      setEnquiries((list) =>
        list.map((e) =>
          e.id === followingUp.id
            ? { ...e, followUpDate: nextDate, followUpNotes: followUpNote.trim() }
            : e,
        ),
      );
      toast({ title: "Follow-up recorded", description: `Next follow-up on ${nextDate}.` });
      setFollowingUp(null);
      setFollowUpNote("");
      setFollowUpNext("");
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const convert = async (enquiry: Enquiry) => {
    if (enquiry.status === "CONVERTED") {
      toast({ title: "Already converted", description: `${enquiry.visitorName} is marked as admitted.` });
      return;
    }
    try {
      const data = await api<{ data: Enquiry }>(`/core/enquiries/${enquiry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CONVERTED" }),
      });
      setEnquiries((list) => list.map((e) => (e.id === enquiry.id ? data.data : e)));
      toast({ title: "Converted to admission", description: `${enquiry.visitorName} — continue at Student Management.` });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const closeEnquiry = async (enquiry: Enquiry) => {
    try {
      const data = await api<{ data: Enquiry }>(`/core/enquiries/${enquiry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED", closeNote: "Closed by staff" }),
      });
      setEnquiries((list) => list.map((e) => (e.id === enquiry.id ? data.data : e)));
      toast({ title: "Enquiry closed", description: enquiry.visitorName });
      setClosing(null);
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleActions = (enquiry: Enquiry) => [
    { label: "View Details", onClick: () => setDetails(enquiry) },
    {
      label: "Add Follow-up",
      onClick: () => {
        setFollowUpNote("");
        setFollowUpNext(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
        setFollowingUp(enquiry);
      },
    },
    { label: "Convert to Admission", onClick: () => convert(enquiry) },
    { label: "Mark as Closed", onClick: () => setClosing(enquiry), destructive: true },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const dueCount = enquiries.filter(
    (e) => e.followUpDate && e.followUpDate <= today && e.status !== "CONVERTED" && e.status !== "CLOSED",
  ).length;

  const columns: Column<Enquiry>[] = [
    {
      key: "visitDate",
      header: "Date",
      cell: (item) => new Date(item.visitDate).toLocaleDateString("en-IN"),
    },
    {
      key: "visitorName",
      header: "Enquirer",
      cell: (item) => (
        <div>
          <p className="font-medium">{item.visitorName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {item.phone}
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      cell: (item) => <Badge variant="outline">{item.purpose}</Badge>,
    },
    {
      key: "personToMeet",
      header: "Person to Meet",
    },
    {
      key: "department",
      header: "Department",
      cell: (item) => <Badge variant="secondary">{item.department}</Badge>,
    },
    {
      key: "followUpDate",
      header: "Follow-up",
      cell: (item) => (
        <span className={item.followUpDate && item.followUpDate < today ? "text-destructive" : ""}>
          {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => (
        <Badge
          variant={
            item.status === "CONVERTED" ? "default" :
            item.status === "CLOSED" ? "secondary" :
            item.status === "CONTACTED" ? "outline" : "destructive"
          }
        >
          {item.status.toLowerCase()}
        </Badge>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Branch Enquiries"
        description="Manage all walk-in and phone enquiries"
        breadcrumbs={[
          { label: "Enquiry Management", href: "/enquiry/branch" },
          { label: "Branch Enquiry" },
        ]}
        actions={
          <Button className="gap-2" onClick={() => { setForm(BLANK); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Enquiry
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Total Enquiries"
          value={enquiries.length}
          subtitle="All time"
          icon={MessageSquare}
        />
        <StatsCard
          title="New Enquiries"
          value={enquiries.filter((e) => e.status === "NEW").length}
          subtitle="Pending contact"
          icon={UserPlus}
        />
        <StatsCard
          title="Follow-ups Due"
          value={dueCount}
          subtitle="Today or overdue"
          icon={Clock}
        />
        <StatsCard
          title="Converted"
          value={enquiries.filter((e) => e.status === "CONVERTED").length}
          subtitle="Admitted"
          icon={CheckCircle}
        />
      </div>

      <DataTable
        data={enquiries}
        columns={columns}
        searchPlaceholder="Search enquiries..."
        actions={handleActions}
        emptyMessage={loading ? "Loading enquiries..." : "No enquiries logged yet"}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Enquiry</DialogTitle>
            <DialogDescription>Log a walk-in or phone enquiry and assign it for follow-up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Visitor Name *</Label>
                <Input placeholder="Enter full name" value={form.visitorName} onChange={(e) => set("visitorName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Person to Meet *</Label>
                <Input placeholder="e.g. Admission Counsellor" value={form.personToMeet} onChange={(e) => set("personToMeet", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select value={form.purpose} onValueChange={(value) => set("purpose", value as Enquiry["purpose"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMISSION">Admission</SelectItem>
                    <SelectItem value="FEE">Fee</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="COMPLAINT">Complaint</SelectItem>
                    <SelectItem value="DELIVERY">Delivery</SelectItem>
                    <SelectItem value="INTERVIEW">Interview</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(value) => set("department", value as Enquiry["department"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMINISTRATION">Administration</SelectItem>
                    <SelectItem value="ACADEMICS">Academics</SelectItem>
                    <SelectItem value="ACCOUNTS">Accounts</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="LIBRARY">Library</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Enquiry Reason</Label>
              <Textarea placeholder="Why did they visit?..." rows={3} value={form.enquiryReason} onChange={(e) => set("enquiryReason", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea placeholder="Additional notes..." rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveEnquiry}>Save Enquiry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.visitorName}</DialogTitle>
            <DialogDescription>{details?.phone} · {details?.email || "no email on file"}</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Visit date", new Date(details.visitDate).toLocaleDateString("en-IN")],
                  ["Purpose", details.purpose},
                  ["Person to Meet", details.personToMeet],
                  ["Department", details.department},
                  ["Next follow-up", details.followUpDate ? new Date(details.followUpDate).toLocaleDateString("en-IN") : "—"],
                  ["Status", details.status.toLowerCase()],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
              {details.enquiryReason && (
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm">{details.enquiryReason}</p>
                </div>
              )}
              {details.remarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{details.remarks}</p>
                </div>
              )}
              {details.followUpNotes && (
                <div>
                  <p className="text-xs text-muted-foreground">Last Follow-up</p>
                  <p className="text-sm">{details.followUpNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!details) return;
                setFollowUpNote("");
                setFollowUpNext(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
                setFollowingUp(details);
                setDetails(null);
              }}
            >
              Add follow-up
            </Button>
            <Button onClick={() => details && convert(details)}>Convert to admission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!followingUp} onOpenChange={(open) => !open && setFollowingUp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add follow-up</DialogTitle>
            <DialogDescription>{followingUp?.visitorName} · {followingUp?.phone}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What happened?</Label>
              <Textarea
                rows={3}
                placeholder="Called and explained the courses..."
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Next follow-up date</Label>
                <Input type="date" value={followUpNext} onChange={(e) => setFollowUpNext(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowingUp(null)}>Cancel</Button>
            <Button onClick={saveFollowUp}>Save follow-up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {closing?.visitorName} will stop appearing in the follow-up queue. The record stays in the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction onClick={() => closing && closeEnquiry(closing)}>
              Close enquiry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
