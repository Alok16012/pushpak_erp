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
import { useAuth } from "@/contexts/AuthContext";
import { getEnquiries, createEnquiry, updateEnquiry, getBranches } from "@/lib/supabase/data";
import { downloadCsv } from "@/lib/export";

const records = [
  {
    id: "V-1048",
    name: "Meera Joshi",
    phone: "98765 43215",
    whatsappNumber: "98765 43215",
    purpose: "Interview",
    owner: "HR Department",
    status: "Checked in",
    date: "Today, 2:00 PM",
    source: "Walk-in",
    visitDate: new Date().toISOString(),
    followUpDate: null,
    callType: null,
  },
  {
    id: "V-1047",
    name: "Vikram Singh",
    phone: "98765 43214",
    whatsappNumber: "",
    purpose: "Delivery",
    owner: "Administration",
    status: "Completed",
    date: "Today, 12:00 PM",
    source: "Phone",
    visitDate: new Date().toISOString(),
    followUpDate: null,
    callType: null,
  },
  {
    id: "V-1046",
    name: "Priya Sharma",
    phone: "98765 43213",
    whatsappNumber: "98765 43213",
    purpose: "Admission Enquiry",
    owner: "Admissions",
    status: "Follow-up",
    date: "Today, 10:30 AM",
    source: "Website",
    visitDate: new Date().toISOString(),
    followUpDate: new Date(Date.now() + 86400000).toISOString(),
    callType: "Outgoing",
  },
  {
    id: "V-1045",
    name: "Rajesh Kumar",
    phone: "98765 43212",
    whatsappNumber: "",
    purpose: "Meeting",
    owner: "Director",
    status: "Completed",
    date: "Yesterday",
    source: "Referral",
    visitDate: new Date(Date.now() - 86400000).toISOString(),
    followUpDate: null,
    callType: null,
  },
];
const stages = ["Visitor", "Visit", "Verification", "Follow-up", "Review"];
const PURPOSES = [
  "Admission Enquiry",
  "Fee Related",
  "Meeting",
  "Complaint",
  "Delivery",
  "Interview",
  "Other",
];
const DEPARTMENTS = [
  "Administration",
  "Academics",
  "Accounts",
  "HR",
  "IT",
  "Library",
];
const ID_TYPES = ["Aadhaar", "PAN", "DL", "Voter ID", "Passport"];
const SOURCES = [
  "Walk-in",
  "Phone",
  "Website",
  "Social Media",
  "Referral",
  "Advertisement",
  "Other",
];
const CALL_TYPES = ["Incoming", "Outgoing"];

type Draft = {
  name: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  candidateName: string;
  address: string;
  registrationDate: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  person: string;
  department: string;
  idType: string;
  idNumber: string;
  source: string;
  enquiryReason: string;
  location: string;
  remarks: string;
  followUpDate: string;
  followUpTime: string;
  followUpNotes: string;
  callType: string;
  notes: string;
};
const emptyDraft: Draft = {
  name: "",
  phone: "",
  whatsappNumber: "",
  email: "",
  candidateName: "",
  address: "",
  registrationDate: new Date().toISOString().split("T")[0],
  visitDate: new Date().toISOString().split("T")[0],
  visitTime: new Date().toTimeString().slice(0, 5),
  purpose: "",
  person: "",
  department: "",
  idType: "",
  idNumber: "",
  source: "",
  enquiryReason: "",
  location: "",
  remarks: "",
  followUpDate: "",
  followUpTime: "",
  followUpNotes: "",
  callType: "",
  notes: "",
};

export default function EnquiriesWorkspace() {
  const { toast } = useToast();
  const { user } = useAuth();
  const branchId = user?.branchId || "";
  // Org-level accounts are not tied to a branch, so they pick the one the
  // visitor is checking in to before the enquiry can be written.
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [pickedBranchId, setPickedBranchId] = useState("");
  const targetBranchId = branchId || pickedBranchId;
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
    let cancelled = false;
    async function loadEnquiries() {
      try {
        const result = await getEnquiries(user?.branchId || "");
        if (!cancelled) {
          setLiveRecords(
            (result.data ?? []).map((item: Record<string, unknown>) => ({
              id: item.id as string,
              name: item.visitorName as string,
              phone: item.phone as string,
              whatsappNumber: (item.whatsapp_number as string) || "",
              purpose: (item.purpose as string).replaceAll("_", " "),
              owner: item.personToMeet as string,
              status: (item.status as string) || "Checked in",
              date: item.visitDate
                ? new Date(item.visitDate as string).toLocaleString()
                : new Date(item.createdAt as string).toLocaleString(),
              source: item.source as string,
              visitDate: item.visitDate as string,
              followUpDate: item.follow_up_date as string,
              callType: item.call_type as string,
              checkOut: item.check_out as string,
            })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Could not load enquiries",
            description: (error as Error).message,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadEnquiries();
    return () => { cancelled = true; };
  }, [toast]);
  useEffect(() => {
    if (branchId) return;
    let cancelled = false;
    getBranches(user?.organizationId || null)
      .then((result) => {
        if (cancelled) return;
        const list = (result.data ?? []).map((b: Record<string, unknown>) => ({
          id: b.id as string,
          name: b.name as string,
        }));
        setBranches(list);
        if (list.length === 1) setPickedBranchId(list[0].id);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => { cancelled = true; };
  }, [branchId, user?.organizationId]);
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
            "Fee Related": "FEE",
            Complaint: "COMPLAINT",
            "Admission Enquiry": "ADMISSION",
          } as Record<string, string>
        )[draft.purpose] || "OTHER";
      const created = await createEnquiry(targetBranchId, {
            visitorName: draft.name,
            phone: draft.phone,
            whatsappNumber: draft.whatsappNumber || undefined,
            email: draft.email || undefined,
            candidateName: draft.candidateName || undefined,
            address: draft.address || undefined,
            registrationDate: draft.registrationDate ? new Date(draft.registrationDate).toISOString() : new Date().toISOString(),
            visitDate: draft.visitDate ? new Date(draft.visitDate).toISOString() : new Date().toISOString(),
            visitTime: draft.visitTime || undefined,
            purpose,
            personToMeet: draft.person || "Reception",
            department: draft.department || "ADMINISTRATION",
            idType: draft.idType || undefined,
            idNumber: draft.idNumber || undefined,
            source: draft.source || undefined,
            enquiryReason: draft.enquiryReason || undefined,
            location: draft.location || undefined,
            remarks: draft.remarks || undefined,
            followUpDate: draft.followUpDate ? new Date(draft.followUpDate).toISOString() : undefined,
            followUpTime: draft.followUpTime || undefined,
            followUpNotes: draft.followUpNotes || undefined,
            callType: draft.callType || undefined,
            checkIn: new Date(`${draft.visitDate || new Date().toISOString().split("T")[0]} ${draft.visitTime || "00:00"}`).toISOString(),
          });
      setLiveRecords((prev) => [
        {
          id: created.data.id as unknown as string,
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
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/35 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Visitor</th>
                      <th className="px-4 py-3 font-medium">Mob. Number</th>
                      <th className="px-4 py-3 font-medium">WhatsApp</th>
                      <th className="px-4 py-3 font-medium">Purpose</th>
                      <th className="px-4 py-3 font-medium">Person to Meet</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Check-in / out</th>
                      <th className="px-4 py-3 font-medium">Follow-up</th>
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
                            {r.id}
                          </p>
                        </td>
                        <td className="px-4 py-3">{r.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {(r as any).whatsappNumber || "—"}
                        </td>
                        <td className="px-4 py-3">{r.purpose}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.owner}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(r as any).source || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="text-xs">{r.date}</div>
                          <div className="text-xs">
                            {(r as any).checkOut ? `→ ${new Date((r as any).checkOut).toLocaleString()}` : r.status === "Completed" ? "Checked out" : "Active"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(r as any).followUpDate ? new Date((r as any).followUpDate).toLocaleDateString() : "—"}
                          {(r as any).callType ? <div className="text-[10px]">{(r as any).callType}</div> : null}
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
                        <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                      <div><p className="text-muted-foreground">WhatsApp</p><p className="mt-1 font-medium">{(r as any).whatsappNumber || "—"}</p></div>
                      <div><p className="text-muted-foreground">Meeting</p><p className="mt-1 font-medium">{r.owner}</p></div>
                      <div><p className="text-muted-foreground">Source</p><p className="mt-1 font-medium">{(r as any).source || "—"}</p></div>
                      <div><p className="text-muted-foreground">Time</p><p className="mt-1 font-medium">{r.date}</p></div>
                    </div>
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
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Visitor Name *" required>
                        <Input
                          value={draft.name}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="e.g. Meera Joshi"
                        />
                      </Field>
                      <Field label="Mobile Number *" required>
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
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="WhatsApp Number">
                        <Input
                          value={draft.whatsappNumber}
                          onChange={(e) => update("whatsappNumber", e.target.value)}
                          placeholder="WhatsApp number"
                        />
                      </Field>
                      <Field label="Candidate Name">
                        <Input
                          value={draft.candidateName}
                          onChange={(e) => update("candidateName", e.target.value)}
                          placeholder="Candidate name"
                        />
                      </Field>
                      <Field label="Source">
                        <Select
                          value={draft.source}
                          onValueChange={(v) => update("source", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            {SOURCES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Registration Date">
                        <Input
                          type="date"
                          value={draft.registrationDate}
                          onChange={(e) => update("registrationDate", e.target.value)}
                        />
                      </Field>
                      <Field label="ID Type">
                        <Select
                          value={draft.idType}
                          onValueChange={(v) => update("idType", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ID_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="ID Number">
                        <Input
                          value={draft.idNumber}
                          onChange={(e) => update("idNumber", e.target.value)}
                          placeholder="Enter ID number"
                        />
                      </Field>
                    </div>

                    <Field label="Address">
                      <Textarea
                        value={draft.address}
                        onChange={(e) => update("address", e.target.value)}
                        placeholder="Full address"
                        className="min-h-20"
                      />
                    </Field>
                  </div>
                </Stage>
              )}
              {stage === 1 && (
                <Stage
                  title="What brings them here?"
                  subtitle="Route the visitor to the right person and record their enquiry details."
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Purpose of Visit *" required>
                        <Select
                          value={draft.purpose}
                          onValueChange={(v) => update("purpose", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            {PURPOSES.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Person to Meet *" required>
                        <Input
                          value={draft.person}
                          onChange={(e) => update("person", e.target.value)}
                          placeholder="Name or role"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Department *" required>
                        <Select
                          value={draft.department}
                          onValueChange={(v) => update("department", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Visit Location">
                        <Input
                          value={draft.location}
                          onChange={(e) => update("location", e.target.value)}
                          placeholder="e.g. Reception, 2nd floor"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Visit Date">
                        <Input
                          type="date"
                          value={draft.visitDate}
                          onChange={(e) => update("visitDate", e.target.value)}
                        />
                      </Field>
                      <Field label="Visit Time">
                        <Input
                          type="time"
                          value={draft.visitTime}
                          onChange={(e) => update("visitTime", e.target.value)}
                        />
                      </Field>
                    </div>

                    <Field label="Enquiry Reason">
                      <Textarea
                        value={draft.enquiryReason}
                        onChange={(e) => update("enquiryReason", e.target.value)}
                        placeholder="Describe the enquiry reason"
                        className="min-h-20"
                      />
                    </Field>

                    <Field label="Remarks">
                      <Textarea
                        value={draft.remarks}
                        onChange={(e) => update("remarks", e.target.value)}
                        placeholder="Additional remarks"
                        className="min-h-20"
                      />
                    </Field>
                  </div>
                </Stage>
              )}
              {stage === 2 && (
                <Stage
                  title="Verify identity"
                  subtitle="Record the ID proof shown by the visitor — keep it optional for low-risk or returning visitors."
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="ID Type">
                        <Select
                          value={draft.idType}
                          onValueChange={(v) => update("idType", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ID_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="ID Number">
                        <Input
                          value={draft.idNumber}
                          onChange={(e) => update("idNumber", e.target.value)}
                          placeholder="Enter ID number"
                        />
                      </Field>
                    </div>
                  </div>
                </Stage>
              )}
              {stage === 3 && (
                <Stage
                  title="Follow-up details"
                  subtitle="Plan when and how to follow up with this visitor."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Follow-up Call Date">
                      <Input
                        type="date"
                        value={draft.followUpDate}
                        onChange={(e) => update("followUpDate", e.target.value)}
                      />
                    </Field>
                    <Field label="Preferred Time">
                      <Input
                        type="time"
                        value={draft.followUpTime}
                        onChange={(e) => update("followUpTime", e.target.value)}
                      />
                    </Field>
                    <Field label="Call Type">
                      <Select
                        value={draft.callType}
                        onValueChange={(v) => update("callType", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select call type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CALL_TYPES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Follow-up Notes" className="md:col-span-2">
                      <Textarea
                        value={draft.followUpNotes}
                        onChange={(e) => update("followUpNotes", e.target.value)}
                        placeholder="What should the next call cover?"
                        className="min-h-24"
                      />
                    </Field>
                  </div>
                </Stage>
              )}
              {stage === 4 && (
                <Stage
                  title="Review & register"
                  subtitle="Add context for the team, then complete check-in."
                >
                  <div className="space-y-4">
                    {!branchId && (
                      <Field label="Branch *" required>
                        <Select
                          value={pickedBranchId}
                          onValueChange={setPickedBranchId}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                branches.length
                                  ? "Select the branch for this visit"
                                  : "No branches available"
                              }
                            />
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

                    <Field label="Reception notes">
                      <Textarea
                        value={draft.notes}
                        onChange={(e) => update("notes", e.target.value)}
                        placeholder="Follow-up, access instructions or other context"
                        className="min-h-28"
                      />
                    </Field>

                    <div className="rounded-2xl border bg-muted/30 p-4 text-sm space-y-2">
                      <div>
                        <p className="font-semibold">
                          {draft.name || "Unnamed visitor"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {draft.phone || "No phone"} · {draft.whatsappNumber || "No WhatsApp"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Purpose:</span> {draft.purpose || "—"}</div>
                        <div><span className="text-muted-foreground">Meeting:</span> {draft.person || "—"}</div>
                        <div><span className="text-muted-foreground">Department:</span> {draft.department || "—"}</div>
                        <div><span className="text-muted-foreground">Source:</span> {draft.source || "—"}</div>
                        <div><span className="text-muted-foreground">Visit:</span> {draft.visitDate || "—"} {draft.visitTime || ""}</div>
                        <div><span className="text-muted-foreground">Follow-up:</span> {draft.followUpDate || "—"} {draft.callType || ""}</div>
                      </div>
                    </div>
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
              {stage < 4 ? (
                <Button onClick={() => setStage((s) => s + 1)}>
                  Continue
                  <ArrowRight />
                </Button>
              ) : (
                <Button onClick={submit} disabled={!targetBranchId}>
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
      <div className="space-y-5">{children}</div>
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
