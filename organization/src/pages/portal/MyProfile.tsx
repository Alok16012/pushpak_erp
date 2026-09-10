import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Camera, KeyRound, RotateCcw, Save, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { pickImage } from "@/lib/export";
import { getStudentProfile } from "@/lib/supabase/data";
import { useAuth } from "@/contexts/AuthContext";
import type { StudentProfile } from "@/data/student-portal";

const READ_ONLY: { label: string; key: keyof StudentProfile }[] = [
  { label: "Enrolment number", key: "enrollmentNo" },
  { label: "Roll number", key: "rollNo" },
  { label: "Course", key: "course" },
  { label: "Batch", key: "batch" },
  { label: "Branch", key: "branch" },
  { label: "Date of birth", key: "dob" },
  { label: "Blood group", key: "bloodGroup" },
];

/**
 * A `students` row as Supabase returns it, with the three lookups
 * `getStudentProfile` embeds.
 *
 * The columns are the table's own -- `firstName`/`lastName` rather than a
 * `name`, `streetAddress`/`city`/... rather than an `address`, `courseId`
 * rather than a course name. This used to be typed as the flat response the
 * old api-server sent, which meant every field below arrived undefined and the
 * page died on `form.name.split(" ")`.
 */
export interface StudentRow {
  id: string;
  enrollmentNo?: string | null;
  applicationNo?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  rollNo?: string | null;
  section?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  admissionDate?: string | null;
  photo?: unknown;
  fatherName?: string | null;
  fatherPhone?: string | null;
  course?: { name?: string | null } | null;
  batch?: { name?: string | null } | null;
  branch?: { name?: string | null } | null;
}

const text = (value: unknown) => (value == null ? "" : String(value));

/**
 * `students.photo` is a JSONB column, so it can hold a bare data URL from an
 * older upload or an object from a newer one. The avatar needs a string or
 * nothing -- handing it an object renders `[object Object]` as the image src.
 */
function photoSrc(value: unknown): string | null {
  if (typeof value === "string") return value || null;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "dataUrl", "src", "path"]) {
      const found = record[key];
      if (typeof found === "string" && found) return found;
    }
  }
  return null;
}

/** The date columns are timestamps; the profile shows a day, not an instant. */
function asDay(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : format(parsed, "d MMM yyyy");
}

/**
 * The students row as the portal reads it.
 *
 * Which column feeds which field is the whole point of this function, so it is
 * separate and tested: `whatsappNumber` used to be mapped onto `guardianPhone`,
 * which put the student's own line under "Guardian mobile" here and printed it
 * as the parent contact on their ID card, since `asIdCardStudent` reads that
 * same field.
 */
export function toStudentProfile(row: StudentRow): StudentProfile {
  const name =
    [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim() || "Student";
  const phone = text(row.phone);

  return {
    id: text(row.id),
    name,
    // A student admitted but not yet enrolled has only an application number,
    // and that is what their paperwork carries until the enrolment is issued.
    enrollmentNo: text(row.enrollmentNo) || text(row.applicationNo),
    rollNo: text(row.rollNo),
    course: text(row.course?.name),
    batch: text(row.batch?.name),
    section: text(row.section),
    branch: text(row.branch?.name),
    email: text(row.email),
    phone,
    // A student who left the WhatsApp box blank still uses WhatsApp on the
    // mobile they gave at admission.
    whatsapp: text(row.whatsappNumber) || phone,
    guardian: text(row.fatherName),
    guardianPhone: text(row.fatherPhone),
    address: [row.streetAddress, row.city, row.district, row.state, row.pincode]
      .filter(Boolean)
      .join(", "),
    dob: asDay(row.dateOfBirth),
    bloodGroup: text(row.bloodGroup),
    admissionDate: asDay(row.admissionDate),
    photo: photoSrc(row.photo),
  };
}

export default function MyProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  const branchId = user?.branchId;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    let cancelled = false;
    // The signed-in student arrives a render after the page mounts, so a fetch
    // that does not wait for it queries `userId = undefined`, fails, and — with
    // no dependency on the id — never runs again once the session resolves.
    if (!userId || !branchId) return;
    setLoading(true);
    setError(null);
    getStudentProfile(userId, branchId)
      .then((result) => {
        if (cancelled) return;
        const profile = toStudentProfile(result.data as unknown as StudentRow);
        setProfile(profile);
        setForm(profile);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load profile");
        toast({ title: "Could not load profile", description: err.message || "Please try again.", variant: "destructive" });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast, userId, branchId]);

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  const dirty = form && profile ? JSON.stringify(form) !== JSON.stringify(profile) : false;

  const save = () => {
    if (!form) return;
    if (!form.phone.trim() || !form.email.trim()) return toast({ title: "Phone and email are required", variant: "destructive" });
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast({ title: "Check the email address", variant: "destructive" });
    setProfile(form);
    toast({ title: "Profile updated", description: "The branch office sees these details on your record." });
  };

  const photo = async () => {
    const picked = await pickImage();
    if (picked === "too-large") return toast({ title: "Image is over 5 MB", description: "Pick a smaller photo.", variant: "destructive" });
    if (!picked) return;
    set("photo", picked.dataUrl);
    toast({ title: "Photo ready", description: "Save the profile to keep it." });
  };

  const changePassword = () => {
    if (!passwords.current) return toast({ title: "Enter your current password", variant: "destructive" });
    if (passwords.next.length < 8) return toast({ title: "Use at least 8 characters", variant: "destructive" });
    if (passwords.next !== passwords.confirm) return toast({ title: "The two new passwords do not match", variant: "destructive" });
    setPasswords({ current: "", next: "", confirm: "" });
    toast({ title: "Password changed", description: "Use the new password the next time you sign in." });
  };

  if (error) {
    return (
      <AppLayout>
        <PageHeader title="My profile" description="Your contact details, as the branch office holds them." breadcrumbs={[{ label: "My profile" }]} />
        <Card><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="My profile"
        description="Your contact details, as the branch office holds them."
        breadcrumbs={[{ label: "My profile" }]}
        actions={<>
          <Button variant="outline" onClick={() => setForm(profile!)} disabled={!dirty || !form}><RotateCcw />Discard</Button>
          <Button onClick={save} disabled={!dirty || !form}><Save />Save changes</Button>
        </>}
      />

      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading profile…</CardContent></Card>
      ) : form ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-5">
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="mx-auto h-24 w-24">
                  {form.photo && <AvatarImage src={form.photo} alt="" />}
                  <AvatarFallback className="bg-foreground text-2xl text-background">{form.name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-lg font-semibold">{form.name}</h2>
                <p className="text-sm text-muted-foreground">{form.course || "Course not assigned"}</p>
                {/* A student with no batch yet would otherwise read " · Kothrud". */}
                <p className="mt-1 text-xs text-muted-foreground">{[form.batch, form.branch].filter(Boolean).join(" · ")}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={photo}><Camera className="mr-1.5 h-3.5 w-3.5" />{form.photo ? "Replace photo" : "Upload photo"}</Button>
                  {form.photo && <Button size="sm" variant="ghost" onClick={() => set("photo", null)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Institute record</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {READ_ONLY.map((field) => (
                  <div key={field.key} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <span className="text-right text-sm font-medium">{String(form[field.key] ?? "").trim() || "—"}</span>
                  </div>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">Something wrong here? Raise it from ID &amp; admit card → Request a document.</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="phone">Mobile</Label><Input id="phone" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" value={form.whatsapp} onChange={(event) => set("whatsapp", event.target.value)} />
                  <p className="text-xs text-muted-foreground">The branch messages you here. Leave it the same as your mobile if you use WhatsApp on that number.</p>
                </div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="guardian">Guardian</Label><Input id="guardian" value={form.guardian} onChange={(event) => set("guardian", event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="guardianPhone">Guardian mobile</Label><Input id="guardianPhone" value={form.guardianPhone} onChange={(event) => set("guardianPhone", event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" rows={3} value={form.address} onChange={(event) => set("address", event.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Password</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="current">Current</Label><Input id="current" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords((state) => ({ ...state, current: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="next">New</Label><Input id="next" type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords((state) => ({ ...state, next: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="confirm">Confirm</Label><Input id="confirm" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords((state) => ({ ...state, confirm: event.target.value }))} /></div>
                <div className="sm:col-span-3"><Button variant="outline" onClick={changePassword}>Change password</Button></div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
