import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Calendar, Plus, Users, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCourses, createCourse, getBatches, createBatch } from "@/lib/supabase/data";
type Course = {
  id: string;
  name: string;
  code: string;
  baseFee: number;
  durationValue: number;
  durationUnit: string;
  _count: { students: number; batches: number };
};
type Batch = {
  id: string;
  name: string;
  code: string;
  courseId: string;
  startDate: string;
  maxSeats?: number;
  course: { name: string };
  _count: { students: number };
};
export default function AcademicsWorkspace() {
  const { user } = useAuth();
  const orgId = user?.organizationId || null;
  const branchId = user?.branchId || null;
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState<"course" | "batch" | null>(null);
  const [d, setD] = useState<Record<string, string>>({});
  const load = () =>
    Promise.all([
      getCourses(orgId),
      getBatches(branchId),
    ]).then(([c, b]) => {
      setCourses(c.data);
      setBatches(b.data);
    });
  useEffect(() => {
    void load();
  }, []);
  const submit = async () => {
    try {
      if (form === "course")
        await createCourse(orgId, {
            name: d.name,
            code: d.code,
            category: d.category || "COMPUTER",
            durationValue: Number(d.durationValue),
            durationUnit: "MONTHS",
            baseFee: Number(d.baseFee),
            registrationFee: 0,
            examFee: 0,
          });
      else
        await createBatch(branchId, {
            courseId: d.courseId,
            name: d.name,
            code: d.code,
            maxSeats: Number(d.maxSeats),
            startDate: d.startDate,
            endDate: d.endDate || undefined,
          });
      toast({
        title: `${form === "course" ? "Course" : "Batch"} created`,
        description: "The academic record is now active.",
      });
      setForm(null);
      setD({});
      await load();
    } catch (e) {
      toast({
        title: "Could not create record",
        description: e instanceof Error ? e.message : "Review the form",
        variant: "destructive",
      });
    }
  };
  return (
    <AppLayout>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
            Academics
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
            Courses & batches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan programmes and cohorts from one workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => setForm("batch")}>
            <Plus />
            New batch
          </Button>
          <Button onClick={() => setForm("course")}>
            <Plus />
            New course
          </Button>
        </div>
      </div>
      {form && (
        <Card className="mb-5 border-brand/40">
          <CardContent className="p-5">
            <div className="mb-5 flex justify-between">
              <div>
                <h2 className="font-semibold">Create {form}</h2>
                <p className="text-xs text-muted-foreground">
                  Required information only
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setForm(null)}>
                <X />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {form === "batch" && (
                <Field l="Course">
                  <Select
                    onValueChange={(v) => setD((p) => ({ ...p, courseId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem value={c.id} key={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field l="Name">
                <Input
                  onChange={(e) =>
                    setD((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </Field>
              <Field l="Code">
                <Input
                  onChange={(e) =>
                    setD((p) => ({ ...p, code: e.target.value }))
                  }
                />
              </Field>
              {form === "course" ? (
                <>
                  <Field l="Category">
                    <Select
                      onValueChange={(v) =>
                        setD((p) => ({ ...p, category: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPUTER">Computer</SelectItem>
                        <SelectItem value="SKILL_DEVELOPMENT">
                          Skill development
                        </SelectItem>
                        <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field l="Duration (months)">
                    <Input
                      type="number"
                      onChange={(e) =>
                        setD((p) => ({ ...p, durationValue: e.target.value }))
                      }
                    />
                  </Field>
                  <Field l="Base fee">
                    <Input
                      type="number"
                      onChange={(e) =>
                        setD((p) => ({ ...p, baseFee: e.target.value }))
                      }
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field l="Capacity">
                    <Input
                      type="number"
                      onChange={(e) =>
                        setD((p) => ({ ...p, maxSeats: e.target.value }))
                      }
                    />
                  </Field>
                  <Field l="Start date">
                    <Input
                      type="date"
                      onChange={(e) =>
                        setD((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                  </Field>
                  <Field l="End date">
                    <Input
                      type="date"
                      onChange={(e) =>
                        setD((p) => ({ ...p, endDate: e.target.value }))
                      }
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={submit}>Create {form}</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-4 font-semibold">
              Courses · {courses.length}
            </div>
            <div className="divide-y">
              {courses.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.code} · {c.durationValue}{" "}
                      {c.durationUnit.toLowerCase()} · ₹
                      {Number(c.baseFee).toLocaleString()}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {c._count.students} students
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-4 font-semibold">
              Active batches · {batches.length}
            </div>
            <div className="divide-y">
              {batches.map((b) => (
                <div key={b.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.course.name} · starts{" "}
                      {new Date(b.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {b._count.students}/{b.maxSeats || "∞"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{l}</Label>
      {children}
    </div>
  );
}
