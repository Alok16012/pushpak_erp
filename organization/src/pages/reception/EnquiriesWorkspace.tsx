import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  getEnquiries,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getBranches,
} from "@/lib/supabase/data";
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABEL,
  formatDate,
  formatDateTime,
  isToday,
  toDepartmentEnum,
  toIdTypeEnum,
  toIsoTimestamp,
  toPurposeEnum,
} from "@/lib/supabase/reception";
import { downloadCsv } from "@/lib/export";

/**
 * One row of the visitor log, already flattened out of `visit_enquiries`.
 * `status` holds the raw EnquiryStatus enum value — labels come from
 * ENQUIRY_STATUS_LABEL so filtering and writing use the same vocabulary.
 */
type EnquiryRow = {
  id: string;
  /** The row's own branchId — updateEnquiry/deleteEnquiry filter on it. */
  branchIdRef: string;
  name: string;
  phone: string;
  whatsappNumber: string;
  purpose: string;
  owner: string;
  status: string;
  date: string;
  source: string;
  visitDate: string | null;
  followUpDate: string | null;
  callType: string;
  checkOut: string | null;
};

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const branchId = user?.branchId || "";
  // Org-level accounts are not tied to a branch, so they pick the one the
  // visitor is checking in to before the enquiry can be written.
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(!branchId);
  const [pickedBranchId, setPickedBranchId] = useState("");
  const targetBranchId = branchId || pickedBranchId;
  const [mode, setMode] = useState<"list" | "form">("list");
  const [stage, setStage] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [liveRecords, setLiveRecords] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  /** Live counters — previously hardcoded to "3" / "18" / "5". */
  const stats = useMemo(
    () => [
      {
        label: "On premises",
        value: String(liveRecords.filter((r) => r.status !== "CLOSED" && !r.checkOut).length),
        icon: UserRoundCheck,
      },
      {
        label: "Visitors today",
        value: String(liveRecords.filter((r) => isToday(r.visitDate)).length),
        icon: Users,
      },
      {
        label: "Need follow-up",
        value: String(
          liveRecords.filter((r) => r.status === "CONTACTED" || Boolean(r.followUpDate)).length,
        ),
        icon: ArrowRight,
      },
    ],
    [liveRecords],
  );
  const purposes = useMemo(
    () => Array.from(new Set(liveRecords.map((r) => r.purpose))).filter(Boolean),
    [liveRecords],
  );
  const owners = useMemo(
    () => Array.from(new Set(liveRecords.map((r) => r.owner))).filter(Boolean),
    [liveRecords],
  );
  /** Optimistic status change, rolled back if the write is rejected. */
  const setRecordStatus = async (row: EnquiryRow, next: string) => {
    const previous = row.status;
    setLiveRecords((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      await updateEnquiry(row.id, row.branchIdRef || targetBranchId, { status: next });
      toast({
        title: `Marked ${(ENQUIRY_STATUS_LABEL[next] || next).toLowerCase()}`,
        description: `${row.name || "Visitor"} was updated.`,
      });
    } catch (error) {
      setLiveRecords((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: previous } : r)));
      toast({
        title: "Could not update status",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };
  const removeRecord = async (row: EnquiryRow) => {
    if (!window.confirm(`Remove ${row.name || "this visitor"} from the log? This cannot be undone.`)) return;
    const snapshot = liveRecords;
    setLiveRecords((prev) => prev.filter((r) => r.id !== row.id));
    try {
      await deleteEnquiry(row.id, row.branchIdRef || targetBranchId);
      toast({ title: "Entry removed", description: `${row.name || "Visitor"} was taken off the log.` });
    } catch (error) {
      setLiveRecords(snapshot);
      toast({
        title: "Could not remove entry",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
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
        WhatsApp: r.whatsappNumber,
        Purpose: r.purpose,
        Meeting: r.owner,
        Source: r.source,
        Status: ENQUIRY_STATUS_LABEL[r.status] || r.status,
        "Check-in": r.date,
        "Check-out": r.checkOut ? formatDateTime(r.checkOut, "") : "",
        "Follow-up": r.followUpDate ? formatDate(r.followUpDate, "") : "",
        "Call type": r.callType,
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
  /**
   * `visit_enquiries` is mixed-case in the live database: most columns are
   * camelCase but `call_type` / `check_in` / `check_out` are snake_case. Reading
   * `follow_up_date` or `callType` (as this did) always yielded undefined.
   */
  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEnquiries(branchId || null, 1, 200);
      setLiveRecords(
        (result.data ?? []).map((item: Record<string, unknown>): EnquiryRow => ({
          id: String(item.id ?? ""),
          branchIdRef: String(item.branchId ?? ""),
          name: String(item.visitorName ?? "Unnamed visitor"),
          phone: String(item.phone ?? ""),
          whatsappNumber: String(item.whatsappNumber ?? item.whatsapp_number ?? ""),
          purpose: String(item.purpose ?? "OTHER").replace(/_/g, " "),
          owner: String(item.personToMeet ?? ""),
          status: String(item.status ?? "NEW"),
          date: formatDateTime(item.visitDate ?? item.createdAt),
          source: String(item.source ?? ""),
          visitDate: (item.visitDate as string) ?? null,
          followUpDate: (item.followUpDate as string) ?? null,
          callType: String(item.call_type ?? ""),
          checkOut: (item.check_out as string) ?? null,
        })),
      );
    } catch (error) {
      toast({
        title: "Could not load enquiries",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [branchId, toast]);
  useEffect(() => {
    void loadEnquiries();
  }, [loadEnquiries]);
  /** Branch list for the final step. `getBranches` returns { success, data }. */
  const loadBranches = useCallback(async () => {
    if (branchId) return;
    setBranchesLoading(true);
    try {
      const result = await getBranches(user?.organizationId || null);
      const list = (result.data ?? [])
        .map((b: Record<string, unknown>) => ({
          id: String(b.id ?? ""),
          name: String(b.name ?? "Unnamed branch"),
        }))
        // Radix Select items must have a non-empty value.
        .filter((b) => b.id);
      setBranches(list);
      if (list.length === 1) setPickedBranchId(list[0].id);
    } catch (error) {
      setBranches([]);
      toast({
        title: "Could not load branches",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setBranchesLoading(false);
    }
  }, [branchId, user?.organizationId, toast]);
  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);
  const save = () =>
    toast({
      title: "Draft saved",
      description: `Your enquiry is ${progress}% complete. You can resume it anytime.`,
    });
  const submit = async () => {
    if (!targetBranchId) {
      toast({
        title: "Branch required",
        description: branches.length
          ? "Pick the branch this visitor is checking in to."
          : "No branches exist yet — create one at Branches > Create branch first.",
        variant: "destructive",
      });
      return;
    }
    if (!draft.name.trim() || !draft.phone.trim()) {
      setStage(0);
      toast({
        title: "Visitor name and mobile number are required",
        description: "Both are on the first step.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // `visit_enquiries` has no `notes` column, so the reception notes are
      // folded into `remarks` rather than being silently dropped.
      const remarks = [draft.remarks.trim(), draft.notes.trim() && `Reception notes: ${draft.notes.trim()}`]
        .filter(Boolean)
        .join("\n");
      await createEnquiry(targetBranchId, {
        visitorName: draft.name.trim(),
        phone: draft.phone.trim(),
        whatsappNumber: draft.whatsappNumber || undefined,
        email: draft.email || undefined,
        candidateName: draft.candidateName || undefined,
        address: draft.address || undefined,
        registrationDate: toIsoTimestamp(draft.registrationDate),
        visitDate: toIsoTimestamp(draft.visitDate),
        visitTime: draft.visitTime || undefined,
        purpose: toPurposeEnum(draft.purpose),
        personToMeet: draft.person || "Reception",
        // Department is a Postgres enum: "Administration" is rejected (22P02).
        department: toDepartmentEnum(draft.department),
        // ID type is a Postgres enum too: AADHAR / PAN / DRIVING / VOTER / PASSPORT.
        idType: toIdTypeEnum(draft.idType),
        idNumber: draft.idNumber || undefined,
        source: draft.source || undefined,
        enquiryReason: draft.enquiryReason || undefined,
        location: draft.location || undefined,
        remarks: remarks || undefined,
        followUpDate: draft.followUpDate ? toIsoTimestamp(draft.followUpDate) : undefined,
        followUpTime: draft.followUpTime || undefined,
        followUpNotes: draft.followUpNotes || undefined,
        status: "NEW",
        // snake_case in the live schema — `callType` / `checkIn` fail PGRST204.
        call_type: draft.callType || undefined,
        check_in: toIsoTimestamp(draft.visitDate, draft.visitTime),
      });
      toast({
        title: "Visitor registered",
        description: "The reception log and enquiry record were created together.",
      });
      setDraft(emptyDraft);
      setStage(0);
      setMode("list");
      localStorage.removeItem("reception-enquiry-draft");
      await loadEnquiries();
    } catch (error) {
      toast({
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
            {stats.map((item) => (
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
                    {ENQUIRY_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ENQUIRY_STATUS_LABEL[value]}
                      </SelectItem>
                    ))}
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
                          {r.whatsappNumber || "—"}
                        </td>
                        <td className="px-4 py-3">{r.purpose}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.owner}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.source || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="text-xs">{r.date}</div>
                          <div className="text-xs">
                            {r.checkOut
                              ? `→ ${formatDateTime(r.checkOut)}`
                              : r.status === "CLOSED"
                                ? "Checked out"
                                : "Active"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(r.followUpDate)}
                          {r.callType ? <div className="text-[10px]">{r.callType}</div> : null}
                        </td>
                        <td className="px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => void setRecordStatus(r, "NEW")}>
                                Mark checked in
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void setRecordStatus(r, "CONTACTED")}>
                                Flag for follow-up
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void setRecordStatus(r, "CLOSED")}>
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
                                onSelect={() => void removeRecord(r)}
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
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${r.status === "NEW" ? "bg-brand text-brand-foreground" : r.status === "CONTACTED" ? "bg-amber-500/15 text-amber-600" : "bg-muted"}`}>{ENQUIRY_STATUS_LABEL[r.status] || r.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                      <div><p className="text-muted-foreground">WhatsApp</p><p className="mt-1 font-medium">{r.whatsappNumber || "—"}</p></div>
                      <div><p className="text-muted-foreground">Meeting</p><p className="mt-1 font-medium">{r.owner}</p></div>
                      <div><p className="text-muted-foreground">Source</p><p className="mt-1 font-medium">{r.source || "—"}</p></div>
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
                        {branchesLoading ? (
                          <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
                            Loading branches…
                          </p>
                        ) : branches.length ? (
                          <Select
                            value={pickedBranchId}
                            onValueChange={setPickedBranchId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select the branch for this visit" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
                            <p className="text-sm font-medium">
                              No branches have been created yet.
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Every visitor record has to belong to a branch, so check-in
                              stays disabled until at least one exists. Create one, then
                              come back — your draft is saved.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  save();
                                  navigate("/branch/create");
                                }}
                              >
                                <Plus />
                                Create a branch
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void loadBranches()}
                                disabled={branchesLoading}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        )}
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
                <div className="flex flex-col items-stretch gap-1 sm:items-end">
                  <Button onClick={() => void submit()} disabled={!targetBranchId || submitting}>
                    <Check />
                    {submitting ? "Registering…" : "Register & check in"}
                  </Button>
                  {!targetBranchId && !branchesLoading && (
                    <span className="text-[11px] text-muted-foreground">
                      {branches.length
                        ? "Pick a branch above to enable check-in."
                        : "Disabled until a branch exists — create one above."}
                    </span>
                  )}
                </div>
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
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
