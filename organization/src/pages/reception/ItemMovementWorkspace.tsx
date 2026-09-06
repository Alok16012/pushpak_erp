import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Check, Download, Filter, MoreHorizontal, Package, Plus, Save, Search, SlidersHorizontal, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv } from "@/lib/export";
import {
  createItemMovement,
  deleteItemMovement,
  formatDateTime,
  getItemMovements,
  isToday,
  updateItemMovement,
  type MovementRow,
} from "@/lib/supabase/reception";

interface Movement {
  id: string;
  direction: string;
  item: string;
  itemId: string;
  category: string;
  party: string;
  qty: number;
  department: string;
  status: string;
  date: string;
  courier: string;
  tracking: string;
  notes: string;
  dispatchDate?: string;
  receiveDate?: string;
}

const STATUSES = ["Completed", "In transit", "Needs review", "Pending pickup"];
/** Statuses that put a row in the "Need attention" tile. */
const ATTENTION = ["Needs review", "Pending pickup"];

/**
 * `item_movements` is a real, fully snake_case table in the live database.
 * This screen used to keep a hardcoded SEED array in localStorage, so nothing
 * a receptionist recorded was ever visible to anyone else. It now reads and
 * writes the table; localStorage is kept only as a paint cache so the list is
 * not blank on the first frame.
 *
 * Note: `item_movements` has no `description` or `phone` column, so those two
 * form fields are folded into `notes` instead of being silently dropped.
 */
const fromRow = (row: MovementRow): Movement => ({
  id: String(row.id),
  direction: row.direction || "Received",
  item: row.item || "Unnamed item",
  itemId: row.item_id || "—",
  category: row.category || "—",
  party: row.party || "—",
  qty: Number(row.quantity ?? 0),
  department: row.department || "General",
  status: row.status || "Completed",
  date: formatDateTime(row.created_at),
  courier: row.courier || "",
  tracking: row.tracking || "",
  notes: row.notes || "",
  dispatchDate: row.dispatch_date || undefined,
  receiveDate: row.receive_date || undefined,
});

const STORAGE_KEY = "erp-item-movements";
const DRAFT_KEY = "movement-draft";

const stages = ["Movement", "Item", "Logistics", "Review"];
type Draft = {
  direction: string;
  item: string;
  itemId: string;
  category: string;
  description: string;
  qty: string;
  party: string;
  phone: string;
  department: string;
  courier: string;
  tracking: string;
  notes: string;
  dispatchDate: string;
  receiveDate: string;
};

const blankDraft: Draft = {
  direction: "",
  item: "",
  itemId: "",
  category: "",
  description: "",
  qty: "",
  party: "",
  phone: "",
  department: "",
  courier: "",
  tracking: "",
  notes: "",
  dispatchDate: "",
  receiveDate: "",
};

export default function ItemMovementWorkspace() {
  const { toast } = useToast();
  const { branchId } = useAuth();
  const [movements, setMovements] = useState<Movement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as Movement[];
    } catch { /* fall through */ }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [stage, setStage] = useState(0);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) return { ...blankDraft, ...JSON.parse(stored) };
    } catch { /* fall through */ }
    return blankDraft;
  });

  const setDraftField = (k: keyof Draft, v: string) => setDraft((p) => ({ ...p, [k]: v }));
  const filled = Object.values(draft).filter(Boolean).length;
  const progress = Math.round(filled / Object.keys(draft).length * 100);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getItemMovements(branchId);
      setMovements((result.data ?? []).map(fromRow));
    } catch (error) {
      toast({
        title: "Could not load the movement register",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [branchId, toast]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(movements)); }, [movements]);
  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }, [draft]);

  const departments = useMemo(() => Array.from(new Set(movements.map((r) => r.department).filter(Boolean))).sort(), [movements]);
  const rows = useMemo(() => movements.filter((r) =>
    (direction === "all" || r.direction === direction) &&
    (department === "all" || r.department === department) &&
    (status === "all" || r.status === status) &&
    Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase())
  ), [movements, query, direction, department, status]);

  const tiles = [
    { l: "Received today", v: String(movements.filter((r) => r.direction === "Received" && isToday(r.receiveDate)).length), i: ArrowDownLeft },
    { l: "Dispatched today", v: String(movements.filter((r) => r.direction === "Dispatched" && isToday(r.dispatchDate)).length), i: ArrowUpRight },
    { l: "Need attention", v: String(movements.filter((r) => ATTENTION.includes(r.status)).length), i: Package },
  ];

  const clearFilters = () => { setQuery(""); setDirection("all"); setDepartment("all"); setStatus("all") };

  const save = () => toast({ title: "Movement saved as draft", description: `${progress}% complete - safe to continue later.` });

  const submit = async () => {
    if (!draft.item.trim()) {
      setStage(1);
      toast({ title: "Item name required", description: "Go back to the Item step and name what is moving.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // No `description` / `phone` columns exist, so keep them in `notes`.
      const notes = [
        draft.notes.trim(),
        draft.description.trim() && `Description: ${draft.description.trim()}`,
        draft.phone.trim() && `Contact: ${draft.phone.trim()}`,
      ].filter(Boolean).join("\n");
      const created = await createItemMovement(branchId, {
        direction: draft.direction || "Received",
        item: draft.item.trim(),
        item_id: draft.itemId || undefined,
        category: draft.category || undefined,
        party: draft.party || undefined,
        quantity: Number(draft.qty) || 0,
        department: draft.department || undefined,
        status: draft.direction === "Dispatched" ? "In transit" : "Completed",
        courier: draft.courier || undefined,
        tracking: draft.tracking || undefined,
        notes: notes || undefined,
        dispatch_date: draft.dispatchDate || undefined,
        receive_date: draft.receiveDate || undefined,
      });
      if (created.data) setMovements((list) => [fromRow(created.data), ...list]);
      else await load();
      toast({ title: "Movement recorded", description: `${draft.item.trim()} was added to the shared register.` });
      setDraft(blankDraft);
      setMode("list");
      setStage(0);
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      toast({
        title: "Could not record the movement",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /** Optimistic status change, rolled back when the write is rejected. */
  const changeStatus = async (row: Movement, next: string) => {
    setMovements((list) => list.map((m) => (m.id === row.id ? { ...m, status: next } : m)));
    try {
      await updateItemMovement(row.id, { status: next });
      toast({ title: "Status updated", description: `${row.item} is now ${next.toLowerCase()}.` });
    } catch (error) {
      setMovements((list) => list.map((m) => (m.id === row.id ? { ...m, status: row.status } : m)));
      toast({
        title: "Status not saved",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const removeMovement = async (row: Movement) => {
    if (!window.confirm(`Delete "${row.item}" from the movement register? This cannot be undone.`)) return;
    const snapshot = movements;
    setMovements((list) => list.filter((m) => m.id !== row.id));
    try {
      await deleteItemMovement(row.id);
      toast({ title: "Entry removed", description: `${row.item} was deleted from the register.` });
    } catch (error) {
      setMovements(snapshot);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const exportRows = () => {
    if (!rows.length) {
      toast({ title: "Nothing to export", description: "No movements match the current filters.", variant: "destructive" });
      return;
    }
    downloadCsv(
      "item-movements.csv",
      rows.map((r) => ({
        Reference: r.id,
        Direction: r.direction,
        Item: r.item,
        "Item ID": r.itemId,
        Category: r.category,
        Quantity: r.qty,
        Party: r.party,
        Department: r.department,
        Status: r.status,
        Courier: r.courier,
        Tracking: r.tracking,
        "Dispatch date": r.dispatchDate || "",
        "Receive date": r.receiveDate || "",
        Recorded: r.date,
        Notes: r.notes,
      })),
    );
    toast({ title: "Register exported", description: `${rows.length} rows written to CSV.` });
  };

  return (
    <AppLayout>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Reception</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-.04em]">Item movement</h1>
          <p className="mt-1 text-sm text-muted-foreground">A single register for everything received and dispatched.</p>
        </div>
        {mode === "list"
          ? <Button onClick={() => setMode("form")}><Plus />Record movement</Button>
          : <Button variant="outline" onClick={() => setMode("list")}><X />Close form</Button>
        }
      </div>
      {mode === "list" ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {tiles.map((x) => (
              <Card key={x.l}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{x.l}</p>
                    <p className="mt-1 text-2xl font-semibold">{x.v}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><x.i className="h-4 w-4" /></span>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, party, tracking or department..." className="pl-9" />
                </div>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="md:w-44">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All movements</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Dispatched">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters((f) => !f)}>
                  <SlidersHorizontal />More filters
                </Button>
                <Button variant="outline" onClick={exportRows} disabled={!rows.length}>
                  <Download />Export
                </Button>
              </div>
              {showFilters && (
                <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 md:flex-row md:items-center">
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="md:w-52">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="md:w-52">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" onClick={clearFilters}><X />Clear</Button>
                  <span className="text-xs text-muted-foreground md:ml-auto">{rows.length} of {movements.length} movements</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/35 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Movement</th>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Item ID</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Party</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/25">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${r.direction === "Received" ? "bg-emerald-500/12 text-emerald-600" : "bg-violet-500/12 text-violet-600"}`}>
                            {r.direction === "Received" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {r.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.item}</p>
                          <p className="text-xs text-muted-foreground">{r.id}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{r.itemId}</td>
                        <td className="px-4 py-3 capitalize">{r.category}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{r.qty}</span>
                        </td>
                        <td className="px-4 py-3">{r.party}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{r.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUSES.map((s) => (
                                <DropdownMenuItem key={s} disabled={r.status === s} onSelect={() => void changeStatus(r, s)}>
                                  Mark as {s.toLowerCase()}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => void removeMovement(r)}>
                                Delete entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">{loading ? "Loading the movement register…" : "No movements recorded yet."}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/25 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Record item movement</p>
                <p className="text-xs text-muted-foreground">Draft saves automatically</p>
              </div>
              <strong className="text-sm">{progress}% complete</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {stages.map((s, i) => (
                <button key={s} onClick={() => setStage(i)} className={`flex min-w-[140px] items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${stage === i ? "border-foreground bg-foreground text-background" : i < stage ? "bg-brand/12" : "bg-card text-muted-foreground"}`}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-muted/60">{i < stage ? <Check className="h-3 w-3" /> : i + 1}</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-5 sm:p-7">
            <div className="mx-auto max-w-3xl animate-slide-up">
              {stage === 0 && (
                <Step title="Which way is it moving?" sub="One register, with direction captured at the start.">
                  <button onClick={() => setDraftField("direction", "Received")} className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${draft.direction === "Received" ? "border-emerald-500 bg-emerald-500/10" : "bg-card"}`}>
                    <ArrowDownLeft className="mb-5 h-6 w-6 text-emerald-500" />
                    <p className="font-semibold">Received</p>
                    <p className="mt-1 text-sm text-muted-foreground">An item has arrived at the institution</p>
                  </button>
                  <button onClick={() => setDraftField("direction", "Dispatched")} className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${draft.direction === "Dispatched" ? "border-violet-500 bg-violet-500/10" : "bg-card"}`}>
                    <ArrowUpRight className="mb-5 h-6 w-6 text-violet-500" />
                    <p className="font-semibold">Dispatched</p>
                    <p className="mt-1 text-sm text-muted-foreground">An item is leaving the institution</p>
                  </button>
                </Step>
              )}
              {stage === 1 && (
                <Step title="What is the item?" sub="Capture only the information needed to identify it.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* There is no items/inventory table in the database, so a
                        fixed ITM-001…ITM-005 dropdown was pure fiction. */}
                    <Field label="Item ID / reference">
                      <Input value={draft.itemId} onChange={(e) => setDraftField("itemId", e.target.value)} placeholder="e.g. ITM-1043 (optional)" />
                    </Field>
                    <Field label="Item based Section / Category">
                      <Select value={draft.category} onValueChange={(v) => setDraftField("category", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stationery">Stationery</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="books">Books & Journals</SelectItem>
                          <SelectItem value="chemicals">Chemicals / Lab</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="certificates">Certificates</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Item name">
                    <Input value={draft.item} onChange={(e) => setDraftField("item", e.target.value)} placeholder="e.g. Student certificates" />
                  </Field>
                  <Field label="Quantity">
                    <Input type="number" value={draft.qty} onChange={(e) => setDraftField("qty", e.target.value)} placeholder="0" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <Textarea value={draft.description} onChange={(e) => setDraftField("description", e.target.value)} placeholder="Short description or contents" />
                    </Field>
                  </div>
                </Step>
              )}
              {stage === 2 && (
                <Step title="Where is it going?" sub="Sender fields adapt naturally to the movement direction.">
                  <Field label={draft.direction === "Received" ? "Sender" : "Recipient"}>
                    <Input value={draft.party} onChange={(e) => setDraftField("party", e.target.value)} placeholder="Person or organisation" />
                  </Field>
                  <Field label="Phone">
                    <Input value={draft.phone} onChange={(e) => setDraftField("phone", e.target.value)} placeholder="Contact number" />
                  </Field>
                  <Field label="Department">
                    <Input value={draft.department} onChange={(e) => setDraftField("department", e.target.value)} placeholder="Responsible department" />
                  </Field>
                  {draft.direction === "Dispatched" && (
                    <Field label="Dispatch Date">
                      <Input type="date" value={draft.dispatchDate} onChange={(e) => setDraftField("dispatchDate", e.target.value)} />
                    </Field>
                  )}
                  {draft.direction === "Received" && (
                    <Field label="Receive Date">
                      <Input type="date" value={draft.receiveDate} onChange={(e) => setDraftField("receiveDate", e.target.value)} />
                    </Field>
                  )}
                  <Field label="Courier">
                    <Input value={draft.courier} onChange={(e) => setDraftField("courier", e.target.value)} placeholder="Optional" />
                  </Field>
                  <Field label="Tracking number">
                    <Input value={draft.tracking} onChange={(e) => setDraftField("tracking", e.target.value)} placeholder="Optional" />
                  </Field>
                </Step>
              )}
              {stage === 3 && (
                <Step title="Review & record" sub="Confirm the movement before it enters the register.">
                  <div className="sm:col-span-2 rounded-2xl border bg-muted/30 p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{draft.direction || "Direction not selected"}</p>
                    <p className="mt-2 text-lg font-semibold">{draft.item || "Unnamed item"} <span className="text-sm font-normal text-muted-foreground">x {draft.qty || "0"}</span></p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {draft.itemId ? `ID: ${draft.itemId}` : ""}
                      {draft.itemId && draft.category ? " · " : ""}
                      {draft.category ? `Category: ${draft.category}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{draft.party || "Party not added"} - {draft.department || "No department"}</p>
                    {draft.dispatchDate && <p className="mt-1 text-xs text-muted-foreground">Dispatched: {draft.dispatchDate}</p>}
                    {draft.receiveDate && <p className="mt-1 text-xs text-muted-foreground">Received: {draft.receiveDate}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Notes">
                      <Textarea value={draft.notes} onChange={(e) => setDraftField("notes", e.target.value)} placeholder="Condition, pickup instructions or exceptions" />
                    </Field>
                  </div>
                </Step>
              )}
            </div>
          </CardContent>
          <div className="sticky bottom-0 flex items-center justify-between border-t bg-card/95 p-4">
            <Button variant="ghost" onClick={save}><Save />Save draft</Button>
            <div className="flex gap-2">
              {stage > 0 && <Button variant="outline" onClick={() => setStage((s) => s - 1)}><ArrowLeft />Back</Button>}
              {stage < 3
                ? <Button onClick={() => setStage((s) => s + 1)}>Continue<ArrowRight /></Button>
                : <Button onClick={() => void submit()} disabled={submitting}><Check />{submitting ? "Recording…" : "Record movement"}</Button>
              }
            </div>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
