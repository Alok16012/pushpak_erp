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
import { useState } from "react";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import {
  COURSE_OPTIONS,
  ENQUIRY_KEY,
  ENQUIRY_SEED,
  Enquiry,
  SOURCE_OPTIONS,
  STAFF_OPTIONS,
  dayOffset,
} from "@/data/enquiries";

const columns: Column<Enquiry>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
  },
  {
    key: "name",
    header: "Enquirer",
    cell: (enquiry) => (
      <div>
        <p className="font-medium">{enquiry.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          {enquiry.phone}
        </div>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course Interest",
    cell: (enquiry) => <Badge variant="outline">{enquiry.course}</Badge>,
  },
  {
    key: "source",
    header: "Source",
    cell: (enquiry) => <Badge variant="secondary">{enquiry.source}</Badge>,
  },
  {
    key: "assignedTo",
    header: "Assigned To",
  },
  {
    key: "followUpDate",
    header: "Follow-up",
    sortable: true,
    cell: (enquiry) => (
      <span className={new Date(enquiry.followUpDate) < new Date() ? "text-destructive" : ""}>
        {enquiry.followUpDate}
      </span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    cell: (enquiry) => (
      <Badge variant={enquiry.priority === "high" ? "destructive" : enquiry.priority === "medium" ? "default" : "secondary"}>
        {enquiry.priority}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (enquiry) => <StatusBadge status={enquiry.status} />,
  },
];

const BLANK = {
  name: "",
  phone: "",
  email: "",
  course: "",
  source: "Walk-in",
  assignedTo: STAFF_OPTIONS[0],
  priority: "medium" as Enquiry["priority"],
  followUpDate: dayOffset(2),
  notes: "",
};

export default function BranchEnquiry() {
  const { toast } = useToast();
  const { items: enquiries, add, update } = useLocalCollection<Enquiry>(ENQUIRY_KEY, ENQUIRY_SEED);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [details, setDetails] = useState<Enquiry | null>(null);
  const [followingUp, setFollowingUp] = useState<Enquiry | null>(null);
  const [followUp, setFollowUp] = useState({ note: "", next: dayOffset(3), by: STAFF_OPTIONS[0] });
  const [closing, setClosing] = useState<Enquiry | null>(null);

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const saveEnquiry = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    if (!form.course) {
      toast({ title: "Pick a course of interest", variant: "destructive" });
      return;
    }
    add({
      date: dayOffset(0),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      course: form.course,
      source: form.source,
      assignedTo: form.assignedTo,
      followUpDate: form.followUpDate,
      status: "new",
      priority: form.priority,
      notes: form.notes.trim() || undefined,
    });
    toast({ title: "Enquiry logged", description: `${form.name.trim()} assigned to ${form.assignedTo}.` });
    setForm(BLANK);
    setIsDialogOpen(false);
  };

  const saveFollowUp = () => {
    if (!followingUp) return;
    if (!followUp.note.trim()) {
      toast({ title: "Add a note describing the follow-up", variant: "destructive" });
      return;
    }
    update(followingUp.id, {
      followUps: [
        ...(followingUp.followUps ?? []),
        { date: dayOffset(0), by: followUp.by, note: followUp.note.trim() },
      ],
      followUpDate: followUp.next,
      // Logging a call is what moves a brand-new lead out of the "new" bucket.
      status: followingUp.status === "new" ? "contacted" : followingUp.status,
    });
    toast({ title: "Follow-up recorded", description: `Next follow-up on ${followUp.next}.` });
    setFollowingUp(null);
  };

  const convert = (enquiry: Enquiry) => {
    if (enquiry.status === "converted") {
      toast({ title: "Already converted", description: `${enquiry.name} is marked as admitted.` });
      return;
    }
    update(enquiry.id, { status: "converted" });
    toast({
      title: "Converted to admission",
      description: `${enquiry.name} — continue at Student Management › Add Student.`,
    });
  };

  const handleActions = (enquiry: Enquiry) => [
    { label: "View Details", onClick: () => setDetails(enquiry) },
    {
      label: "Add Follow-up",
      onClick: () => {
        setFollowUp({ note: "", next: dayOffset(3), by: enquiry.assignedTo });
        setFollowingUp(enquiry);
      },
    },
    { label: "Convert to Admission", onClick: () => convert(enquiry) },
    { label: "Mark as Closed", onClick: () => setClosing(enquiry), destructive: true },
  ];

  const today = dayOffset(0);
  const dueCount = enquiries.filter(
    (e) => e.followUpDate <= today && e.status !== "converted" && e.status !== "closed",
  ).length;

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
          subtitle="This month"
          icon={MessageSquare}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="New Enquiries"
          value={enquiries.filter(e => e.status === "new").length}
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
          value={enquiries.filter(e => e.status === "converted").length}
          subtitle="This month"
          icon={CheckCircle}
          trend={{ value: 25, isPositive: true }}
        />
      </div>

      <DataTable
        data={enquiries}
        columns={columns}
        searchPlaceholder="Search enquiries..."
        actions={handleActions}
        emptyMessage="No enquiries logged yet"
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
                <Label>Full Name *</Label>
                <Input placeholder="Enter full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
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
                <Label>Course Interest *</Label>
                <Select value={form.course} onValueChange={(value) => set("course", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_OPTIONS.map((course) => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(value) => set("source", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={form.assignedTo} onValueChange={(value) => set("assignedTo", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_OPTIONS.map((staff) => (
                      <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value) => set("priority", value as Enquiry["priority"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Add any additional notes..." rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
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
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.phone} · {details?.email || "no email on file"}</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Enquiry date", details.date],
                  ["Course interest", details.course],
                  ["Source", details.source],
                  ["Assigned to", details.assignedTo],
                  ["Next follow-up", details.followUpDate],
                  ["Priority", details.priority],
                  ["Status", details.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
              {details.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{details.notes}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Follow-up history ({details.followUps?.length ?? 0})
                </p>
                {details.followUps?.length ? (
                  <ul className="space-y-2">
                    {details.followUps.map((entry, index) => (
                      <li key={index} className="rounded-lg border p-3 text-sm">
                        <p className="text-xs text-muted-foreground">{entry.date} · {entry.by}</p>
                        <p>{entry.note}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No follow-ups recorded yet.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!details) return;
                setFollowUp({ note: "", next: dayOffset(3), by: details.assignedTo });
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
            <DialogDescription>{followingUp?.name} · {followingUp?.phone}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What happened?</Label>
              <Textarea
                rows={3}
                placeholder="Called and explained the fee structure..."
                value={followUp.note}
                onChange={(e) => setFollowUp((current) => ({ ...current, note: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Logged by</Label>
                <Select value={followUp.by} onValueChange={(value) => setFollowUp((current) => ({ ...current, by: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_OPTIONS.map((staff) => (
                      <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next follow-up</Label>
                <Input
                  type="date"
                  value={followUp.next}
                  onChange={(e) => setFollowUp((current) => ({ ...current, next: e.target.value }))}
                />
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
              {closing?.name} will stop appearing in the follow-up queue. The record stays in the list.
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
