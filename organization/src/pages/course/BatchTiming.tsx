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
import { useState } from "react";
import { useLocalCollection, newId } from "@/hooks/use-local-collection";
import { downloadCsv } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

interface TimingSlot {
  id: string;
  batch: string;
  course: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  instructor: string;
  room: string;
}

const SEED: TimingSlot[] = [
  { id: "1", batch: "CS-2024-A", course: "Computer Science", day: "Monday", startTime: "09:00", endTime: "10:30", subject: "Data Structures", instructor: "Dr. Smith", room: "Lab 101" },
  { id: "2", batch: "CS-2024-A", course: "Computer Science", day: "Monday", startTime: "10:45", endTime: "12:15", subject: "Algorithms", instructor: "Prof. Johnson", room: "Room 202" },
  { id: "3", batch: "CS-2024-A", course: "Computer Science", day: "Tuesday", startTime: "09:00", endTime: "10:30", subject: "Database Systems", instructor: "Dr. Patel", room: "Lab 102" },
  { id: "4", batch: "CS-2024-A", course: "Computer Science", day: "Tuesday", startTime: "10:45", endTime: "12:15", subject: "Web Development", instructor: "Prof. Kumar", room: "Lab 103" },
  { id: "5", batch: "CS-2024-A", course: "Computer Science", day: "Wednesday", startTime: "09:00", endTime: "10:30", subject: "Operating Systems", instructor: "Dr. Smith", room: "Room 201" },
  { id: "6", batch: "CS-2024-A", course: "Computer Science", day: "Wednesday", startTime: "10:45", endTime: "12:15", subject: "Computer Networks", instructor: "Prof. Johnson", room: "Room 203" },
  { id: "7", batch: "CS-2024-A", course: "Computer Science", day: "Thursday", startTime: "09:00", endTime: "10:30", subject: "Data Structures Lab", instructor: "Dr. Smith", room: "Lab 101" },
  { id: "8", batch: "CS-2024-A", course: "Computer Science", day: "Friday", startTime: "09:00", endTime: "10:30", subject: "Project Work", instructor: "Dr. Patel", room: "Lab 104" },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
const BATCH_COURSES: Record<string, string> = {
  "CS-2024-A": "Computer Science",
  "CS-2024-B": "Computer Science",
  "COM-2024-A": "Commerce",
  "ENG-2024-A": "Engineering",
};

const blankSlot = (batch: string): TimingSlot => ({
  id: "",
  batch,
  course: BATCH_COURSES[batch] ?? "",
  day: "Monday",
  startTime: "09:00",
  endTime: "10:30",
  subject: SUBJECTS[0],
  instructor: INSTRUCTORS[0],
  room: ROOMS[0],
});

export default function BatchTiming() {
  const { toast } = useToast();
  const { items, setItems, remove, update } = useLocalCollection<TimingSlot>("erp-batch-timings", SEED);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("CS-2024-A");
  const [branch, setBranch] = useState("main");
  const [draft, setDraft] = useState<TimingSlot>(() => blankSlot("CS-2024-A"));

  const set = <K extends keyof TimingSlot>(key: K, value: TimingSlot[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const getSlotForDayTime = (day: string, start: string, end: string) =>
    items.find(
      (slot) => slot.batch === selectedBatch && slot.day === day && slot.startTime === start && slot.endTime === end
    );

  const openAdd = () => {
    setDraft(blankSlot(selectedBatch));
    setIsDialogOpen(true);
  };

  const openEdit = (slot: TimingSlot) => {
    setDraft(slot);
    setIsDialogOpen(true);
  };

  const saveSlot = () => {
    if (draft.startTime >= draft.endTime) {
      toast({ title: "Invalid time range", description: "The end time must be after the start time.", variant: "destructive" });
      return;
    }
    // Two classes in one cell would silently hide one another in the grid, so
    // block the clash rather than accept it.
    const clash = items.find(
      (s) => s.id !== draft.id && s.batch === draft.batch && s.day === draft.day && s.startTime === draft.startTime,
    );
    if (clash) {
      toast({ title: "Slot already taken", description: `${clash.subject} is already scheduled then.`, variant: "destructive" });
      return;
    }
    if (draft.id) {
      update(draft.id, draft);
      toast({ title: "Slot updated", description: `${draft.subject} on ${draft.day}.` });
    } else {
      setItems((list) => [...list, { ...draft, id: newId("slot") }]);
      toast({ title: "Slot added", description: `${draft.subject} on ${draft.day} at ${draft.startTime}.` });
    }
    setIsDialogOpen(false);
  };

  const exportSchedule = () => {
    const rows = items.filter((s) => s.batch === selectedBatch);
    if (!rows.length) {
      toast({ title: "Nothing to export", description: "This batch has no scheduled slots.", variant: "destructive" });
      return;
    }
    downloadCsv(`${selectedBatch}-timetable.csv`, rows, ["day", "startTime", "endTime", "subject", "instructor", "room"]);
  };

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
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Time Slot
          </Button>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
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
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
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
                <Label>Instructor *</Label>
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
                <Label>Room/Lab *</Label>
                <Select value={draft.room} onValueChange={(v) => set("room", v)}>
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
              <Button onClick={saveSlot}>{draft.id ? "Save Changes" : "Add Slot"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label>Select Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Branch</SelectItem>
                  <SelectItem value="north">North Campus</SelectItem>
                  <SelectItem value="south">South Campus</SelectItem>
                  <SelectItem value="east">East Campus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Select Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CS-2024-A">CS-2024-A (Computer Science)</SelectItem>
                  <SelectItem value="CS-2024-B">CS-2024-B (Computer Science)</SelectItem>
                  <SelectItem value="COM-2024-A">COM-2024-A (Commerce)</SelectItem>
                  <SelectItem value="ENG-2024-A">ENG-2024-A (Engineering)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" className="gap-2" onClick={exportSchedule}>
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
            Weekly Timetable - {selectedBatch}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-3 bg-muted text-left font-medium">Time</th>
                  {days.map((day) => (
                    <th key={day} className="border border-border p-3 bg-muted text-left font-medium">{day}</th>
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
                    {days.map((day) => {
                      const timing = getSlotForDayTime(day, slot.start, slot.end);
                      return (
                        <td key={day} className="border border-border p-2 min-w-[150px]">
                          {timing ? (
                            <div className="bg-primary/10 rounded-lg p-2 relative group">
                              <p className="font-medium text-sm text-primary">{timing.subject}</p>
                              <p className="text-xs text-muted-foreground">{timing.instructor}</p>
                              <Badge variant="outline" className="mt-1 text-xs">{timing.room}</Badge>
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
                                    remove(timing.id);
                                    toast({ title: "Slot removed", description: `${timing.subject} on ${timing.day}.` });
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
        </CardContent>
      </Card>
    </AppLayout>
  );
}
