import { useEffect, useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/export";

const records = [
  {
    id: "V-1048",
    name: "Meera Joshi",
    phone: "98765 43215",
    purpose: "Interview",
    owner: "HR Department",
    status: "Checked in",
    date: "Today, 2:00 PM",
  },
  {
    id: "V-1047",
    name: "Vikram Singh",
    phone: "98765 43214",
    purpose: "Delivery",
    owner: "Administration",
    status: "Completed",
    date: "Today, 12:00 PM",
  },
  {
    id: "V-1046",
    name: "Priya Sharma",
    phone: "98765 43213",
    purpose: "Student enquiry",
    owner: "Admissions",
    status: "Follow-up",
    date: "Today, 10:30 AM",
  },
  {
    id: "V-1045",
    name: "Rajesh Kumar",
    phone: "98765 43212",
    purpose: "Meeting",
    owner: "Director",
    status: "Completed",
    date: "Yesterday",
  },
];
const stages = ["Visitor", "Visit", "Verification", "Review"];
type Draft = {
  name: string;
  phone: string;
  email: string;
  purpose: string;
  person: string;
  department: string;
  idType: string;
  idNumber: string;
  notes: string;
};
const emptyDraft: Draft = {
  name: "",
  phone: "",
  email: "",
  purpose: "",
  person: "",
  department: "",
  idType: "",
  idNumber: "",
  notes: "",
};

export default function EnquiriesWorkspace() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"list" | "form">("list");
  const [stage, setStage] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [liveRecords, setLiveRecords] = useState(records);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [purpose, setPurpose] = useState("all");
  const [owner, setOwner] = useState("all");
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      return {
        ...emptyDraft,
        ...JSON.parse(localStorage.getItem("reception-enquiry-draft") || "{}"),
      };
    } catch {
      return emptyDraft;
    }
  });
  const update = (key: keyof Draft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const filled = Object.values(draft).filter(Boolean).length;
  const progress = Math.round((filled / Object.keys(draft).length) * 100);
  const filtered = useMemo(
    () =>
      liveRecords.filter(
        (r) =>
          (status === "all" || r.status === status) &&
          (purpose === "all" || r.purpose === purpose) &&
          (owner === "all" || r.owner === owner) &&
          Object.values(r)
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status, purpose, owner, liveRecords],
  );
  const purposes = useMemo(
    () => Array.from(new Set(liveRecords.map((r) => r.purpose))).filter(Boolean),
    [liveRecords],
  );
  const owners = useMemo(
    () => Array.from(new Set(liveRecords.map((r) => r.owner))).filter(Boolean),
    [liveRecords],
  );
  const setRecordStatus = (id: string, next: string) => {
    setLiveRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    toast({ title: `Marked ${next.toLowerCase()}`, description: `Visitor ${id} was updated.` });
  };
  const removeRecord = (id: string) => {
    setLiveRecords((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Entry removed", description: `Visitor ${id} was taken off the log.` });
  };
  const exportVisitors = () => {
    if (!filtered.length) {
      toast({ title: "Nothing to export", description: "No visitors match these filters.", variant: "destructive" });
      return;
    }
    downloadCsv(
      "visitor-log.csv",
      filtered.map((r) => ({
        ID: r.id,
        Visitor: r.name,
        Phone: r.phone,
        Purpose: r.purpose,
        Meeting: r.owner,
        Status: r.status,
        Time: r.date,
      })),
    );
    toast({ title: "Visitor log exported", description: `${filtered.length} rows written to CSV.` });
  };
  const clearFilters = () => {
    setPurpose("all");
    setOwner("all");
    setStatus("all");
    setQuery("");
  };
  useEffect(() => {
    localStorage.setItem("reception-enquiry-draft", JSON.stringify(draft));
  }, [draft]);
  useEffect(() => {
    api<
      Array<{
        id: string;
        visitorName: string;
        phone: string;
        purpose: string;
        personToMeet: string;
        createdAt: string;
      }>
    >("/core/enquiries")
      .then((data) =>
        setLiveRecords(
          data.map((item) => ({
            id: item.id,
            name: item.visitorName,
            phone: item.phone,
            purpose: item.purpose.replaceAll("_", " "),
            owner: item.personToMeet,
            status: "Checked in",
            date: new Date(item.createdAt).toLocaleString(),
          })),
        ),
      )
      .catch((error) =>
        toast({
          title: "Could not load enquiries",
          description: error.message,
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [toast]);
  const save = () =>
    toast({
      title: "Draft saved",
      description: `Your enquiry is ${progress}% complete. You can resume it anytime.`,
    });
  const submit = async () => {
    try {
      const purpose =
        (
          {
            "Student enquiry": "ADMISSION",
            Meeting: "MEETING",
            Interview: "INTERVIEW",
            Delivery: "DELIVERY",
          } as Record<string, string>
        )[draft.purpose] || "OTHER";
      const created = await api<{ id: string; createdAt: string }>(
        "/core/enquiries",
        {
          method: "POST",
          body: JSON.stringify({
            visitorName: draft.name,
            phone: draft.phone,
            email: draft.email || undefined,
            purpose,
            personToMeet: draft.person || "Reception",
            department: "ADMINISTRATION",
            enquiryReason: draft.notes,
          }),
        },
      );
      setLiveRecords((prev) => [
        {
          id: created.id,
          name: draft.name,
          phone: draft.phone,
          purpose: draft.purpose || "Other",
          owner: draft.person || "Reception",
          status: "Checked in",
          date: "Just now",
        },
        ...prev,
      ]);
      toast({
        title: "Visitor registered",
        description:
          "The reception log and enquiry record were created together.",
      });
      setDraft(emptyDraft);
      setStage(0);
      setMode("list");
      localStorage.removeItem("reception-enquiry-draft");
    } catch (error) {
      toast({
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
            Reception
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
            Visitors & enquiries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One place to register visits, manage enquiries and follow up.
          </p>
        </div>
        {mode === "list" ? (
          <Button onClick={() => setMode("form")}>
            <Plus />
            Register visitor
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setMode("list")}>
            <X />
            Close form
          </Button>
        )}
      </div>

      {mode === "list" ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "On premises", value: "3", icon: UserRoundCheck },
              { label: "Visitors today", value: "18", icon: Users },
              { label: "Need follow-up", value: "5", icon: ArrowRight },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
                    <item.icon className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, phone, purpose or owner…"
                    className="pl-9"
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full md:w-44">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Checked in">Checked in</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters((open) => !open)}
                >
                  <SlidersHorizontal />
                  More filters
                </Button>
              </div>
              {showFilters && (
                <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 md:flex-row md:items-center">
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Purpose" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All purposes</SelectItem>
                      {purposes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={owner} onValueChange={setOwner}>
                    <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Meeting with" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      {owners.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground md:ml-1">
                    {filtered.length} of {liveRecords.length} visitors
                  </span>
                  <div className="flex gap-2 md:ml-auto">
                    <Button variant="ghost" onClick={clearFilters}>Clear</Button>
                    <Button variant="outline" onClick={exportVisitors}>
                      <Download />
                      Export
                    </Button>
                  </div>
                </div>
              )}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/35 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Visitor</th>
                      <th className="px-4 py-3 font-medium">Purpose</th>
                      <th className="px-4 py-3 font-medium">Meeting</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b last:border-0 hover:bg-muted/25"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.id} · {r.phone}
                          </p>
                        </td>
                        <td className="px-4 py-3">{r.purpose}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.owner}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.status === "Checked in" ? "bg-brand text-brand-foreground" : r.status === "Follow-up" ? "bg-amber-500/15 text-amber-600" : "bg-muted"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.date}
                        </td>
                        <td className="px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setRecordStatus(r.id, "Checked in")}>
                                Mark checked in
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setRecordStatus(r.id, "Follow-up")}>
                                Flag for follow-up
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setRecordStatus(r.id, "Completed")}>
                                Mark completed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => {
                                  navigator.clipboard?.writeText(r.phone);
                                  toast({ title: "Phone copied", description: r.phone });
                                }}
                              >
                                Copy phone number
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => removeRecord(r.id)}
                              >
                                Remove from log
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          {loading ? "Loading visitors…" : "No visitors match these filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="divide-y md:hidden">
                {filtered.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="font-semibold">{r.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{r.phone} · {r.purpose}</p></div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${r.status === "Checked in" ? "bg-brand text-brand-foreground" : r.status === "Follow-up" ? "bg-amber-500/15 text-amber-600" : "bg-muted"}`}>{r.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs"><div><p className="text-muted-foreground">Meeting</p><p className="mt-1 font-medium">{r.owner}</p></div><div><p className="text-muted-foreground">Time</p><p className="mt-1 font-medium">{r.date}</p></div></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/25 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">New visitor & enquiry</p>
                <p className="text-xs text-muted-foreground">
                  Draft saves automatically
                </p>
              </div>
              <strong className="text-sm">{progress}% complete</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {stages.map((name, i) => (
                <button
                  key={name}
                  onClick={() => setStage(i)}
                  className={`flex min-w-[140px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${i === stage ? "border-foreground bg-foreground text-background" : i < stage ? "border-brand/35 bg-brand/12" : "bg-card text-muted-foreground"}`}
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full ${i < stage ? "bg-brand text-brand-foreground" : "bg-muted/60"}`}
                  >
                    {i < stage ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-5 sm:p-7">
            <div className="mx-auto max-w-3xl animate-slide-up">
              {stage === 0 && (
                <Stage
                  title="Who is visiting?"
                  subtitle="Basic contact information is enough to create the record."
                >
                  <Field label="Full name" required>
                    <Input
                      value={draft.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="e.g. Meera Joshi"
                    />
                  </Field>
                  <Field label="Mobile number" required>
                    <Input
                      value={draft.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="10-digit number"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={draft.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="name@example.com"
                    />
                  </Field>
                </Stage>
              )}
              {stage === 1 && (
                <Stage
                  title="What brings them here?"
                  subtitle="Route the visitor to the right person without additional calls."
                >
                  <Field label="Purpose" required>
                    <Select
                      value={draft.purpose}
                      onValueChange={(v) => update("purpose", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Student enquiry">
                          Student enquiry
                        </SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Interview">Interview</SelectItem>
                        <SelectItem value="Delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Person to meet">
                    <Input
                      value={draft.person}
                      onChange={(e) => update("person", e.target.value)}
                      placeholder="Name or role"
                    />
                  </Field>
                  <Field label="Department">
                    <Input
                      value={draft.department}
                      onChange={(e) => update("department", e.target.value)}
                      placeholder="Admissions, HR…"
                    />
                  </Field>
                </Stage>
              )}
              {stage === 2 && (
                <Stage
                  title="Verify identity"
                  subtitle="Keep this optional for low-risk or returning visitors."
                >
                  <Field label="ID type">
                    <Select
                      value={draft.idType}
                      onValueChange={(v) => update("idType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                        <SelectItem value="Driving licence">
                          Driving licence
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="ID number">
                    <Input
                      value={draft.idNumber}
                      onChange={(e) => update("idNumber", e.target.value)}
                      placeholder="Last four digits are sufficient"
                    />
                  </Field>
                </Stage>
              )}
              {stage === 3 && (
                <Stage
                  title="Review & register"
                  subtitle="Add context for the team, then complete check-in."
                >
                  <div className="sm:col-span-2">
                    <Field label="Reception notes">
                      <Textarea
                        value={draft.notes}
                        onChange={(e) => update("notes", e.target.value)}
                        placeholder="Follow-up, access instructions or other context"
                        className="min-h-28"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border bg-muted/30 p-4 text-sm">
                    <p className="font-semibold">
                      {draft.name || "Unnamed visitor"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {draft.purpose || "Purpose not selected"} ·{" "}
                      {draft.person || "Meeting person not assigned"}
                    </p>
                  </div>
                </Stage>
              )}
            </div>
          </CardContent>
          <div className="sticky bottom-[65px] flex flex-col-reverse gap-2 border-t bg-card/95 p-3 backdrop-blur sm:bottom-0 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={save}>
              <Save />
              Save draft
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {stage > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStage((s) => s - 1)}
                >
                  <ArrowLeft />
                  Back
                </Button>
              )}
              {stage < 3 ? (
                <Button onClick={() => setStage((s) => s + 1)}>
                  Continue
                  <ArrowRight />
                </Button>
              ) : (
                <Button onClick={submit}>
                  <Check />
                  Register & check in
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}

function Stage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </>
  );
}
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
