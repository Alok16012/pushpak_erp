import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bell, Calendar, Pin, PinOff, Trash2, Edit, Eye, Users } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalCollection, newId } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";

interface Notice {
  id: string;
  title: string;
  content: string;
  branch: string;
  batch?: string;
  priority: "high" | "medium" | "low";
  date: string;
  expiryDate: string;
  isPinned: boolean;
  views: number;
  type: "branch" | "batch";
}

const SEED: Notice[] = [
  { id: "1", title: "Annual Examination Schedule Released", content: "The annual examination schedule for all courses has been released. Please check the exam portal for detailed timetable.", branch: "All Branches", priority: "high", date: "2024-01-15", expiryDate: "2024-02-15", isPinned: true, views: 1250, type: "branch" },
  { id: "2", title: "Fee Payment Deadline Extended", content: "The last date for fee payment has been extended to January 31st. Late fee will be applicable after this date.", branch: "Main Campus", priority: "high", date: "2024-01-14", expiryDate: "2024-01-31", isPinned: true, views: 890, type: "branch" },
  { id: "3", title: "Republic Day Celebration", content: "All students and staff are invited to attend the Republic Day celebration on January 26th at 8:00 AM in the main auditorium.", branch: "All Branches", priority: "medium", date: "2024-01-13", expiryDate: "2024-01-26", isPinned: false, views: 560, type: "branch" },
  { id: "4", title: "Library Timings Changed", content: "The library will remain open from 8:00 AM to 8:00 PM starting from February 1st.", branch: "North Campus", priority: "low", date: "2024-01-12", expiryDate: "2024-03-01", isPinned: false, views: 320, type: "branch" },
  { id: "5", title: "Practical Lab Session - Batch A", content: "All students of Batch A are required to attend the practical lab session on Monday at 10:00 AM.", branch: "Main Campus", batch: "Batch A - Morning", priority: "high", date: "2024-01-16", expiryDate: "2024-01-20", isPinned: true, views: 180, type: "batch" },
  { id: "6", title: "Project Submission Deadline - Batch B", content: "Final project submission for Batch B is due on January 25th. No extensions will be granted.", branch: "Main Campus", batch: "Batch B - Evening", priority: "high", date: "2024-01-15", expiryDate: "2024-01-25", isPinned: false, views: 145, type: "batch" },
  { id: "7", title: "Extra Classes Scheduled - Batch C", content: "Extra doubt clearing classes scheduled for Batch C on weekends.", branch: "North Campus", batch: "Batch C - Weekend", priority: "medium", date: "2024-01-14", expiryDate: "2024-02-28", isPinned: false, views: 95, type: "batch" },
];

const BATCHES = ["All Batches", "Batch A - Morning", "Batch B - Evening", "Batch C - Weekend", "Batch D - Online"];
const BRANCHES = ["All Branches", "Main Campus", "North Campus", "South Campus"];

const today = () => new Date().toISOString().slice(0, 10);
const inAMonth = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

const blankDraft = (): Notice => ({
  id: "",
  title: "",
  content: "",
  branch: "All Branches",
  batch: BATCHES[0],
  priority: "medium",
  date: today(),
  expiryDate: inAMonth(),
  isPinned: false,
  views: 0,
  type: "branch",
});

const priorityVariant = (priority: string) =>
  priority === "high" ? "destructive" : priority === "medium" ? "default" : "secondary";

/** Notices expiring within a week — drives the "Expiring Soon" tile. */
const expiringSoon = (notices: Notice[]) => {
  const limit = Date.now() + 7 * 864e5;
  return notices.filter((n) => {
    const at = new Date(n.expiryDate).getTime();
    return at >= Date.now() && at <= limit;
  }).length;
};

export default function BranchNoticeBoard() {
  const { toast } = useToast();
  const { items, setItems, remove, update } = useLocalCollection<Notice>("erp-notices", SEED);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Notice>(blankDraft);

  const set = <K extends keyof Notice>(key: K, value: Notice[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const branchNotices = items.filter((n) => n.type === "branch");
  const batchNotices = items.filter((n) => n.type === "batch");

  const openCreate = () => {
    setDraft(blankDraft());
    setIsDialogOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setDraft(notice);
    setIsDialogOpen(true);
  };

  const publish = () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast({ title: "Missing details", description: "Title and content are both required.", variant: "destructive" });
      return;
    }
    if (draft.id) {
      update(draft.id, draft);
      toast({ title: "Notice updated", description: draft.title });
    } else {
      // New notices go to the top so the author sees the result immediately.
      setItems((list) => [{ ...draft, id: newId("notice") }, ...list]);
      toast({ title: "Notice published", description: draft.title });
    }
    setIsDialogOpen(false);
  };

  const NoticeCard = (notice: Notice) => (
    <Card key={notice.id} className={notice.isPinned ? "border-primary/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {notice.isPinned && <Pin className="h-4 w-4 text-primary" />}
            <CardTitle className="text-lg">{notice.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={priorityVariant(notice.priority) as "destructive" | "default" | "secondary"}>
              {notice.priority}
            </Badge>
            {notice.type === "batch" && <Badge variant="outline">{notice.batch}</Badge>}
            <Badge variant={notice.type === "batch" ? "secondary" : "outline"}>{notice.branch}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{notice.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Published: {notice.date}
            </span>
            <span>Expires: {notice.expiryDate}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {notice.views} views
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title={notice.isPinned ? "Unpin notice" : "Pin notice"}
              onClick={() => update(notice.id, { isPinned: !notice.isPinned })}
            >
              {notice.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" title="Edit notice" onClick={() => openEdit(notice)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Delete notice"
              onClick={() => {
                remove(notice.id);
                toast({ title: "Notice deleted", description: notice.title });
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Notice Board"
        description="Manage and publish notices across branches"
        breadcrumbs={[
          { label: "Branch Management", href: "/branch/view" },
          { label: "Notice Board" },
        ]}
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Notice
          </Button>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Notice" : "Create New Notice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Notice Title *</Label>
              <Input id="title" placeholder="Enter notice title" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Notice Type</Label>
                <Select value={draft.type} onValueChange={(val) => set("type", val as Notice["type"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select notice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="branch">Branch Notice</SelectItem>
                    <SelectItem value="batch">Batch Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target {draft.type === "branch" ? "Branch" : "Batch"}</Label>
                {draft.type === "branch" ? (
                  <Select value={draft.branch} onValueChange={(v) => set("branch", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={draft.batch} onValueChange={(v) => set("batch", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BATCHES.map((batch) => (
                        <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => set("priority", v as Notice["priority"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Notice Content *</Label>
              <Textarea id="content" placeholder="Enter notice content..." rows={5} value={draft.content} onChange={(e) => set("content", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Publish Date</Label>
                <Input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={draft.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={publish}>{draft.id ? "Save Changes" : "Publish Notice"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Active Notices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Pin className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.filter((n) => n.isPinned).length}</p>
                <p className="text-sm text-muted-foreground">Pinned Notices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringSoon(items)}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.reduce((sum, n) => sum + n.views, 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="branch" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="branch" className="gap-2">
            <Bell className="h-4 w-4" />
            Branch Notices ({branchNotices.length})
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <Users className="h-4 w-4" />
            Batch Notices ({batchNotices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branch" className="space-y-4">
          {branchNotices.map(NoticeCard)}
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          {batchNotices.map(NoticeCard)}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
