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
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getNotices, createNotice, updateNotice, deleteNotice } from "@/lib/supabase/data";

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

/** Notices expiring within a week - drives the "Expiring Soon" tile. */
const expiringSoon = (notices: Notice[]) => {
  const limit = Date.now() + 7 * 864e5;
  return notices.filter((n) => {
    const at = new Date(n.expiryDate).getTime();
    return at >= Date.now() && at <= limit;
  }).length;
};

export default function BranchNoticeBoard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Notice>(blankDraft);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const result = await getNotices(user!.branchId);
        setItems(result.data);
      } catch {
        toast({ title: "Failed to load notices", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [toast]);

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

  const publish = async () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast({ title: "Missing details", description: "Title and content are both required.", variant: "destructive" });
      return;
    }
    try {
      if (draft.id) {
        await updateNotice(draft.id, draft as unknown as Record<string, unknown>);
        setItems((list) => list.map((n) => (n.id === draft.id ? draft : n)));
        toast({ title: "Notice updated", description: draft.title });
      } else {
        const created = await createNotice(draft as unknown as Record<string, unknown>);
        setItems((list) => [created.data as unknown as Notice, ...list]);
        toast({ title: "Notice published", description: draft.title });
      }
      setIsDialogOpen(false);
    } catch {
      toast({ title: "Failed to save notice", variant: "destructive" });
    }
  };

  const togglePin = async (notice: Notice) => {
    try {
      await updateNotice(notice.id, { isPinned: !notice.isPinned } as Record<string, unknown>);
      setItems((list) => list.map((n) => (n.id === notice.id ? { ...n, isPinned: !n.isPinned } : n)));
    } catch {
      toast({ title: "Failed to update notice", variant: "destructive" });
    }
  };

  const deleteNoticeHandler = async (notice: Notice) => {
    try {
      await deleteNotice(notice.id);
      setItems((list) => list.filter((n) => n.id !== notice.id));
      toast({ title: "Notice deleted", description: notice.title });
    } catch {
      toast({ title: "Failed to delete notice", variant: "destructive" });
    }
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
              onClick={() => togglePin(notice)}
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
              onClick={() => deleteNoticeHandler(notice)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading notices...</p>
        </div>
      </AppLayout>
    );
  }

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
