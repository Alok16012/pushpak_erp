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
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { getStudents, getCourses, getBatches, createStudent, getBranches } from "@/lib/supabase/data";
import { INDIAN_STATES } from "@/data/indianStates";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
type Draft = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  fatherName: string;
  motherName: string;
  branchId: string;
  courseId: string;
  batchId: string;
};
const blank: Draft = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  streetAddress: "",
  city: "",
  state: "",
  pincode: "",
  fatherName: "",
  motherName: "",
  branchId: "",
  courseId: "",
  batchId: "",
};
const steps = ["Student", "Family & address", "Academic", "Review"];
export default function AdmissionsWorkspace() {
  const { toast } = useToast();
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const branchId = user?.branchId;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      return {
        ...blank,
        ...JSON.parse(localStorage.getItem("admission-draft") || "{}"),
      };
    } catch {
      return blank;
    }
  });
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [batches, setBatches] = useState<
    Array<{ id: string; name: string; courseId: string }>
  >([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  // Branch-scoped accounts admit into their own branch and never see the picker.
  const targetBranchId = branchId || draft.branchId;
  const set = (k: keyof Draft, v: string) =>
    setDraft((p) => ({ ...p, [k]: v }));
  useEffect(() => {
    localStorage.setItem("admission-draft", JSON.stringify(draft));
  }, [draft]);
  // `getCourses`/`getBatches` resolve to `{ success, data }`. Assigning the
  // envelope straight into state left `courses.map` undefined and blanked the
  // whole page as soon as the academic step rendered - unwrap `data`, and never
  // let a rejected query escape as an unhandled promise.
  useEffect(() => {
    getCourses(organizationId)
      .then((r) => setCourses(r.data as Array<{ id: string; name: string }>))
      .catch(() => setCourses([]));
    if (!branchId) {
      getBranches(organizationId)
        .then((r) => setBranches(r.data as Array<{ id: string; name: string }>))
        .catch(() => setBranches([]));
    }
  }, [organizationId, branchId]);

  // Batches belong to a branch, so they reload whenever the target branch moves.
  useEffect(() => {
    if (!targetBranchId) {
      setBatches([]);
      return;
    }
    getBatches(targetBranchId)
      .then((r) => setBatches(r.data as Array<{ id: string; name: string; courseId: string }>))
      .catch(() => setBatches([]));
  }, [targetBranchId]);
  const progress = Math.round(
    (Object.values(draft).filter(Boolean).length / Object.keys(draft).length) *
      100,
  );
  const submit = async () => {
    // Every one of these is NOT NULL on `students`; letting the insert fail
    // instead returns an opaque Postgres error the applicant cannot act on.
    const missing = (
      [
        ["firstName", "First name"],
        ["lastName", "Last name"],
        ["dateOfBirth", "Date of birth"],
        ["gender", "Gender"],
        ["phone", "Mobile"],
        ["streetAddress", "Street address"],
        ["city", "City"],
        ["state", "State"],
        ["pincode", "Pincode"],
      ] as Array<[keyof Draft, string]>
    )
      .filter(([key]) => !draft[key])
      .map(([, label]) => label);
    if (missing.length) {
      toast({
        title: "Admission is incomplete",
        description: `Still needed: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    if (!targetBranchId) {
      toast({
        title: "Choose a branch",
        description: "An admission has to be filed against a branch.",
        variant: "destructive",
      });
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      const { data } = await createStudent(targetBranchId, {
        ...draft,
        branchId: undefined,
        // The column is a timestamp; a bare `yyyy-mm-dd` is rejected.
        dateOfBirth: new Date(draft.dateOfBirth).toISOString(),
        email: draft.email || undefined,
        courseId: draft.courseId || undefined,
        batchId: draft.batchId || undefined,
        admissionStatus: "APPROVED",
      });
      const applicationNo = (data as { applicationNo?: string } | null)?.applicationNo;
      toast({
        title: "Admission completed",
        description: applicationNo
          ? `Application number ${applicationNo} was issued.`
          : "Student profile was created.",
      });
      setDraft(blank);
      setStep(0);
      localStorage.removeItem("admission-draft");
    } catch (e) {
      toast({
        title: "Admission could not be completed",
        description: e instanceof Error ? e.message : "Please review fields",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <AppLayout>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
          Student management
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
          New admission
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A guided application that creates a real student record.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/25 p-5">
          <div className="mb-3 flex justify-between text-sm">
            <span>Admission progress · autosaved</span>
            <strong>{progress}%</strong>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={`min-w-36 rounded-xl border px-3 py-2 text-xs ${i === step ? "bg-foreground text-background" : "bg-card"}`}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
        </div>
        <CardContent className="p-6">
          <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
            {step === 0 && (
              <>
                <Field l="First name">
                  <Input
                    value={draft.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                </Field>
                <Field l="Last name">
                  <Input
                    value={draft.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </Field>
                <Field l="Date of birth">
                  <Input
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                  />
                </Field>
                <Field l="Gender">
                  <Select
                    value={draft.gender}
                    onValueChange={(v) => set("gender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field l="Mobile">
                  <Input
                    value={draft.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <Field l="Email">
                  <Input
                    value={draft.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field l="Father / guardian">
                  <Input
                    value={draft.fatherName}
                    onChange={(e) => set("fatherName", e.target.value)}
                  />
                </Field>
                <Field l="Mother / guardian">
                  <Input
                    value={draft.motherName}
                    onChange={(e) => set("motherName", e.target.value)}
                  />
                </Field>
                <Field l="Street address">
                  <Input
                    value={draft.streetAddress}
                    onChange={(e) => set("streetAddress", e.target.value)}
                  />
                </Field>
                <Field l="City">
                  <Input
                    value={draft.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
                <Field l="State">
                  <Select value={draft.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field l="Pincode">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={draft.pincode}
                    onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                {!branchId && (
                  <Field l="Branch">
                    <Select
                      value={draft.branchId}
                      onValueChange={(v) => {
                        set("branchId", v);
                        set("batchId", "");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field l="Course">
                  <Select
                    value={draft.courseId}
                    onValueChange={(v) => {
                      set("courseId", v);
                      set("batchId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field l="Batch">
                  <Select
                    value={draft.batchId}
                    disabled={!targetBranchId}
                    onValueChange={(v) => set("batchId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={targetBranchId ? "Choose batch" : "Choose a branch first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {batches
                        .filter(
                          (b) =>
                            !draft.courseId || b.courseId === draft.courseId,
                        )
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            {step === 3 && (
              <div className="sm:col-span-2 rounded-2xl border bg-muted/30 p-5">
                <p className="text-xl font-semibold">
                  {draft.firstName || "Unnamed"} {draft.lastName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {draft.phone || "No phone"} ·{" "}
                  {courses.find((c) => c.id === draft.courseId)?.name ||
                    "Course not assigned"}
                </p>
                <p className="mt-4 text-sm">
                  Submitting creates an approved student record and preserves an
                  audit event.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <div className="flex flex-col-reverse gap-2 border-t p-3 sm:flex-row sm:justify-between sm:p-4">
          <Button className="w-full sm:w-auto"
            variant="ghost"
            onClick={() =>
              toast({
                title: "Draft saved",
                description: `${progress}% complete`,
              })
            }
          >
            <Save />
            Save draft
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft />
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Continue
                <ArrowRight />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving}>
                <Check />
                {saving ? "Saving..." : "Complete admission"}
              </Button>
            )}
          </div>
        </div>
      </Card>
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
