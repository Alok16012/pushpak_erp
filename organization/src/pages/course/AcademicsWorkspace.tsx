import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Calendar, Download, Plus, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv, parseCsv, pickFile } from "@/lib/export";
import {
  CUSTOM_CATEGORY,
  courseCategoryLabel,
  courseCategoryOptions,
} from "@/lib/courseCategories";
import {
  getCourses,
  createCourse,
  getBatches,
  getBatchesByOrg,
  createBatch,
  getBranches,
} from "@/lib/supabase/data";

type Course = {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
  durationMonths: number;
  baseFee?: number;
  isActive: boolean;
};

type Batch = {
  id: string;
  name: string;
  code: string;
  branchId: string;
  courseId: string;
  startDate: string;
  endDate?: string;
  maxStudents?: number;
  currentStudents?: number;
  feeDiscount?: number;
  remark?: string;
  isActive: boolean;
};

type Branch = { id: string; name: string };

/** Which form the page opens with, taken from the route. */
const formForPath = (pathname: string): "course" | "batch" | null => {
  if (pathname.startsWith("/course/batch/create")) return "batch";
  if (pathname.startsWith("/course/create")) return "course";
  return null;
};

const REMARK_WORD_LIMIT = 200;
const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export default function AcademicsWorkspace() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const orgId = user?.organizationId || null;
  const branchId = user?.branchId || null;
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<"course" | "batch" | null>(null);
  const [d, setD] = useState<Record<string, string>>({});

  // The route decides which form is open, so "Create course" from the menu
  // lands on an open form instead of a list the user has to hunt through.
  useEffect(() => {
    setForm(formForPath(pathname));
    setD({});
  }, [pathname]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, b, br] = await Promise.all([
        getCourses(orgId, branchId),
        branchId ? getBatches(branchId) : getBatchesByOrg(orgId),
        orgId ? getBranches(orgId) : Promise.resolve({ success: true, data: [] }),
      ]);
      setCourses(c.data as Course[]);
      setBatches(b.data as Batch[]);
      setBranches(br.data as Branch[]);
    } catch (e) {
      toast({
        title: "Could not load academics",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orgId, branchId, toast]);

  // Re-runs once auth resolves; the old version fetched once with a null org
  // and left both lists permanently empty.
  useEffect(() => {
    void load();
  }, [load]);

  const targetBranchId = branchId || d.branchId || "";
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name || "—";
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || "—";

  const remarkWords = useMemo(() => countWords(d.remark || ""), [d.remark]);

  // The seven enum members plus whatever the existing courses already use, so a
  // category typed earlier is picked, not retyped.
  const categoryOptions = useMemo(
    () => courseCategoryOptions(courses.map((c) => c.category)),
    [courses],
  );

  /**
   * The Select holds the sentinel while a custom category is being typed, so
   * `d.category` is not the value to save - this is.
   */
  const chosenCategory = () =>
    (d.category === CUSTOM_CATEGORY ? d.categoryCustom || "" : d.category || "").trim();

  const validate = () => {
    const missing: string[] = [];
    if (!d.name?.trim()) missing.push("Name");
    if (!d.code?.trim()) missing.push("Code");
    if (form === "course" && !d.durationMonths) missing.push("Duration");
    // Without this the sentinel resolves to nothing and the course would be
    // quietly filed under COMPUTER instead of the category being typed.
    if (form === "course" && d.category === CUSTOM_CATEGORY && !d.categoryCustom?.trim()) {
      missing.push("Category");
    }
    if (form === "batch") {
      if (!d.courseId) missing.push("Course");
      if (!targetBranchId) missing.push("Branch");
      if (!d.startDate) missing.push("Start date");
    }
    if (missing.length > 0) {
      toast({
        title: "Missing details",
        description: `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`,
        variant: "destructive",
      });
      return false;
    }
    if (form === "batch" && d.endDate && d.endDate < d.startDate) {
      toast({ title: "Invalid dates", description: "End date is before the start date.", variant: "destructive" });
      return false;
    }
    if (form === "batch" && remarkWords > REMARK_WORD_LIMIT) {
      toast({
        title: "Remark too long",
        description: `Remarks are limited to ${REMARK_WORD_LIMIT} words (currently ${remarkWords}).`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (form === "course") {
        await createCourse(orgId, {
          name: d.name.trim(),
          code: d.code.trim().toUpperCase(),
          category: chosenCategory() || "COMPUTER",
          description: d.description || "",
          durationMonths: Number(d.durationMonths) || 1,
          baseFee: Number(d.baseFee) || 0,
          isActive: true,
        });
      } else {
        await createBatch(targetBranchId, {
          courseId: d.courseId,
          name: d.name.trim(),
          code: d.code.trim().toUpperCase(),
          maxStudents: d.maxStudents ? Number(d.maxStudents) : null,
          startDate: new Date(d.startDate).toISOString(),
          endDate: d.endDate ? new Date(d.endDate).toISOString() : null,
          feeDiscount: d.feeDiscount ? Number(d.feeDiscount) : 0,
          remark: d.remark?.trim() || null,
          isActive: true,
        });
      }
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
    } finally {
      setSaving(false);
    }
  };

  const exportCourses = () => {
    downloadCsv(
      "courses.csv",
      courses.map((c) => ({
        Name: c.name,
        Code: c.code,
        Category: c.category || "",
        DurationMonths: c.durationMonths,
        BaseFee: c.baseFee ?? 0,
        Description: c.description || "",
        Active: c.isActive ? "Yes" : "No",
      })),
    );
    toast({ title: "Courses exported", description: `${courses.length} rows written to CSV.` });
  };

  const exportBatches = () => {
    downloadCsv(
      "batches.csv",
      batches.map((b) => ({
        Name: b.name,
        Code: b.code,
        Course: courseName(b.courseId),
        Branch: branchName(b.branchId),
        StartDate: b.startDate?.slice(0, 10) || "",
        EndDate: b.endDate?.slice(0, 10) || "",
        Capacity: b.maxStudents ?? "",
        Enrolled: b.currentStudents ?? 0,
        FeeDiscount: b.feeDiscount ?? 0,
        Remark: b.remark || "",
      })),
    );
    toast({ title: "Batches exported", description: `${batches.length} rows written to CSV.` });
  };

  /** CSV columns: Name, Code, DurationMonths, Category, BaseFee, Description. */
  const importCourses = async () => {
    const file = await pickFile(".csv");
    if (!file) return;
    const rows = parseCsv(file.text);
    if (rows.length === 0) {
      toast({ title: "Nothing to import", description: "The file had no data rows.", variant: "destructive" });
      return;
    }
    setSaving(true);
    let ok = 0;
    const failures: string[] = [];
    for (const row of rows) {
      const name = row.Name || row.name;
      const code = row.Code || row.code;
      if (!name || !code) {
        failures.push(`${name || code || "(blank row)"}: name and code are both required`);
        continue;
      }
      try {
        await createCourse(orgId, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          category: row.Category || row.category || "COMPUTER",
          description: row.Description || row.description || "",
          durationMonths: Number(row.DurationMonths || row.durationMonths) || 1,
          baseFee: Number(row.BaseFee || row.baseFee) || 0,
          isActive: true,
        });
        ok += 1;
      } catch (e) {
        failures.push(`${name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setSaving(false);
    await load();
    toast({
      title: `Imported ${ok} of ${rows.length} courses`,
      description: failures.length > 0 ? failures.slice(0, 3).join(" · ") : "All rows imported.",
      variant: failures.length > 0 ? "destructive" : "default",
    });
  };

  return (
    <AppLayout>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
            Academics
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
            Courses &amp; batches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan programmes and cohorts from one workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={importCourses} disabled={saving}>
            <Upload />
            Import
          </Button>
          <Button variant="outline" onClick={exportCourses} disabled={courses.length === 0}>
            <Download />
            Export
          </Button>
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
                <p className="text-xs text-muted-foreground">Fields marked * are required</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close form" onClick={() => setForm(null)}>
                <X />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {form === "batch" && (
                <>
                  {!branchId && (
                    <Field l="Branch *">
                      <Select value={d.branchId || ""} onValueChange={(v) => setD((p) => ({ ...p, branchId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem value={b.id} key={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field l="Course *">
                    <Select value={d.courseId || ""} onValueChange={(v) => setD((p) => ({ ...p, courseId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={courses.length ? "Select course" : "Create a course first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem value={c.id} key={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
              <Field l="Name *">
                <Input value={d.name || ""} onChange={(e) => setD((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field l="Code *">
                <Input value={d.code || ""} onChange={(e) => setD((p) => ({ ...p, code: e.target.value }))} />
              </Field>
              {form === "course" ? (
                <>
                  <Field l="Category">
                    <Select
                      value={d.category || ""}
                      onValueChange={(v) => setD((p) => ({ ...p, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {courseCategoryLabel(value)}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_CATEGORY}>Other (type your own)…</SelectItem>
                      </SelectContent>
                    </Select>
                    {d.category === CUSTOM_CATEGORY && (
                      <Input
                        className="mt-2"
                        autoFocus
                        placeholder="Type the category"
                        value={d.categoryCustom || ""}
                        onChange={(e) => setD((p) => ({ ...p, categoryCustom: e.target.value }))}
                      />
                    )}
                  </Field>
                  <Field l="Duration (months) *">
                    <Input
                      type="number"
                      min={1}
                      value={d.durationMonths || ""}
                      onChange={(e) => setD((p) => ({ ...p, durationMonths: e.target.value }))}
                    />
                  </Field>
                  <Field l="Base fee (₹)">
                    <Input
                      type="number"
                      min={0}
                      value={d.baseFee || ""}
                      onChange={(e) => setD((p) => ({ ...p, baseFee: e.target.value }))}
                    />
                  </Field>
                  <Field l="Description">
                    <Input
                      value={d.description || ""}
                      onChange={(e) => setD((p) => ({ ...p, description: e.target.value }))}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field l="Capacity">
                    <Input
                      type="number"
                      min={1}
                      value={d.maxStudents || ""}
                      onChange={(e) => setD((p) => ({ ...p, maxStudents: e.target.value }))}
                    />
                  </Field>
                  <Field l="Start date *">
                    <Input
                      type="date"
                      value={d.startDate || ""}
                      onChange={(e) => setD((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </Field>
                  <Field l="End date">
                    <Input
                      type="date"
                      value={d.endDate || ""}
                      onChange={(e) => setD((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </Field>
                  <Field l="Course fee discount (₹)">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={d.feeDiscount || ""}
                      onChange={(e) => setD((p) => ({ ...p, feeDiscount: e.target.value }))}
                    />
                  </Field>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Remark</Label>
                    <Textarea
                      rows={3}
                      placeholder={`Notes about this batch (max ${REMARK_WORD_LIMIT} words)`}
                      value={d.remark || ""}
                      onChange={(e) => setD((p) => ({ ...p, remark: e.target.value }))}
                    />
                    <p
                      className={`text-xs ${remarkWords > REMARK_WORD_LIMIT ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {remarkWords}/{REMARK_WORD_LIMIT} words
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? "Saving..." : `Create ${form}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-semibold">Courses · {courses.length}</span>
              <Button variant="ghost" size="sm" onClick={exportCourses} disabled={courses.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y">
              {loading && <p className="p-4 text-sm text-muted-foreground">Loading courses...</p>}
              {!loading && courses.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  No courses yet. Use “New course” to add the first one.
                </p>
              )}
              {courses.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.code} · {c.durationMonths} months
                      {c.baseFee ? ` · ₹${c.baseFee.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {c.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-semibold">Batches · {batches.length}</span>
              <Button variant="ghost" size="sm" onClick={exportBatches} disabled={batches.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y">
              {loading && <p className="p-4 text-sm text-muted-foreground">Loading batches...</p>}
              {!loading && batches.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  No batches yet. Use “New batch” to add the first one.
                </p>
              )}
              {batches.map((b) => (
                <div key={b.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.code} · {courseName(b.courseId)} · starts{" "}
                      {b.startDate ? new Date(b.startDate).toLocaleDateString() : "—"}
                      {b.feeDiscount ? ` · ₹${b.feeDiscount.toLocaleString()} off` : ""}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {b.currentStudents ?? 0}/{b.maxStudents || "∞"}
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
