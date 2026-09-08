import { supabase } from "@/lib/supabase/client";

/**
 * Reception-only data access.
 *
 * Everything here was verified against the LIVE PostgREST schema, not
 * `backend/prisma/schema.prisma` (which is out of date). Two things bite here:
 *
 * 1. `visit_enquiries` is *mixed case*: most columns are camelCase
 *    (`visitorName`, `visitDate`, `followUpDate`, `whatsappNumber`) but a few
 *    are snake_case (`call_type`, `check_in`, `check_out`). Sending `callType`
 *    or `checkOut` fails with PGRST204 and the whole insert is lost.
 * 2. `purpose`, `idType`, `department` and `status` are Postgres ENUMS. Sending
 *    a human label ("Aadhaar", "Administration") fails with 22P02.
 *
 * `item_movements` is fully snake_case.
 */

/* ------------------------------------------------------------------ *
 * visit_enquiries enums (probed against the live database)
 * ------------------------------------------------------------------ */

/** enum EnquiryStatus */
export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** Human labels for the four EnquiryStatus values. */
export const ENQUIRY_STATUS_LABEL: Record<string, string> = {
  NEW: "Checked in",
  CONTACTED: "Follow-up",
  CONVERTED: "Converted",
  CLOSED: "Completed",
};

/** enum VisitPurpose */
const PURPOSE_ENUM: Record<string, string> = {
  "admission enquiry": "ADMISSION",
  "student enquiry": "ADMISSION",
  admission: "ADMISSION",
  "fee related": "FEE",
  fee: "FEE",
  meeting: "MEETING",
  complaint: "COMPLAINT",
  delivery: "DELIVERY",
  interview: "INTERVIEW",
  other: "OTHER",
};

/** enum VisitorIdType — note AADHAR (one A), DRIVING (not DL), VOTER (not "Voter ID"). */
const ID_TYPE_ENUM: Record<string, string> = {
  aadhaar: "AADHAR",
  aadhar: "AADHAR",
  pan: "PAN",
  dl: "DRIVING",
  driving: "DRIVING",
  "driving licence": "DRIVING",
  "driving license": "DRIVING",
  "voter id": "VOTER",
  voter: "VOTER",
  passport: "PASSPORT",
};

/** enum Department — EXAMINATION / SCIENCE / OTHER are NOT valid labels. */
const DEPARTMENT_ENUM: Record<string, string> = {
  administration: "ADMINISTRATION",
  academics: "ACADEMICS",
  accounts: "ACCOUNTS",
  hr: "HR",
  "human resources": "HR",
  it: "IT",
  "it department": "IT",
  library: "LIBRARY",
  sports: "SPORTS",
};

const lookup = (table: Record<string, string>, value: string | undefined, fallback: string) =>
  (value && table[value.trim().toLowerCase()]) || fallback;

export const toPurposeEnum = (label?: string) => lookup(PURPOSE_ENUM, label, "OTHER");
/** Returns `undefined` for an unknown label so the column can simply be omitted. */
export const toIdTypeEnum = (label?: string) =>
  label ? ID_TYPE_ENUM[label.trim().toLowerCase()] : undefined;
export const toDepartmentEnum = (label?: string) =>
  lookup(DEPARTMENT_ENUM, label, "ADMINISTRATION");

/* ------------------------------------------------------------------ *
 * item_movements (all snake_case)
 * ------------------------------------------------------------------ */

export type MovementRow = {
  id: string;
  branch_id: string | null;
  direction: string | null;
  item: string | null;
  item_id: string | null;
  category: string | null;
  party: string | null;
  quantity: number | null;
  department: string | null;
  status: string | null;
  courier: string | null;
  tracking: string | null;
  notes: string | null;
  dispatch_date: string | null;
  receive_date: string | null;
  created_at: string | null;
};

const MOVEMENT_COLUMNS =
  "id,branch_id,direction,item,item_id,category,party,quantity,department,status,courier,tracking,notes,dispatch_date,receive_date,created_at";

export async function getItemMovements(branchId: string | null) {
  let query = supabase
    .from("item_movements")
    .select(MOVEMENT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []) as unknown as MovementRow[] };
}

/**
 * `item_movements.id` is a plain `text primary key` with no database default,
 * unlike the other tables here, so an insert that omits it fails with
 * "null value in column id ... violates not-null constraint". The id is
 * generated here. `crypto.randomUUID` is missing on older Android webviews and
 * on any non-HTTPS origin, hence the fallback.
 */
function newMovementId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createItemMovement(
  branchId: string | null,
  input: Partial<Omit<MovementRow, "id" | "created_at">>,
) {
  const payload: Record<string, unknown> = { id: newMovementId() };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") payload[key] = value;
  }
  if (branchId) payload.branch_id = branchId;

  const { data, error } = await supabase
    .from("item_movements")
    .insert(payload)
    .select(MOVEMENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return { success: true, data: data as unknown as MovementRow };
}

export async function updateItemMovement(id: string, input: Partial<MovementRow>) {
  const { data, error } = await supabase
    .from("item_movements")
    .update(input)
    .eq("id", id)
    .select(MOVEMENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return { success: true, data: data as unknown as MovementRow };
}

export async function deleteItemMovement(id: string) {
  const { error } = await supabase.from("item_movements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/* ------------------------------------------------------------------ *
 * Small formatting guards — async data arrives partial, and
 * `new Date(undefined).toLocaleString()` renders the string "Invalid Date".
 * ------------------------------------------------------------------ */

const valid = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDate(value: unknown, fallback = "—") {
  const date = valid(value);
  return date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : fallback;
}

export function formatDateTime(value: unknown, fallback = "—") {
  const date = valid(value);
  return date
    ? date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : fallback;
}

export function formatTime(value: unknown, fallback = "—") {
  const date = valid(value);
  return date ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : fallback;
}

/** True when the timestamp falls on the local "today". */
export function isToday(value: unknown) {
  const date = valid(value);
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** `"2024-01-24"` + `"09:30"` -> ISO string, falling back to now when unparseable. */
export function toIsoTimestamp(date?: string, time?: string) {
  const parsed = valid(`${date || ""}T${time || "00:00"}`);
  return (parsed || new Date()).toISOString();
}

/** Initials for an avatar, safe against null/blank names arriving from the API. */
export function initials(name: unknown, fallback = "?") {
  const text = typeof name === "string" ? name.trim() : "";
  if (!text) return fallback;
  return (
    text
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || fallback
  );
}
