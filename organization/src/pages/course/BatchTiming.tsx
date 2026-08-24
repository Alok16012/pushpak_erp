import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBatches, getBatchTimings, createBatchTiming, updateBatchTiming, deleteBatchTiming } from "@/lib/supabase/data";

interface Batch {
  id: string;
  name: string;
  code: string;
  courseId: string;
  course?: { id: string; name: string };
}

interface TimingSlot {
  id: string;
  batchId: string;
  courseId: string;
  day: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  subject?: string;
  instructor?: string;
  batch?: { course: { name: string } };
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
};
const DAY_ENUM = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const timeSlots = [
  { start: "09:00", end: "10:30" },
  { start: "10:45", end: "12:15" },
  { start: "13:00", end: "14:30" },
  { start: "14:45", end: "16:15" },
  { start: "16:30", end: "18:00" },
];

const SUBJECTS = ["Data Structures", "Algorithms", "Database Systems", "Web Development", "Operating Systems", "Computer Networks", "Project Work"];
const INSTRUCTORS = ["Dr. Smith", "Prof. Johnson", "Dr. Patel", "Prof. Kumar"];
const ROOMS = ["Lab 101", "Lab 102", "Lab 103", "Lab 104", "Room 201", "Room 202", "Room 203"];

const blankSlot = (batchId: string, courseId: string): Omit<TimingSlot, "id"> => ({
  batchId,
  courseId,
  day: "MONDAY",
  startTime: "09:00",
  endTime: "10:30",
  subject: SUBJECTS[0],
  instructor: INSTRUCTORS[0],
  roomNo: ROOMS[0],
});

export default function BatchTiming() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [slots, setSlots] = useState<TimingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [editingSlot, setEditingSlot] = useState<TimingSlot | null>(null);
  const [draft, setDraft] = useState<Omit<TimingSlot, "id">>(() => blankSlot("", ""));

  const loadBatches = useCallback(async () => {
    try {
      const res = await getBatches(user?.branchId || "");
      const activeBatches = res.data.filter((b) => b.isActive !== false);
      setBatches(activeBatches);
      if (!selectedBatchId && activeBatches.length > 0) {
        setSelectedBatchId(activeBatches[0].id);
        setDraft((d) => blankSlot(activeBatches[0].id, activeBatches[0].courseId));
      }
    } catch {
      toast({ title: "Failed to load batches", variant: "destructive" });
    }
  }, [selectedBatchId, toast]);

  const loadSlots = useCallback(async (batchId: string) => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await getBatchTimings(user?.branchId || "", { batchId });
      setSlots(res.data);
    } catch {
      toast({ title: "Failed to load timetable", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { if (selectedBatchId) loadSlots(selectedBatchId); }, [selectedBatchId, loadSlots]);

  const currentBatch = batches.find((b) => b.id === selectedBatchId);

  const set = <K extends keyof Omit<TimingSlot, "id">>(key: K, value: TimingSlot[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const openAdd = () => {
    if (!selectedBatchId) return;
    const batch = batches.find((b) => b.id === selectedBatchId);
    setEditingSlot(null);
    setDraft(blankSlot(selectedBatchId, batch?.courseId || ""));
    setIsDialogOpen(true);
  };

  const openEdit = (slot: TimingSlot) => {
    setEditingSlot(slot);
    setDraft({
      batchId: slot.batchId,
      courseId: slot.courseId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomNo: slot.roomNo || "",
      subject: slot.subject || "",
      instructor: slot.instructor || "",
    });
    setIsDialogOpen(true);
  };

  const saveSlot = async () => {
    if (!draft.startTime || !draft.endTime) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    if (draft.startTime >= draft.endTime) {
      toast({ title: "Invalid time range", description: "End time must be after start time.", variant: "destructive" });
      return;
    }
    const clash = slots.find(
      (s) => s.id !== editingSlot?.id && s.batchId === draft.batchId && s.day === draft.day && s.startTime === draft.startTime,
    );
    if (clash) {
      toast({ title: "Slot already taken", description: `${clash.subject || "A class"} is already scheduled then.`, variant: "destructive" });
      return;
    }
    try {
      if (editingSlot) {
        const res = await updateBatchTiming(editingSlot.id, {
            day: draft.day,
            startTime: draft.startTime,
            endTime: draft.endTime,
            roomNo: draft.roomNo || null,
            subject: draft.subject || null,
            instructor: draft.instructor || null,
          });
        setSlots((list) => list.map((s) => (s.id === editingSlot.id ? res.data : s)));
        toast({ title: "Slot updated", description: `${draft.subject} on ${DAY_LABELS[draft.day]}.` });
      } else {
        const res = await createBatchTiming({
            batchId: draft.batchId,
            courseId: draft.courseId,
            day: draft.day,
            startTime: draft.startTime,
            endTime: draft.endTime,
            roomNo: draft.roomNo || undefined,
            subject: draft.subject || undefined,
            instructor: draft.instructor || undefined,
          });
        setSlots((list) => [...list, res.data]);
        toast({ title: "Slot added", description: `${draft.subject} on ${DAY_LABELS[draft.day]} at ${draft.startTime}.` });
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const removeSlot = async (id: string) => {
    try {
      await deleteBatchTiming(id);
      setSlots((list) => list.filter((s) => s.id !== id));
      toast({ title: "Slot removed", description: "Time slot deleted." });
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const exportSchedule = () => {
    const rows = slots.filter((s) => s.batchId === selectedBatchId);
    if (!rows.length) {
      toast({ title: "Nothing to export", description: "This batch has no scheduled slots.", variant: "destructive" });
      return;
    }
    downloadCsv(
      `${currentBatch?.code || "batch"}-timetable.csv`,
      rows.map((r) => ({
        day: DAY_LABELS[r.day] || r.day,
        startTime: r.startTime,
        endTime: r.endTime,
        subject: r.subject || "",
        instructor: r.instructor || "",
        roomNo: r.roomNo || "",
      })),
      ["day", "startTime", "endTime", "subject", "instructor", "roomNo"],
    );
    toast({ title: "Exported", description: `${rows.length} slot(s) downloaded.` });
  };

  const getSlotForDayTime = (day: string, start: string, end: string) =>
    slots.find((slot) => slot.batchId === selectedBatchId && slot.day === day && slot.startTime === start && slot.endTime === end);

  return (
    <AppLayout>
      <PageHeader
        title="Batch Timing"
        description="Manage batch schedules and timetables"
        breadcrumbs={[
          { label: "Course Management", href: "/course/view" },
          { label: "Batch Timing" },
        ]}
        actions={
          <Button className="gap-2" onClick={openAdd} disabled={!selectedBatchId}>
            <Plus className="h-4 w-4" />
            Add Time Slot
          </Button>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Day *</Label>
                <Select value={draft.day} onValueChange={(v) => set("day", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_ENUM.map((d) => (
                      <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={draft.subject} onValueChange={(v) => set("subject", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input type="time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Select value={draft.instructor} onValueChange={(v) => set("instructor", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUCTORS.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room/Lab</Label>
                <Select value={draft.roomNo} onValueChange={(v) => set("roomNo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS.map((room) => (
                      <SelectItem key={room} value={room}>{room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveSlot}>{editingSlot ? "Save Changes" : "Add Slot"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label>Select Batch</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.code} — {batch.name} ({batch.course.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto mt-5">
              <Button variant="outline" className="gap-2" onClick={exportSchedule} disabled={!selectedBatchId}>
                <Calendar className="h-4 w-4" />
                Export Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Timetable {currentBatch ? `— ${currentBatch.code}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading schedule...</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-3 bg-muted text-left font-medium">Time</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border border-border p-3 bg-muted text-left font-medium">{DAY_LABELS[day]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot.start}>
                    <td className="border border-border p-3 bg-muted/50">
                      <span className="font-medium text-sm">{slot.start}</span>
                      <span className="text-muted-foreground text-sm"> - {slot.end}</span>
                    </td>
                    {DAYS.map((day) => {
                      const timing = getSlotForDayTime(day, slot.start, slot.end);
                      return (
                        <td key={day} className="border border-border p-2 min-w-[150px]">
                          {timing ? (
                            <div className="bg-primary/10 rounded-lg p-2 relative group">
                              <p className="font-medium text-sm text-primary">{timing.subject || "Class"}</p>
                              <p className="text-xs text-muted-foreground">{timing.instructor}</p>
                              <Badge variant="outline" className="mt-1 text-xs">{timing.roomNo || "TBD"}</Badge>
                              <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit slot" onClick={() => openEdit(timing)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  title="Remove slot"
                                  onClick={() => {
                                    removeSlot(timing.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
