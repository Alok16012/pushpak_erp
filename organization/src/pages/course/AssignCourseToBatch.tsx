import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/DataTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Users, Link2, CheckCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCourses, getBatches } from "@/lib/supabase/data";
import { newId } from "@/hooks/use-local-collection";

interface CourseAssignment {
  id: string;
  course: string;
  courseCode: string;
  batch: string;
  subjects: string[];
  instructors: string[];
  status: "assigned" | "pending";
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface Batch {
  id: string;
  name: string;
  course: string;
}

const availableSubjects = [
  "Data Structures", "Algorithms", "Database Systems", "Web Development",
  "Operating Systems", "Computer Networks", "Software Engineering", "Machine Learning"
];

const INSTRUCTOR_POOL = ["Dr. Smith", "Prof. Johnson", "Dr. Patel", "Dr. Sharma", "Prof. Gupta", "Prof. Kumar"];

const columns: Column<CourseAssignment>[] = [
  {
    key: "course",
    header: "Course",
    cell: (assignment) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{assignment.course}</p>
          <p className="text-xs text-muted-foreground">{assignment.courseCode}</p>
        </div>
      </div>
    ),
  },
  {
    key: "batch",
    header: "Batch",
    cell: (assignment) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline">{assignment.batch}</Badge>
      </div>
    ),
  },
  {
    key: "subjects",
    header: "Subjects",
    cell: (assignment) => (
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {assignment.subjects.slice(0, 2).map((subject) => (
          <Badge key={subject} variant="secondary" className="text-xs">{subject}</Badge>
        ))}
        {assignment.subjects.length > 2 && (
          <Badge variant="secondary" className="text-xs">+{assignment.subjects.length - 2}</Badge>
        )}
      </div>
    ),
  },
  {
    key: "instructors",
    header: "Instructors",
    cell: (assignment) => (
      <div className="text-sm">
        {assignment.instructors.join(", ")}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (assignment) => (
      <Badge variant={assignment.status === "assigned" ? "default" : "secondary"}>
        {assignment.status === "assigned" ? (
          <><CheckCircle className="h-3 w-3 mr-1" /> Assigned</>
        ) : (
          "Pending"
        )}
      </Badge>
    ),
  },
];

export default function AssignCourseToBatch() {
  const { user } = useAuth();
  const orgId = user?.organizationId || null;
  const branchId = user?.branchId || null;
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>(availableSubjects);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [details, setDetails] = useState<CourseAssignment | null>(null);
  const [editing, setEditing] = useState<CourseAssignment | null>(null);
  const [pendingRemove, setPendingRemove] = useState<CourseAssignment | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadReferenceData() {
      try {
        const [coursesRes, batchesRes] = await Promise.all([
          getCourses(orgId),
          getBatches(branchId),
        ]);
        if (!cancelled) {
          setCourses(coursesRes.data);
          setBatches(batchesRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          toast({ title: "Failed to load courses and batches", variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadReferenceData();
    return () => { cancelled = true; };
  }, [toast]);

  const addAssignment = useCallback((assignment: Omit<CourseAssignment, "id">) => {
    const newItem: CourseAssignment = { ...assignment, id: newId("ca") };
    setAssignments((prev) => [newItem, ...prev]);
    return newItem;
  }, []);

  const updateAssignment = useCallback((id: string, patch: Partial<CourseAssignment>) => {
    setAssignments((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const removeAssignment = useCallback((id: string) => {
    setAssignments((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleActions = (assignment: CourseAssignment) => [
    { label: "View Details", onClick: () => setDetails(assignment) },
    { label: "Edit Assignment", onClick: () => setEditing(assignment) },
    {
      label: assignment.status === "assigned" ? "Mark Pending" : "Mark Assigned",
      onClick: () => {
        updateAssignment(assignment.id, { status: assignment.status === "assigned" ? "pending" : "assigned" });
        toast({ title: "Assignment updated", description: `${assignment.course} · ${assignment.batch}` });
      },
    },
    { label: "Remove Assignment", onClick: () => setPendingRemove(assignment), destructive: true },
  ];

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) {
      toast({ title: "Type a subject name first", variant: "destructive" });
      return;
    }
    if (subjectsList.some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast({ title: "That subject already exists", description: name, variant: "destructive" });
      return;
    }
    setSubjectsList((prev) => [...prev, name]);
    setSelectedSubjects((prev) => [...prev, name]);
    setNewSubject("");
    toast({ title: "Subject created", description: `${name} was added and selected.` });
  };

  const resetForm = () => {
    setSelectedBranch("");
    setSelectedCourse("");
    setSelectedBatch("");
    setSelectedSubjects([]);
    setNewSubject("");
  };

  const assign = () => {
    const course = courses.find((c) => c.id === selectedCourse);
    const batch = batches.find((b) => b.id === selectedBatch);
    if (!selectedBranch) {
      toast({ title: "Choose a branch", variant: "destructive" });
      return;
    }
    if (!course || !batch) {
      toast({ title: "Choose both a course and a batch", variant: "destructive" });
      return;
    }
    if (!selectedSubjects.length) {
      toast({ title: "Select at least one subject", variant: "destructive" });
      return;
    }
    if (assignments.some((a) => a.courseCode === course.code && a.batch === batch.name)) {
      toast({
        title: "Already assigned",
        description: `${course.name} is already linked to ${batch.name}.`,
        variant: "destructive",
      });
      return;
    }

    addAssignment({
      course: course.name,
      courseCode: course.code,
      batch: batch.name,
      subjects: [...selectedSubjects],
      instructors: [INSTRUCTOR_POOL[assignments.length % INSTRUCTOR_POOL.length]],
      status: "pending",
    });
    toast({
      title: "Course assigned",
      description: `${course.name} → ${batch.name} with ${selectedSubjects.length} subject(s).`,
    });
    resetForm();
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.subjects.length) {
      toast({ title: "An assignment needs at least one subject", variant: "destructive" });
      return;
    }
    updateAssignment(editing.id, editing);
    toast({ title: "Assignment saved", description: `${editing.course} · ${editing.batch}` });
    setEditing(null);
  };

  const confirmRemove = () => {
    if (!pendingRemove) return;
    removeAssignment(pendingRemove.id);
    toast({ title: "Assignment removed", description: `${pendingRemove.course} · ${pendingRemove.batch}` });
    setPendingRemove(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Assign Course to Batch"
        description="Link courses with batches and assign subjects"
        breadcrumbs={[
          { label: "Course Management", href: "/course/view" },
          { label: "Assign Course to Batch" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              New Assignment
            </CardTitle>
            <CardDescription>Assign a course to a batch with selected subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Select Branch *</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Branch</SelectItem>
                    <SelectItem value="north">North Campus</SelectItem>
                    <SelectItem value="south">South Campus</SelectItem>
                    <SelectItem value="east">East Campus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Course *</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Batch *</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name} - {batch.course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Subjects</Label>
                <div className="flex gap-2 max-w-xs">
                  <Input
                    placeholder="New subject name"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="h-8"
                  />
                  <Button size="sm" variant="outline" onClick={addSubject} className="h-8">
                    Create Subject
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg">
                {subjectsList.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject}
                      checked={selectedSubjects.includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <label htmlFor={subject} className="text-sm cursor-pointer line-clamp-1">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {selectedSubjects.map((subject) => (
                  <Badge key={subject} variant="secondary">{subject}</Badge>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button disabled={loading || !selectedCourse || !selectedBatch} onClick={assign}>
                <Link2 className="h-4 w-4 mr-2" />
                Assign Course
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Total Assignments</span>
              <span className="font-bold">{assignments.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Active Assignments</span>
              <span className="font-bold text-success">{assignments.filter(a => a.status === "assigned").length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Pending Assignments</span>
              <span className="font-bold text-warning">{assignments.filter(a => a.status === "pending").length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Total Batches</span>
              <span className="font-bold">{batches.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={assignments}
            columns={columns}
            searchPlaceholder="Search assignments..."
            actions={handleActions}
          />
        </CardContent>
      </Card>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.course}</DialogTitle>
            <DialogDescription>{details?.courseCode} · {details?.batch}</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{details.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subjects ({details.subjects.length})</p>
                <div className="flex flex-wrap gap-1">
                  {details.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">{subject}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Instructors</p>
                <div className="flex flex-wrap gap-1">
                  {details.instructors.map((instructor) => (
                    <Badge key={instructor} variant="outline">{instructor}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
            <Button
              onClick={() => {
                setEditing(details);
                setDetails(null);
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit assignment</DialogTitle>
            <DialogDescription>{editing?.course} · {editing?.batch}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-instructors">Instructors (comma separated)</Label>
                <Input
                  id="edit-instructors"
                  value={editing.instructors.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      instructors: e.target.value.split(",").map((i) => i.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Subjects</Label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border rounded-lg">
                  {Array.from(new Set([...subjectsList, ...editing.subjects])).map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${subject}`}
                        checked={editing.subjects.includes(subject)}
                        onCheckedChange={() =>
                          setEditing({
                            ...editing,
                            subjects: editing.subjects.includes(subject)
                              ? editing.subjects.filter((s) => s !== subject)
                              : [...editing.subjects, subject],
                          })
                        }
                      />
                      <label htmlFor={`edit-${subject}`} className="text-sm cursor-pointer line-clamp-1">
                        {subject}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove?.course} will no longer be linked to {pendingRemove?.batch}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
