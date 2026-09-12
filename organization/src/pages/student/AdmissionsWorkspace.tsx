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
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Save, Upload, X } from "lucide-react";
import { pickImage } from "@/lib/export";
import { getCourses, getBatches, createStudent, getBranches } from "@/lib/supabase/data";
import { INDIAN_STATES } from "@/data/indianStates";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Every key here is a real column on `students`, so the whole draft can be
 * handed to `createStudent` after the numeric and date fields are converted.
 */
type Draft = {
  // Personal
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  category: string;
  religion: string;
  nationality: string;
  aadharNumber: string;
  apaarNumber: string;
  // Contact
  phone: string;
  altPhone: string;
  whatsappNumber: string;
  email: string;
  streetAddress: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  // Enrolment
  branchId: string;
  academicYear: string;
  admissionDate: string;
  courseId: string;
  batchId: string;
  section: string;
  /** The roll number the branch assigns. Not `tenthRollNo`, which is the board's. */
  rollNo: string;
  // Previous education
  tenthSchoolName: string;
  tenthBoard: string;
  tenthYearOfPassing: string;
  tenthPercentage: string;
  tenthRollNo: string;
  tenthSubjects: string;
  twelfthSchoolName: string;
  twelfthBoard: string;
  twelfthYearOfPassing: string;
  twelfthPercentage: string;
  twelfthStream: string;
  twelfthSubjects: string;
  // Family
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  fatherEmail: string;
  fatherAnnualIncome: string;
  motherName: string;
  motherOccupation: string;
  motherPhone: string;
  localGuardianName: string;
  localGuardianRelation: string;
  localGuardianPhone: string;
  localGuardianAddress: string;
};

const blank: Draft = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  category: "",
  religion: "",
  nationality: "Indian",
  aadharNumber: "",
  apaarNumber: "",
  phone: "",
  altPhone: "",
  whatsappNumber: "",
  email: "",
  streetAddress: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",
  branchId: "",
  academicYear: "",
  admissionDate: "",
  courseId: "",
  batchId: "",
  section: "",
  rollNo: "",
  tenthSchoolName: "",
  tenthBoard: "",
  tenthYearOfPassing: "",
  tenthPercentage: "",
  tenthRollNo: "",
  tenthSubjects: "",
  twelfthSchoolName: "",
  twelfthBoard: "",
  twelfthYearOfPassing: "",
  twelfthPercentage: "",
  twelfthStream: "",
  twelfthSubjects: "",
  fatherName: "",
  fatherOccupation: "",
  fatherPhone: "",
  fatherEmail: "",
  fatherAnnualIncome: "",
  motherName: "",
  motherOccupation: "",
  motherPhone: "",
  localGuardianName: "",
  localGuardianRelation: "",
  localGuardianPhone: "",
  localGuardianAddress: "",
};

/** NOT NULL on `students` - the insert fails with an opaque error without them. */
const REQUIRED: Array<[keyof Draft, string]> = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["dateOfBirth", "Date of birth"],
  ["gender", "Gender"],
  ["phone", "Mobile"],
  ["streetAddress", "Street address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
  ["fatherName", "Father's name"],
  ["motherName", "Mother's name"],
];

/** Integer columns - a blank string is rejected, so they are dropped instead. */
const NUMERIC: Array<keyof Draft> = ["tenthYearOfPassing", "twelfthYearOfPassing"];

const steps = ["Personal", "Academic", "Guardian", "Documents", "Review"];

/**
 * The paperwork an admission collects. `required` is what the office is meant
 * to hold on file, and the form says so plainly -- it does not block the
 * admission, because a walk-in without their transfer certificate is still a
 * student to be admitted, and a scan that is not to hand today is chased
 * tomorrow rather than turning someone away at the counter.
 */
const ADMISSION_DOCUMENTS: Array<{ id: string; label: string; required: boolean }> = [
  { id: "tenthMarksheet", label: "10th Marksheet", required: true },
  { id: "twelfthMarksheet", label: "12th Marksheet", required: true },
  { id: "transferCertificate", label: "Transfer Certificate", required: true },
  { id: "aadharCard", label: "Aadhar Card", required: true },
  { id: "apaarCard", label: "APAAR Card", required: true },
  { id: "casteCertificate", label: "Caste Certificate", required: false },
];

/** What is kept for each upload. The file rides in `dataUrl`, as the student
 *  photo already does -- this app has no storage bucket wired up. */
interface AdmissionDocument {
  name: string;
  dataUrl: string;
  uploadedAt: string;
}

const DOCUMENT_ACCEPT = "application/pdf,image/png,image/jpeg";
/** Base64 inflates a file by about a third, and several of these share one row. */
const DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;
const DOCUMENTS_KEY = "admission-draft-documents";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const BOARDS = ["CBSE", "ICSE", "State Board", "NIOS", "Other"];
const STREAMS = ["Science", "Commerce", "Arts", "Vocational"];
const RELATIONS = ["Uncle", "Aunt", "Grandparent", "Sibling", "Family friend", "Other"];

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
  const [documents, setDocuments] = useState<Record<string, AdmissionDocument>>(() => {
    try {
      return JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [saving, setSaving] = useState(false);
  /** Set once the record exists, so the issued number has somewhere to be read. */
  const [issued, setIssued] = useState<{ applicationNo: string; name: string } | null>(
    null,
  );
  // Branch-scoped accounts admit into their own branch and never see the picker.
  const targetBranchId = branchId || draft.branchId;
  const set = (k: keyof Draft, v: string) =>
    setDraft((p) => ({ ...p, [k]: v }));
  // Both writes are guarded: uploads are base64 and the two of them now share
  // one 5MB quota. An unguarded `setItem` throwing QuotaExceededError inside an
  // effect takes the whole form down, and losing autosave is not worth that.
  useEffect(() => {
    try {
      localStorage.setItem("admission-draft", JSON.stringify(draft));
    } catch {
      /* the form still holds the draft in memory */
    }
  }, [draft]);
  useEffect(() => {
    try {
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    } catch {
      /* too large to autosave; the uploads survive until the page is reloaded */
    }
  }, [documents]);
  // `getCourses`/`getBatches` resolve to `{ success, data }`. Assigning the
  // envelope straight into state left `courses.map` undefined and blanked the
  // whole page as soon as the academic step rendered - unwrap `data`, and never
  // let a rejected query escape as an unhandled promise.
  useEffect(() => {
    getCourses(organizationId, branchId ?? null)
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
  const uploadDocument = async (id: string, label: string) => {
    const picked = await pickImage(DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES);
    if (picked === "too-large") {
      toast({
        title: "File too large",
        description: `${label} must be 2MB or smaller. Scan it at a lower quality and try again.`,
        variant: "destructive",
      });
      return;
    }
    if (!picked) return;
    setDocuments((d) => ({
      ...d,
      [id]: { name: picked.name, dataUrl: picked.dataUrl, uploadedAt: new Date().toISOString() },
    }));
    toast({ title: `${label} attached`, description: picked.name });
  };

  const removeDocument = (id: string) =>
    setDocuments((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });

  const requiredDocuments = ADMISSION_DOCUMENTS.filter((doc) => doc.required);
  const missingDocuments = requiredDocuments.filter((doc) => !documents[doc.id]);

  // Measured against what an admission actually needs. Counting all ~50 optional
  // boxes would leave a complete application sitting at a third of the bar.
  const progress = Math.round(
    (REQUIRED.filter(([key]) => draft[key]).length / REQUIRED.length) * 100,
  );
  const submit = async () => {
    const missing = REQUIRED.filter(([key]) => !draft[key]).map(([, label]) => label);
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
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      // Empty boxes are left out rather than written as "", so a column that was
      // never filled reads as null and the integer columns are never sent "".
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(draft)) {
        if (key === "branchId" || value === "") continue;
        payload[key] = NUMERIC.includes(key as keyof Draft) ? Number(value) : value;
      }
      const { data } = await createStudent(targetBranchId, {
        ...payload,
        // `students.documents` is jsonb. Left out entirely when nothing was
        // attached, so the column reads as null rather than an empty object --
        // and `createStudent` drops it on a database that has not been migrated.
        ...(Object.keys(documents).length ? { documents } : {}),
        // The columns are timestamps; a bare `yyyy-mm-dd` is rejected.
        dateOfBirth: new Date(draft.dateOfBirth).toISOString(),
        admissionDate: new Date(draft.admissionDate || Date.now()).toISOString(),
        admissionStatus: "APPROVED",
      });
      const applicationNo =
        (data as { applicationNo?: string } | null)?.applicationNo || "";
      setIssued({
        applicationNo,
        name: [draft.firstName, draft.middleName, draft.lastName]
          .filter(Boolean)
          .join(" "),
      });
      toast({
        title: "Admission completed",
        description: applicationNo
          ? `Application number ${applicationNo} was issued.`
          : "Student profile was created.",
      });
      setDraft(blank);
      setDocuments({});
      setStep(0);
      localStorage.removeItem("admission-draft");
      localStorage.removeItem(DOCUMENTS_KEY);
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

  if (issued) {
    return (
      <AppLayout>
        <Card className="mx-auto mt-10 max-w-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-.03em]">
              Admission completed
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {issued.name} has been admitted.
            </p>
            <div className="mt-6 rounded-2xl border bg-muted/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Application number
              </p>
              <p className="mt-2 select-all text-3xl font-semibold tracking-tight">
                {issued.applicationNo || "Not issued"}
              </p>
            </div>
            <Button className="mt-6 w-full" onClick={() => setIssued(null)}>
              Start another admission
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

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
          A guided application that creates a real student record. The
          application number is issued once the form is completed.
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
                <Section title="Personal details" />
                <Field l="First name" required>
                  <Input
                    value={draft.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                </Field>
                <Field l="Middle name">
                  <Input
                    value={draft.middleName}
                    onChange={(e) => set("middleName", e.target.value)}
                  />
                </Field>
                <Field l="Last name" required>
                  <Input
                    value={draft.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </Field>
                <Field l="Date of birth" required>
                  <Input
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                  />
                </Field>
                <Field l="Gender" required>
                  <Picker
                    value={draft.gender}
                    onChange={(v) => set("gender", v)}
                    options={[
                      ["MALE", "Male"],
                      ["FEMALE", "Female"],
                      ["OTHER", "Other"],
                    ]}
                  />
                </Field>
                <Field l="Blood group">
                  <Picker
                    value={draft.bloodGroup}
                    onChange={(v) => set("bloodGroup", v)}
                    options={BLOOD_GROUPS.map((b) => [b, b])}
                  />
                </Field>
                <Field l="Category">
                  <Picker
                    value={draft.category}
                    onChange={(v) => set("category", v)}
                    options={CATEGORIES.map((c) => [c, c])}
                  />
                </Field>
                <Field l="Religion">
                  <Input
                    value={draft.religion}
                    onChange={(e) => set("religion", e.target.value)}
                  />
                </Field>
                <Field l="Nationality">
                  <Input
                    value={draft.nationality}
                    onChange={(e) => set("nationality", e.target.value)}
                  />
                </Field>
                <Field l="Aadhaar number">
                  <Input
                    inputMode="numeric"
                    maxLength={12}
                    value={draft.aadharNumber}
                    onChange={(e) =>
                      set("aadharNumber", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>
                <Field l="APAAR / ABC ID">
                  <Input
                    value={draft.apaarNumber}
                    onChange={(e) => set("apaarNumber", e.target.value)}
                  />
                </Field>

                <Section title="Contact" />
                <Field l="Mobile" required>
                  <Input
                    value={draft.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <Field l="Alternate mobile">
                  <Input
                    value={draft.altPhone}
                    onChange={(e) => set("altPhone", e.target.value)}
                  />
                </Field>
                <Field l="WhatsApp number">
                  <Input
                    value={draft.whatsappNumber}
                    onChange={(e) => set("whatsappNumber", e.target.value)}
                  />
                </Field>
                <Field l="Email">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
                <Field l="Street address" required wide>
                  <Input
                    value={draft.streetAddress}
                    onChange={(e) => set("streetAddress", e.target.value)}
                  />
                </Field>
                <Field l="City" required>
                  <Input
                    value={draft.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
                <Field l="District">
                  <Input
                    value={draft.district}
                    onChange={(e) => set("district", e.target.value)}
                  />
                </Field>
                <Field l="State" required>
                  <Picker
                    value={draft.state}
                    onChange={(v) => set("state", v)}
                    options={INDIAN_STATES.map((s) => [s, s])}
                    placeholder="Select state"
                  />
                </Field>
                <Field l="Pincode" required>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={draft.pincode}
                    onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Field l="Country">
                  <Input
                    value={draft.country}
                    onChange={(e) => set("country", e.target.value)}
                  />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Section title="Enrolment" />
                {!branchId && (
                  <Field l="Branch">
                    <Picker
                      value={draft.branchId}
                      onChange={(v) => {
                        set("branchId", v);
                        set("batchId", "");
                      }}
                      options={branches.map((b) => [b.id, b.name])}
                      placeholder="Choose branch"
                    />
                  </Field>
                )}
                <Field l="Academic year">
                  <Input
                    placeholder="2026-27"
                    value={draft.academicYear}
                    onChange={(e) => set("academicYear", e.target.value)}
                  />
                </Field>
                <Field l="Admission date">
                  <Input
                    type="date"
                    value={draft.admissionDate}
                    onChange={(e) => set("admissionDate", e.target.value)}
                  />
                </Field>
                <Field l="Course">
                  <Picker
                    value={draft.courseId}
                    onChange={(v) => {
                      set("courseId", v);
                      set("batchId", "");
                    }}
                    options={courses.map((c) => [c.id, c.name])}
                    placeholder="Choose course"
                  />
                </Field>
                <Field l="Batch">
                  <Picker
                    value={draft.batchId}
                    onChange={(v) => set("batchId", v)}
                    disabled={!targetBranchId}
                    options={batches
                      .filter((b) => !draft.courseId || b.courseId === draft.courseId)
                      .map((b) => [b.id, b.name])}
                    placeholder={targetBranchId ? "Choose batch" : "Choose a branch first"}
                  />
                </Field>
                <Field l="Section">
                  <Input
                    placeholder="e.g. A"
                    value={draft.section}
                    onChange={(e) => set("section", e.target.value)}
                  />
                </Field>
                <Field l="Roll no">
                  <Input
                    placeholder="e.g. 24"
                    value={draft.rollNo}
                    onChange={(e) => set("rollNo", e.target.value)}
                  />
                </Field>

                <Section title="Class 10" />
                <Field l="School name" wide>
                  <Input
                    value={draft.tenthSchoolName}
                    onChange={(e) => set("tenthSchoolName", e.target.value)}
                  />
                </Field>
                <Field l="Board">
                  <Picker
                    value={draft.tenthBoard}
                    onChange={(v) => set("tenthBoard", v)}
                    options={BOARDS.map((b) => [b, b])}
                  />
                </Field>
                <Field l="Year of passing">
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={draft.tenthYearOfPassing}
                    onChange={(e) =>
                      set("tenthYearOfPassing", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>
                <Field l="Percentage / CGPA">
                  <Input
                    value={draft.tenthPercentage}
                    onChange={(e) => set("tenthPercentage", e.target.value)}
                  />
                </Field>
                <Field l="Roll number">
                  <Input
                    value={draft.tenthRollNo}
                    onChange={(e) => set("tenthRollNo", e.target.value)}
                  />
                </Field>
                <Field l="Subjects" wide>
                  <Input
                    placeholder="Comma separated"
                    value={draft.tenthSubjects}
                    onChange={(e) => set("tenthSubjects", e.target.value)}
                  />
                </Field>

                <Section
                  title="Class 12"
                  hint="Leave blank if the applicant has not taken class 12."
                />
                <Field l="School name" wide>
                  <Input
                    value={draft.twelfthSchoolName}
                    onChange={(e) => set("twelfthSchoolName", e.target.value)}
                  />
                </Field>
                <Field l="Board">
                  <Picker
                    value={draft.twelfthBoard}
                    onChange={(v) => set("twelfthBoard", v)}
                    options={BOARDS.map((b) => [b, b])}
                  />
                </Field>
                <Field l="Year of passing">
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={draft.twelfthYearOfPassing}
                    onChange={(e) =>
                      set("twelfthYearOfPassing", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>
                <Field l="Percentage / CGPA">
                  <Input
                    value={draft.twelfthPercentage}
                    onChange={(e) => set("twelfthPercentage", e.target.value)}
                  />
                </Field>
                <Field l="Stream">
                  <Picker
                    value={draft.twelfthStream}
                    onChange={(v) => set("twelfthStream", v)}
                    options={STREAMS.map((s) => [s, s])}
                  />
                </Field>
                <Field l="Subjects" wide>
                  <Input
                    placeholder="Comma separated"
                    value={draft.twelfthSubjects}
                    onChange={(e) => set("twelfthSubjects", e.target.value)}
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <Section title="Father" />
                <Field l="Full name" required>
                  <Input
                    value={draft.fatherName}
                    onChange={(e) => set("fatherName", e.target.value)}
                  />
                </Field>
                <Field l="Occupation">
                  <Input
                    value={draft.fatherOccupation}
                    onChange={(e) => set("fatherOccupation", e.target.value)}
                  />
                </Field>
                <Field l="Mobile">
                  <Input
                    value={draft.fatherPhone}
                    onChange={(e) => set("fatherPhone", e.target.value)}
                  />
                </Field>
                <Field l="Email">
                  <Input
                    type="email"
                    value={draft.fatherEmail}
                    onChange={(e) => set("fatherEmail", e.target.value)}
                  />
                </Field>
                <Field l="Annual income" wide>
                  <Input
                    placeholder="e.g. 6,00,000"
                    value={draft.fatherAnnualIncome}
                    onChange={(e) => set("fatherAnnualIncome", e.target.value)}
                  />
                </Field>

                <Section title="Mother" />
                <Field l="Full name" required>
                  <Input
                    value={draft.motherName}
                    onChange={(e) => set("motherName", e.target.value)}
                  />
                </Field>
                <Field l="Occupation">
                  <Input
                    value={draft.motherOccupation}
                    onChange={(e) => set("motherOccupation", e.target.value)}
                  />
                </Field>
                <Field l="Mobile" wide>
                  <Input
                    value={draft.motherPhone}
                    onChange={(e) => set("motherPhone", e.target.value)}
                  />
                </Field>

                <Section
                  title="Local guardian"
                  hint="Only needed when the student does not live with a parent."
                />
                <Field l="Full name">
                  <Input
                    value={draft.localGuardianName}
                    onChange={(e) => set("localGuardianName", e.target.value)}
                  />
                </Field>
                <Field l="Relationship">
                  <Picker
                    value={draft.localGuardianRelation}
                    onChange={(v) => set("localGuardianRelation", v)}
                    options={RELATIONS.map((r) => [r, r])}
                  />
                </Field>
                <Field l="Mobile">
                  <Input
                    value={draft.localGuardianPhone}
                    onChange={(e) => set("localGuardianPhone", e.target.value)}
                  />
                </Field>
                <Field l="Address">
                  <Input
                    value={draft.localGuardianAddress}
                    onChange={(e) => set("localGuardianAddress", e.target.value)}
                  />
                </Field>
              </>
            )}
            {step === 3 && (
              <div className="sm:col-span-2 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      Document upload
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, PNG or JPG, up to 2MB each.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {requiredDocuments.length - missingDocuments.length} of {requiredDocuments.length}{" "}
                    required documents attached
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ADMISSION_DOCUMENTS.map((doc) => {
                    const held = documents[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 rounded-xl border p-4 ${held ? "border-success/40 bg-success/5" : ""}`}
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${held ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                        >
                          {held ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{doc.label}</p>
                          {/* The attached file's own name, so the office can see
                              at a glance that the right scan went in the right slot. */}
                          <p className="truncate text-xs text-muted-foreground">
                            {held ? held.name : doc.required ? "Required" : "Optional"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant={held ? "outline" : "default"}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => uploadDocument(doc.id, doc.label)}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {held ? "Replace" : "Upload"}
                          </Button>
                          {held && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${doc.label}`}
                              onClick={() => removeDocument(doc.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {missingDocuments.length > 0 && (
                  <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                    <strong className="text-foreground">Still to collect:</strong>{" "}
                    {missingDocuments.map((doc) => doc.label).join(", ")}. The admission can be
                    completed without them — they stay outstanding against the student.
                  </div>
                )}
              </div>
            )}
            {step === 4 && (
              <div className="sm:col-span-2 space-y-4">
                <div className="rounded-2xl border bg-muted/30 p-5">
                  <p className="text-xl font-semibold">
                    {[draft.firstName, draft.middleName, draft.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unnamed"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {draft.phone || "No phone"} ·{" "}
                    {courses.find((c) => c.id === draft.courseId)?.name ||
                      "Course not assigned"}
                  </p>
                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <Row k="Date of birth" v={draft.dateOfBirth} />
                    <Row k="Gender" v={draft.gender} />
                    <Row
                      k="Address"
                      v={[draft.streetAddress, draft.city, draft.state, draft.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    />
                    <Row
                      k="Section · Roll no"
                      v={[draft.section, draft.rollNo].filter(Boolean).join(" · ")}
                    />
                    <Row k="Father" v={draft.fatherName} />
                    <Row k="Mother" v={draft.motherName} />
                    <Row
                      k="Class 10"
                      v={[draft.tenthBoard, draft.tenthPercentage].filter(Boolean).join(" · ")}
                    />
                    <Row
                      k="Class 12"
                      v={[draft.twelfthBoard, draft.twelfthPercentage]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </dl>
                </div>
                {(() => {
                  const missing = REQUIRED.filter(([k]) => !draft[k]).map(([, l]) => l);
                  return missing.length ? (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                      <strong>Still needed:</strong> {missing.join(", ")}
                    </div>
                  ) : (
                    <div className="rounded-2xl border p-4 text-sm">
                      Completing the admission creates an approved student record
                      and issues the application number.
                    </div>
                  );
                })()}
                {/* Separate from the block above: a missing field stops the
                    insert, a missing document does not. Saying so in one list
                    would make the two read as the same kind of problem. */}
                {missingDocuments.length > 0 && (
                  <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm">
                    <strong>Documents outstanding:</strong>{" "}
                    {missingDocuments.map((doc) => doc.label).join(", ")}
                  </div>
                )}
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
            {step < steps.length - 1 ? (
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

function Section({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="sm:col-span-2 border-b pb-2 pt-2 first:pt-0">
      <h2 className="text-sm font-semibold uppercase tracking-[.12em] text-muted-foreground">
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Field({
  l,
  required,
  wide,
  children,
}: {
  l: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label>
        {l}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

/** Radix rejects "" as an item value, so an empty list renders no items at all. */
function Picker({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options
          .filter(([v]) => v)
          .map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v || "—"}</dd>
    </div>
  );
}
