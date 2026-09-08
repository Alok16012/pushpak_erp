import { supabase, supabaseUrl } from "./client";
import { KNOWN_COURSE_CATEGORIES } from "../courseCategories";
import { newId, nowIso } from "../id";
import {
  createInvoiceRow,
  listInvoices,
  updateInvoiceRow,
  type CreateInvoiceInput,
} from "./studentFee";

/* ============================
   AUTH
   ============================ */

export async function loginWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email,
    role: user.user_metadata?.role || "STAFF",
    userType: user.user_metadata?.userType || "BRANCH",
    organizationId: user.user_metadata?.organizationId || null,
    branchId: user.user_metadata?.branchId || null,
  };
}

export async function signUp(email: string, password: string, metadata: Record<string, unknown>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ============================
   DASHBOARD
   ============================ */

export async function getDashboardStats(branchId: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const orgId = branchId ? await getOrgIdForBranch(branchId) : null;

  const studentsQuery = supabase.from("students").select("*", { count: "exact", head: true }).eq("isActive", true).is("deletedAt", null);
  if (branchId) studentsQuery.eq("branchId", branchId);

  const enquiriesQuery = supabase.from("visit_enquiries").select("*", { count: "exact", head: true }).gte("createdAt", today);
  if (branchId) enquiriesQuery.eq("branchId", branchId);

  // The live `FeeStatus` enum is DUE | PARTIAL | PAID | VOID. Filtering on
  // "PENDING"/"OVERDUE" made Postgres reject this query with 22P02, so
  // `dueRes.data` came back null and outstanding fees always read zero.
  const dueQuery = supabase.from("fee_invoices").select("totalAmount,paidAmount").in("status", ["DUE", "PARTIAL"]);
  if (branchId) dueQuery.eq("branchId", branchId);

  const attendanceQuery = supabase.from("attendance_records").select("status").eq("date", today);

  const paymentsQuery = supabase.from("fee_payments").select("amount").gte("paidAt", monthStart);
  if (branchId) paymentsQuery.eq("branchId", branchId);

  const coursesQuery = supabase.from("courses").select("*", { count: "exact", head: true }).eq("isActive", true).is("deletedAt", null);
  if (orgId) coursesQuery.eq("organizationId", orgId);

  const [
    studentsRes,
    enquiriesRes,
    dueRes,
    attendanceRes,
    paymentsRes,
    coursesRes,
  ] = await Promise.all([
    studentsQuery,
    enquiriesQuery,
    dueQuery,
    attendanceQuery,
    paymentsQuery,
    coursesQuery,
  ]);

  // Outstanding is what is still owed, not what was billed: a PARTIAL invoice
  // counts only its unpaid remainder.
  const outstanding = (dueRes.data || []).reduce(
    (sum, inv: any) => sum + Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)),
    0,
  );

  const attendanceTotal = (attendanceRes.data || []).length;
  const present = (attendanceRes.data || []).filter((r: any) => r.status === "PRESENT" || r.status === "LATE").length;
  const feesCollected = (paymentsRes.data || []).reduce((s, p) => s + Number(p.amount), 0);

  return {
    success: true,
    data: {
      students: studentsRes.count || 0,
      enquiriesToday: enquiriesRes.count || 0,
      outstanding,
      feesCollected,
      courses: coursesRes.count || 0,
      attendancePercentage: attendanceTotal ? Math.round((present / attendanceTotal) * 1000) / 10 : 0,
      attendance: (attendanceRes.data || []).reduce((acc: any, r: any) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

async function getOrgIdForBranch(branchId: string | null): Promise<string | null> {
  if (!branchId) return null;
  const { data } = await supabase.from("branches").select("organizationId").eq("id", branchId).single();
  return data?.organizationId || null;
}

/* ============================
   STUDENTS
   ============================ */

export async function getStudents(branchId: string | null, page = 1, limit = 20, search?: string) {
  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
    .is("deletedAt", null)
    .order("createdAt", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (branchId) query = query.eq("branchId", branchId);

  if (search) {
    query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phone.ilike.%${search}%,enrollmentNo.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [], meta: { page, limit, total: count || 0 } };
}

export async function getStudent(id: string, branchId: string | null) {
  // `.single()` returns a builder with no `.eq`, so every branch-scoped filter
  // has to be applied before it or the call throws "query.eq is not a function".
  let query = supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .is("deletedAt", null);
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

/**
 * Application numbers read `APP-<year>-<0001>`. `students.applicationNo` carries
 * a global unique index, so the counter is global rather than per branch, and is
 * derived from the highest number already issued this year - PostgREST gives us
 * no sequence to draw from. Two admissions saved in the same instant would
 * collide; the unique index rejects the second one and `createStudent` retries.
 */
export async function nextApplicationNo() {
  const prefix = `APP-${new Date().getFullYear()}-`;
  const { data, error } = await supabase
    .from("students")
    .select("applicationNo")
    .like("applicationNo", `${prefix}%`)
    .order("applicationNo", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const last = (data?.[0]?.applicationNo as string | undefined) ?? "";
  const counter = Number(last.slice(prefix.length)) || 0;
  return `${prefix}${String(counter + 1).padStart(4, "0")}`;
}

export async function createStudent(branchId: string, input: Record<string, unknown>) {
  // A caller that already carries its own number keeps it; everyone else gets
  // one issued here, so no admission route can save a student without one.
  for (let attempt = 0; attempt < 3; attempt++) {
    const applicationNo = (input.applicationNo as string) || (await nextApplicationNo());
    const { data, error } = await supabase
      .from("students")
      .insert({ ...input, applicationNo, branchId })
      .select("*")
      .single();
    if (!error) return { success: true, data };
    // 23505 is a unique violation - another admission took the number first.
    const raced = error.code === "23505" && !input.applicationNo;
    if (!raced || attempt === 2) throw new Error(error.message);
  }
  throw new Error("Could not allocate an application number");
}

export async function updateStudent(id: string, branchId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("students").update(input).eq("id", id).eq("branchId", branchId).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function deleteStudent(id: string, branchId: string) {
  const { error } = await supabase.from("students").update({ deletedAt: new Date().toISOString() }).eq("id", id).eq("branchId", branchId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getStudentPortal(id: string, branchId: string) {
  // `.single()` returns a builder with no `.eq`, so every branch-scoped filter
  // has to be applied before it or the call throws "query.eq is not a function".
  let query = supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .is("deletedAt", null);
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

/* ============================
   COURSES & BATCHES
   ============================ */

/**
 * The `courses` table stores a duration as value + unit, but the screens work
 * in whole months. Expose both so neither side has to know about the other.
 */
const MONTHS_PER_UNIT: Record<string, number> = { DAYS: 1 / 30, WEEKS: 0.25, MONTHS: 1, YEARS: 12 };

function mapCourse(row: Record<string, unknown>): Record<string, any> {
  const value = Number(row.durationValue) || 0;
  const unit = String(row.durationUnit || "MONTHS").toUpperCase();
  return {
    ...row,
    durationMonths: Math.max(1, Math.round(value * (MONTHS_PER_UNIT[unit] ?? 1))),
  };
}

export async function getCourses(organizationId: string | null) {
  let query = supabase
    .from("courses")
    .select("*")
    .is("deletedAt", null)
    .order("name");
  if (organizationId) query = query.eq("organizationId", organizationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map(mapCourse) };
}

/**
 * `courses.category` is still the `CourseCategory` enum on databases where
 * `course-category-free-text.sql` has not been run, and Postgres rejects
 * anything outside its seven members with 22P02. The raw message names the
 * type, not the field, so translate it.
 */
function describeCategoryRejection(error: { code?: string; message?: string }): string {
  if (error.code !== "22P02" || !/CourseCategory/.test(error.message || "")) {
    return error.message || "Could not save the course";
  }
  const typed = error.message?.match(/: "([^"]*)"/)?.[1] ?? "";
  return `"${typed}" is not one of the categories this database accepts yet. Run supabase/schema/course-category-free-text.sql to allow typed categories, or pick one of: ${KNOWN_COURSE_CATEGORIES.join(", ")}.`;
}

export async function createCourse(organizationId: string | null, input: Record<string, unknown>) {
  const { durationMonths, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest, organizationId };
  // Callers speak months; the column pair is what actually exists.
  if (payload.durationValue === undefined) {
    payload.durationValue = Number(durationMonths) || 1;
    payload.durationUnit = "MONTHS";
  }
  const { data, error } = await supabase.from("courses").insert(payload).select("*").single();
  if (error) throw new Error(describeCategoryRejection(error));
  return { success: true, data: mapCourse(data as Record<string, unknown>) };
}

export async function updateCourse(id: string, input: Record<string, unknown>) {
  const { durationMonths, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };
  if (durationMonths !== undefined && payload.durationValue === undefined) {
    payload.durationValue = Number(durationMonths) || 1;
    payload.durationUnit = "MONTHS";
  }
  const { data, error } = await supabase.from("courses").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(describeCategoryRejection(error));
  return { success: true, data: mapCourse(data as Record<string, unknown>) };
}

/** Soft delete, matching the `deletedAt is null` filter used when reading. */
export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").update({ deletedAt: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/** Added by `supabase/schema/add-batch-fee-fields.sql`; may not be deployed. */
const BATCH_OPTIONAL_COLUMNS = ["feeDiscount", "remark", "instructor"];

/** The column is `maxSeats`; the screens say `maxStudents`. Expose both. */
function mapBatch(row: Record<string, unknown>): Record<string, any> {
  return {
    ...row,
    maxStudents: row.maxSeats === null || row.maxSeats === undefined ? undefined : Number(row.maxSeats),
    feeDiscount: row.feeDiscount === undefined ? 0 : Number(row.feeDiscount) || 0,
    remark: (row.remark as string) ?? "",
    instructor: (row.instructor as string) ?? "",
  };
}

export async function getBatches(branchId: string | null) {
  let query = supabase
    .from("batches")
    .select("*")
    .order("startDate", { ascending: false });
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data || []).map(mapBatch);
  return { success: true, data: await withEnrolmentCounts(rows) };
}

/** Batches for every branch in an organisation. */
export async function getBatchesByOrg(organizationId: string | null) {
  if (!organizationId) return { success: true, data: [] };
  const branchIds = await getBranchIdsByOrg(organizationId);
  if (branchIds.length === 0) return { success: true, data: [] };
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .in("branchId", branchIds)
    .order("startDate", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data || []).map(mapBatch);
  return { success: true, data: await withEnrolmentCounts(rows) };
}

/** `batches` has no seat counter, so derive it from the students table. */
async function withEnrolmentCounts(rows: Record<string, unknown>[]): Promise<Record<string, any>[]> {
  const ids = rows.map((r) => r.id as string).filter(Boolean);
  if (ids.length === 0) return rows.map((r) => ({ ...r, currentStudents: 0 }));
  const { data, error } = await supabase.from("students").select("batchId").in("batchId", ids);
  if (error) return rows.map((r) => ({ ...r, currentStudents: 0 }));
  const counts = new Map<string, number>();
  for (const row of data || []) {
    const key = (row as { batchId?: string }).batchId;
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return rows.map((r) => ({ ...r, currentStudents: counts.get(r.id as string) || 0 }));
}

export async function createBatch(branchId: string | null, input: Record<string, unknown>) {
  if (!branchId) throw new Error("Select a branch for this batch");
  const { maxStudents, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest, branchId };
  if (payload.maxSeats === undefined && maxStudents !== undefined) {
    payload.maxSeats = maxStudents === null || maxStudents === "" ? null : Number(maxStudents);
  }
  let { data, error } = await supabase.from("batches").insert(payload).select("*").single();
  if (error && (error.code === "PGRST204" || BATCH_OPTIONAL_COLUMNS.some((c) => error?.message?.includes(c)))) {
    const trimmed = { ...payload };
    for (const c of BATCH_OPTIONAL_COLUMNS) delete trimmed[c];
    ({ data, error } = await supabase.from("batches").insert(trimmed).select("*").single());
  }
  if (error) throw new Error(error.message);
  return { success: true, data: mapBatch(data as Record<string, unknown>) };
}

export async function updateBatch(id: string, input: Record<string, unknown>) {
  const { maxStudents, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };
  if (payload.maxSeats === undefined && maxStudents !== undefined) {
    payload.maxSeats = maxStudents === null || maxStudents === "" ? null : Number(maxStudents);
  }
  const attempt = (body: Record<string, unknown>) =>
    supabase.from("batches").update(body).eq("id", id).select("*").single();

  let { data, error } = await attempt(payload);
  if (error && (error.code === "PGRST204" || BATCH_OPTIONAL_COLUMNS.some((c) => error?.message?.includes(c)))) {
    const trimmed = { ...payload };
    for (const c of BATCH_OPTIONAL_COLUMNS) delete trimmed[c];
    ({ data, error } = await attempt(trimmed));
  }
  if (error) throw new Error(error.message);
  return { success: true, data: mapBatch(data as Record<string, unknown>) };
}

/**
 * Teacher names already in use, for the picker on the assign form.
 *
 * There is no staff table - `profiles` holds logins, not teaching staff - so
 * the list is whatever has been recorded before: the teacher on a batch, plus
 * the instructor on any older timing slot from when that was set per slot.
 * Typing a new name is what adds to it.
 */
export async function getInstructorNames(branchId: string | null) {
  const [batchRes, timingRes] = await Promise.all([
    branchId
      ? supabase.from("batches").select("instructor").eq("branchId", branchId)
      : supabase.from("batches").select("instructor"),
    supabase.from("batch_timings").select("instructor"),
  ]);
  const names = new Set<string>();
  for (const row of [...(batchRes.data || []), ...(timingRes.data || [])]) {
    for (const part of String((row as any).instructor || "").split(",")) {
      const name = part.trim();
      if (name) names.add(name);
    }
  }
  return { success: true, data: [...names].sort((a, b) => a.localeCompare(b)) };
}

export async function getBatchTimings(branchId: string, filters?: { batchId?: string; courseId?: string }) {
  let query = supabase.from("batch_timings").select("*").order("batchId").order("day").order("startTime");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let result = data || [];
  if (filters?.batchId) result = result.filter((t: any) => t.batchId === filters.batchId);
  return { success: true, data: result };
}

/**
 * There is no `live_classes` table - a "live class" is one weekly `batch_timings`
 * slot, resolved against its batch and course and projected onto the next
 * calendar date that day falls on. `status` is therefore derived from the clock,
 * not stored: nothing in the schema can mark a single occurrence cancelled.
 */
const TIMING_DAY_INDEX: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

function nextDateForDay(day: string, now: Date) {
  const target = TIMING_DAY_INDEX[String(day).toUpperCase()];
  const date = new Date(now);
  if (target !== undefined) {
    date.setDate(date.getDate() + ((target - date.getDay() + 7) % 7));
  }
  return date;
}

const minutesOfDay = (time: string) => {
  const [h, m] = String(time || "0:0").split(":");
  return Number(h) * 60 + Number(m || 0);
};

export async function getLiveClasses(branchId: string | null) {
  const timings = (await getBatchTimings(branchId as string)).data as Record<string, any>[];
  const batchIds = [...new Set(timings.map((t) => t.batchId).filter(Boolean))];
  const batchById = new Map<string, Record<string, any>>();
  const courseById = new Map<string, Record<string, any>>();

  if (batchIds.length) {
    const { data: batchRows, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .in("id", batchIds);
    if (batchError) throw new Error(batchError.message);
    (batchRows || []).forEach((b: Record<string, any>) => batchById.set(b.id, b));

    const courseIds = [...new Set((batchRows || []).map((b: Record<string, any>) => b.courseId).filter(Boolean))];
    if (courseIds.length) {
      const { data: courseRows, error: courseError } = await supabase
        .from("courses")
        .select("id, name")
        .in("id", courseIds);
      if (courseError) throw new Error(courseError.message);
      (courseRows || []).forEach((c: Record<string, any>) => courseById.set(c.id, c));
    }
  }

  const now = new Date();
  const todayIndex = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const data = timings.map((slot) => {
    const batch = batchById.get(slot.batchId) || {};
    const course = courseById.get(batch.courseId) || {};
    const date = nextDateForDay(slot.day, now);
    const start = minutesOfDay(slot.startTime);
    const end = minutesOfDay(slot.endTime);
    const isToday = TIMING_DAY_INDEX[String(slot.day).toUpperCase()] === todayIndex;
    const derived: "scheduled" | "active" | "completed" =
      isToday && nowMinutes >= start && nowMinutes < end
        ? "active"
        : isToday && nowMinutes >= end
          ? "completed"
          : "scheduled";
    return {
      id: slot.id,
      title: slot.title || slot.subject || batch.name || "Class",
      subject: slot.subject || "",
      instructor: slot.instructor || "Unassigned",
      course: course.name || "",
      batch: batch.name || "",
      date: date.toISOString().slice(0, 10),
      time: slot.startTime || "",
      duration: end > start ? `${end - start} min` : "",
      platform: slot.platform || (slot.roomNo ? "In person" : "Online"),
      meetingLink: slot.meetingLink || undefined,
      meetingId: slot.meetingId || undefined,
      description: slot.description || undefined,
      recorded: Boolean(slot.recorded),
      attendees: 0,
      totalStudents: Number(batch.capacity || 0),
      // `status` only exists once add-batch-timing-class-fields.sql has been run;
      // until then a slot's state is whatever the clock says it is.
      status: (slot.status as "scheduled" | "active" | "completed" | "cancelled") || derived,
    };
  });

  return { success: true, data };
}

export async function createBatchTiming(input: Record<string, unknown>) {
  const { data, error } = await supabase.from("batch_timings").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

/**
 * The live-class UI edits fields (`title`, `platform`, `meetingLink`, `status`, ...)
 * that only exist after add-batch-timing-class-fields.sql has been run, so a
 * PGRST204 for one of them retries with just the always-present columns rather
 * than failing the whole save.
 */
const BATCH_TIMING_COLUMNS = ["batchId", "day", "startTime", "endTime", "subject", "instructor", "roomNo"];
const BATCH_TIMING_OPTIONAL_COLUMNS = ["title", "platform", "meetingLink", "meetingId", "description", "status", "recorded"];

export async function updateBatchTiming(id: string, input: Record<string, unknown>) {
  const known = [...BATCH_TIMING_COLUMNS, ...BATCH_TIMING_OPTIONAL_COLUMNS];
  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => known.includes(key)));
  const attempt = (body: Record<string, unknown>) =>
    supabase.from("batch_timings").update(body).eq("id", id).select("*").single();

  let { data, error } = await attempt(payload);
  if (
    error?.code === "PGRST204" &&
    BATCH_TIMING_OPTIONAL_COLUMNS.some((column) => error?.message?.includes(column))
  ) {
    const trimmed = Object.fromEntries(
      Object.entries(payload).filter(([key]) => BATCH_TIMING_COLUMNS.includes(key)),
    );
    if (!Object.keys(trimmed).length) {
      throw new Error(
        "This change needs the batch_timings live-class columns. Run supabase/schema/add-batch-timing-class-fields.sql.",
      );
    }
    ({ data, error } = await attempt(trimmed));
  }
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function deleteBatchTiming(id: string) {
  const { error } = await supabase.from("batch_timings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/* ============================
   ATTENDANCE
   ============================ */

export async function getAttendance(branchId: string | null, date?: string) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("students")
    .select("*")
    .eq("isActive", true)
    .is("deletedAt", null)
    .order("firstName");
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const withAttendance = (data || []).map((s: any) => ({
    ...s,
    attendance: [],
  }));
  return { success: true, data: withAttendance };
}

export async function markAttendance(branchId: string, date: string, records: Array<{ studentId: string; status: string; remarks?: string }>) {
  const results = [];
  for (const record of records) {
    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        { studentId: record.studentId, date, status: record.status, remarks: record.remarks || null },
        { onConflict: "studentId_date" }
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    results.push(data);
  }
  return { success: true, data: results };
}

export async function getStudentAttendance(studentId: string, _branchId: string, month?: Date) {
  let query = supabase
    .from("attendance_records")
    .select("*")
    .eq("studentId", studentId)
    .order("date", { ascending: false });

  if (month) {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
    query = query.gte("date", start).lt("date", end);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

export async function getAttendanceWithStudents(branchId: string | null, date: string) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  let studentsQuery = supabase
    .from("students")
    .select("*")
    .eq("isActive", true)
    .is("deletedAt", null)
    .order("firstName");
  if (branchId) studentsQuery = studentsQuery.eq("branchId", branchId);
  const { data: students, error: sErr } = await studentsQuery;
  if (sErr) throw new Error(sErr.message);

  const attendanceQuery = supabase
    .from("attendance_records")
    .select("*")
    .eq("date", targetDate);
  if (branchId) {
    const branchStudents = (students || []).map((s: any) => s.id);
    if (branchStudents.length) attendanceQuery.in("studentId", branchStudents);
  }
  const { data: records, error: aErr } = await attendanceQuery;
  if (aErr) throw new Error(aErr.message);

  const byStudent = new Map((records || []).map((r: any) => [r.studentId, r]));
  const merged = (students || []).map((s: any) => ({
    ...s,
    attendance: byStudent.has(s.id) ? [byStudent.get(s.id)] : [],
  }));
  return { success: true, data: merged };
}


export async function getAllAttendanceRecords(branchId?: string) {
  const branch = branchId || "";
  let studentsQuery = supabase
    .from("students")
    .select("id")
    .eq("isActive", true)
    .is("deletedAt", null);
  if (branch) studentsQuery = studentsQuery.eq("branchId", branch);
  const { data: students, error: sErr } = await studentsQuery;
  if (sErr) throw new Error(sErr.message);
  const ids = (students || []).map((s: any) => s.id);
  if (!ids.length) return { success: true, data: [] };
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .in("studentId", ids)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}


/* ============================
   FEES
   ============================ */

/*
 * These three delegate to ./studentFee, which was written against the probed
 * live schema. The versions that used to live here could never succeed:
 * `getInvoices` filtered on FeeStatus values the enum does not contain (22P02
 * on every call), and `createInvoice` wrote an `invoiceNumber` column that does
 * not exist (the column is `invoiceNo`) while silently dropping the `branchId`
 * it was handed. They are kept as named exports so existing callers - notably
 * GenerateAdmitCards - keep working.
 */

/** Every live invoice (DUE, PARTIAL and PAID) with payments and student embedded. */
export async function getInvoices(branchId: string | null) {
  return listInvoices(branchId);
}

export async function createInvoice(branchId: string, input: Record<string, unknown>) {
  return createInvoiceRow(branchId || null, input as unknown as CreateInvoiceInput);
}

export async function updateInvoice(id: string, _branchId: string, input: Record<string, unknown>) {
  return updateInvoiceRow(id, input);
}

export async function deleteInvoice(id: string, _branchId: string) {
  const { error } = await supabase.from("fee_invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getStudentInvoices(studentId: string, _branchId: string | null) {
  const { data, error } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("studentId", studentId)
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

export async function addPayment(invoiceId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("fee_payments").insert({ ...input, invoiceId }).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

/* ============================
   EXAMS
   ============================ */

export async function getExams(branchId: string | null) {
  let query = supabase
    .from("exams")
    .select("*")
    .order("examDate", { ascending: false });
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data || []) as Record<string, any>[];

  // The exam pickers label each exam with its course, and `exams` only carries
  // `courseId`. Resolve the names in one extra request rather than per row.
  const courseIds = [...new Set(rows.map((r) => r.courseId).filter(Boolean))];
  const { data: courseRows } = courseIds.length
    ? await supabase.from("courses").select("id,name").in("id", courseIds)
    : { data: [] };
  const names = new Map((courseRows || []).map((c: any) => [c.id, c.name as string]));

  // Results live in their own table; the screens read `exam.results`.
  const { data: resultRows } = rows.length
    ? await supabase.from("exam_results").select("*").in("examId", rows.map((r) => r.id))
    : { data: [] };
  const results = (resultRows || []) as Record<string, any>[];

  return {
    success: true,
    data: rows.map((row) => ({
      ...row,
      course: { name: names.get(row.courseId) || "Unassigned course" },
      results: results
        .filter((r) => r.examId === row.id)
        .map((r) => ({ studentId: r.studentId as string, marks: Number(r.marks) || 0 })),
    })),
  };
}

/**
 * The online-exam form collects a duration, a window, a question count and the
 * proctoring toggles, but `exams` has none of those columns - the values were
 * being dropped on save. add-online-exam-fields.sql adds them; until it is run,
 * a PGRST204 for one of them retries with only the base columns so creating an
 * exam still works.
 */
const EXAM_OPTIONAL_COLUMNS = [
  "description", "endDate", "duration", "totalQuestions", "negativeMarking",
  "shuffleQuestions", "shuffleOptions", "preventTabSwitch", "fullScreen",
  "webcam", "showResult", "showAnswers", "allowReview", "autoSubmit",
];

const isMissingExamColumn = (error: { code?: string; message?: string } | null) =>
  error?.code === "PGRST204" && EXAM_OPTIONAL_COLUMNS.some((c) => error?.message?.includes(c));

const withoutOptionalExamColumns = (payload: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => !EXAM_OPTIONAL_COLUMNS.includes(key)));

export async function createExam(branchId: string | null, input: Record<string, unknown>) {
  if (!branchId) throw new Error("Branch ID required to create exam");
  const attempt = (body: Record<string, unknown>) =>
    supabase.from("exams").insert(body).select("*").single();

  let { data, error } = await attempt({ ...input, branchId });
  if (isMissingExamColumn(error)) {
    ({ data, error } = await attempt({ ...withoutOptionalExamColumns(input), branchId }));
  }
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateExam(id: string, branchId: string, input: Record<string, unknown>) {
  const attempt = (body: Record<string, unknown>) =>
    supabase.from("exams").update(body).eq("id", id).eq("branchId", branchId).select("*").single();

  let { data, error } = await attempt(input);
  if (isMissingExamColumn(error)) {
    ({ data, error } = await attempt(withoutOptionalExamColumns(input)));
  }
  if (error) throw new Error(error.message);
  return { success: true, data };
}

/**
 * The live column is `marks`. This wrote `marksObtained`, which does not exist,
 * so every attempt to save exam marks failed with 42703 - the feature has never
 * worked. `onConflict` also has to name the columns, not the constraint.
 */
export async function submitExamResults(examId: string, branchId: string, results: Array<{ studentId: string; marks: number; remarks?: string }>, publish = false) {
  const exam = await getExamById(examId, branchId);
  if (!exam) throw new Error("Exam not found");

  const upserts = results.map(r => ({
    examId,
    studentId: r.studentId,
    marks: r.marks,
    remarks: r.remarks || null,
  }));

  const { data, error } = await supabase.from("exam_results").upsert(upserts, { onConflict: "examId,studentId" }).select("*");
  if (error) throw new Error(error.message);

  if (publish) await supabase.from("exams").update({ status: "PUBLISHED" }).eq("id", examId);

  return { success: true, data: data || [] };
}

async function getExamById(id: string, branchId: string) {
  const { data } = await supabase.from("exams").select("*").eq("id", id).eq("branchId", branchId).single();
  return data;
}

export async function getStudentResults(studentId: string, branchId: string, examId?: string) {
  let query = supabase
    .from("exam_results")
    .select("*")
    .eq("studentId", studentId);
  if (examId) query = query.eq("examId", examId);
  const { data, error } = await query.order("examId", { ascending: false });
  if (error) throw new Error(error.message);
  const filtered = (data || []).filter((r: any) => r.examId);
  const result = filtered.map((r: any) => ({ ...r, studentEnrollmentNo: r.studentEnrollmentNo || "", studentFirstName: r.studentFirstName || "", studentLastName: r.studentLastName || "" }));
  try {
    const dates: Record<string, string> = {};
    for (const r of filtered) { if (r.examId && !dates[r.examId]) { const e = await getExamById(r.examId, branchId); dates[r.examId] = e?.examDate || ""; } }
    return { success: true, data: result.sort((a: any, b: any) => (dates[b.examId] || "").localeCompare(dates[a.examId] || "")) };
  } catch {
    return { success: true, data: result };
  }
}

/**
 * Everything the admission / marksheet / certificate PDFs need, in one call.
 *
 * The screens used to fetch this from `/core/documents/students/:id` on the
 * REST backend, which is not deployed - the call threw a ReferenceError before
 * it even got that far, blanking the page. PostgREST cannot join across four
 * tables in one request here, so this fans out and assembles the shape the PDF
 * helpers expect. Missing relations degrade to undefined rather than throwing:
 * a student with no batch should still get an admission letter.
 */
export async function getStudentDocument(studentId: string, branchId: string | null) {
  const student = (await getStudent(studentId, branchId)).data as Record<string, any>;

  const lookup = async (table: string, id: unknown) => {
    if (!id) return null;
    const { data } = await supabase.from(table).select("*").eq("id", id as string).maybeSingle();
    return data as Record<string, any> | null;
  };

  const [course, batch, branch] = await Promise.all([
    lookup("courses", student.courseId),
    lookup("batches", student.batchId),
    lookup("branches", student.branchId),
  ]);

  const organization = branch ? await lookup("organizations", branch.organizationId) : null;

  const { data: invoiceRows } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("studentId", studentId);
  const invoices = (invoiceRows || []) as Record<string, any>[];

  const { data: paymentRows } = invoices.length
    ? await supabase
        .from("fee_payments")
        .select("*")
        .in("invoiceId", invoices.map((i) => i.id))
        .is("reversedAt", null)
    : { data: [] };
  const payments = (paymentRows || []) as Record<string, any>[];

  const { data: resultRows } = await supabase
    .from("exam_results")
    .select("*")
    .eq("studentId", studentId);
  const results = (resultRows || []) as Record<string, any>[];

  const examIds = [...new Set(results.map((r) => r.examId).filter(Boolean))];
  const { data: examRows } = examIds.length
    ? await supabase.from("exams").select("*").in("id", examIds)
    : { data: [] };
  const exams = new Map((examRows || []).map((e: any) => [e.id, e]));

  return {
    success: true,
    data: {
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      enrollmentNo: student.enrollmentNo || undefined,
      applicationNo: student.applicationNo || undefined,
      admissionDate: student.admissionDate || student.createdAt || "",
      course: course ? { name: course.name } : undefined,
      batch: batch ? { name: batch.name } : undefined,
      branch: {
        name: branch?.name || "",
        phone: branch?.phone || "",
        email: branch?.email || "",
        organization: { name: organization?.name || "" },
      },
      feeInvoices: invoices.map((invoice) => ({
        invoiceNo: invoice.invoiceNo || "",
        description: invoice.description || "",
        amount: Number(invoice.totalAmount) || 0,
        payments: payments
          .filter((payment) => payment.invoiceId === invoice.id)
          .map((payment) => ({
            receiptNo: payment.receiptNo || "",
            amount: Number(payment.amount) || 0,
            method: payment.method || "",
            paidAt: payment.paidAt || payment.createdAt || "",
          })),
      })),
      examResults: results
        .filter((result) => exams.has(result.examId))
        .map((result) => {
          const exam = exams.get(result.examId) as Record<string, any>;
          return {
            marks: Number(result.marks) || 0,
            exam: {
              name: exam.name || "",
              subject: exam.subject || "",
              maxMarks: Number(exam.maxMarks) || 0,
              passMarks: Number(exam.passMarks) || 0,
              examDate: exam.examDate || "",
            },
          };
        }),
    },
  };
}

/* ============================
   ENQUIRIES
   ============================ */

export async function getEnquiries(branchId: string | null, page = 1, limit = 20, search?: string) {
  let query = supabase
    .from("visit_enquiries")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (branchId) query = query.eq("branchId", branchId);

  if (search) {
    query = query.or(`visitorName.ilike.%${search}%,phone.ilike.%${search}%,personToMeet.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [], meta: { page, limit, total: count || 0 } };
}

export async function createEnquiry(branchId: string, input: Record<string, unknown>) {
  if (!branchId) throw new Error("Select a branch for this visit before registering the visitor.");
  const payload = {
    ...input,
    branchId,
    visitDate: input.visitDate || new Date().toISOString(),
    visitTime: input.visitTime || new Date().toTimeString().slice(0, 5),
  };
  const { data, error } = await supabase.from("visit_enquiries").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateEnquiry(id: string, branchId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("visit_enquiries").update(input).eq("id", id).eq("branchId", branchId).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function getPendingEnquiries(branchId: string | null) {
  let query = supabase
    .from("visit_enquiries")
    .select("*")
    .in("status", ["NEW", "CONTACTED"])
    .order("createdAt", { ascending: false })
    .limit(10);
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

export async function deleteEnquiry(id: string, branchId: string) {
  const { error } = await supabase.from("visit_enquiries").delete().eq("id", id).eq("branchId", branchId);
  if (error) throw new Error(error.message);
  return { success: true };
}

/* ============================
   NOTICES
   ============================ */

export async function getNotices(branchId: string | null) {
  let query = supabase
    .from("branch_notices")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(20);
  if (branchId) {
    query = query.or(`branchId.eq.${branchId},branchId.is.null`);
  } else {
    query = query.is("branchId", null);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

/**
 * Columns added by a later migration. If the deployment hasn't run
 * `supabase/schema/add-notice-meeting-fields.sql` yet, PostgREST rejects the
 * whole write with PGRST204; drop them and save the rest rather than losing
 * the notice.
 */
const NOTICE_OPTIONAL_COLUMNS = ["meetingTime", "meetingLink"];

const isUnknownColumn = (error: { code?: string; message?: string } | null) =>
  error?.code === "PGRST204" ||
  NOTICE_OPTIONAL_COLUMNS.some((c) => error?.message?.includes(c));

/** Blank strings break date/uuid columns, and an empty id defeats the default. */
function cleanNoticePayload(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "id" && !value) continue;
    if (key === "createdAt" || key === "updatedAt") continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

const withoutOptionalNoticeColumns = (input: Record<string, unknown>) => {
  const out = { ...input };
  for (const c of NOTICE_OPTIONAL_COLUMNS) delete out[c];
  return out;
};

export async function createNotice(input: Record<string, unknown>) {
  const payload = cleanNoticePayload(input);
  let { data, error } = await supabase.from("branch_notices").insert(payload).select("*").single();
  if (error && isUnknownColumn(error)) {
    ({ data, error } = await supabase
      .from("branch_notices")
      .insert(withoutOptionalNoticeColumns(payload))
      .select("*")
      .single());
  }
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateNotice(id: string, input: Record<string, unknown>) {
  const payload = cleanNoticePayload(input);
  delete payload.id;
  let { data, error } = await supabase.from("branch_notices").update(payload).eq("id", id).select("*").single();
  if (error && isUnknownColumn(error)) {
    ({ data, error } = await supabase
      .from("branch_notices")
      .update(withoutOptionalNoticeColumns(payload))
      .eq("id", id)
      .select("*")
      .single());
  }
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function deleteNotice(id: string) {
  const { error } = await supabase.from("branch_notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/* ============================
   BRANCHES
   ============================ */

export async function getBranches(organizationId: string | null) {
  let query = supabase
    .from("branches")
    .select("*")
    .is("deletedAt", null)
    .order("name");

  if (organizationId) {
    query = query.eq("organizationId", organizationId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

/**
 * Branch settings toggles added by `supabase/schema/add-portal-settings.sql`.
 * They shipped in the UI before the migration was run, so every insert failed
 * with PGRST204 and the organisation ended up with no branches at all.
 */
const BRANCH_OPTIONAL_COLUMNS = ["onlineFeePayment", "studentPortal", "parentPortal"];

const withoutOptionalBranchColumns = (input: Record<string, unknown>) => {
  const out = { ...input };
  for (const column of BRANCH_OPTIONAL_COLUMNS) delete out[column];
  return out;
};

/** True when PostgREST rejected the write because a column isn't deployed yet. */
const isMissingBranchColumn = (error: { code?: string; message?: string } | null) =>
  error?.code === "PGRST204" &&
  BRANCH_OPTIONAL_COLUMNS.some((c) => error?.message?.includes(c));

/**
 * Unique constraints on `branches`, mapped to the field a person filled in and
 * the payload key that carries it.
 */
const BRANCH_UNIQUE_CONSTRAINTS: Record<string, { label: string; column: string }> = {
  branches_email_key: { label: "email address", column: "email" },
  branches_code_key: { label: "branch code", column: "code" },
  branches_phone_key: { label: "phone number", column: "phone" },
};

/**
 * Explain a unique violation instead of forwarding Postgres's own wording.
 *
 * This matters more here than it looks. `deleteBranch` is a *soft* delete - it
 * stamps `deletedAt` and leaves the row in place - and `getBranches` hides
 * those rows. The unique index does not: it still covers them. So deleting a
 * branch and creating it again with the same email fails against a row that is
 * nowhere on screen, and the raw error ("duplicate key value violates unique
 * constraint branches_email_key") gives no hint that this is what happened.
 *
 * So say who holds the value, and whether they are deleted.
 */
async function describeBranchConflict(
  error: { code?: string; message?: string },
  payload: Record<string, unknown>,
): Promise<string | null> {
  if (error.code !== "23505") return null;
  const name = error.message?.match(/unique constraint "([^"]+)"/)?.[1] ?? "";
  const conflict = BRANCH_UNIQUE_CONSTRAINTS[name];
  if (!conflict) return null;

  const value = payload[conflict.column];
  const base = `A branch is already registered with this ${conflict.label}`;
  if (typeof value !== "string" || !value) return `${base}.`;

  // Deliberately no `deletedAt` filter - the row that blocks the insert is
  // usually one that has been deleted and is therefore invisible everywhere else.
  const { data } = await supabase
    .from("branches")
    .select("name, code, deletedAt")
    .eq(conflict.column, value)
    .limit(1);
  const holder = data?.[0];
  if (!holder) {
    return `${base} (${value}). It belongs to a branch outside this workspace, so use a different ${conflict.label}.`;
  }
  const who = `${holder.name}${holder.code ? ` (${holder.code})` : ""}`;
  return holder.deletedAt
    ? `${base} (${value}): "${who}", which was deleted on ${String(holder.deletedAt).slice(0, 10)}. Deleted branches keep their ${conflict.label}, so either restore that branch or use a different one here.`
    : `${base} (${value}): "${who}". Use a different ${conflict.label}.`;
}

async function insertBranchRow(payload: Record<string, unknown>) {
  const attempt = (body: Record<string, unknown>) =>
    supabase.from("branches").insert(body).select("*").single();

  let { data, error } = await attempt(payload);
  if (error && isMissingBranchColumn(error)) {
    ({ data, error } = await attempt(withoutOptionalBranchColumns(payload)));
  }
  if (error) {
    throw new Error((await describeBranchConflict(error, payload)) || error.message);
  }
  return data;
}

export async function createBranch(organizationId: string, input: Record<string, unknown>) {
  const data = await insertBranchRow({ ...input, organizationId });
  return { success: true, data };
}

/**
 * The branch list is assembled from four tables: the branch row itself, its
 * address, its licence expiry and the counts the register shows per branch.
 */
export async function getBranchesWithStats(organizationId: string | null) {
  const { data: branches } = await getBranches(organizationId);
  const ids = (branches as Record<string, unknown>[]).map((b) => b.id as string);
  if (!ids.length) return { success: true, data: [] as Record<string, unknown>[] };

  const [addresses, licenses, students, invoices, wallets] = await Promise.all([
    supabase.from("branch_addresses").select("branchId, city, state").in("branchId", ids),
    supabase.from("branch_licenses").select("branchId, expiryDate").in("branchId", ids),
    supabase.from("students").select("id, branchId").in("branchId", ids).is("deletedAt", null),
    supabase.from("fee_invoices").select("branchId, totalAmount, paidAmount").in("branchId", ids),
    supabase.from("branch_wallets").select("branchId, balance").in("branchId", ids),
  ]);

  const addressFor = new Map<string, { city?: string; state?: string }>();
  for (const row of addresses.data || []) addressFor.set(row.branchId as string, row);
  const expiryFor = new Map<string, string>();
  for (const row of licenses.data || []) expiryFor.set(row.branchId as string, row.expiryDate as string);
  const studentsFor = new Map<string, number>();
  for (const row of students.data || []) {
    const key = row.branchId as string;
    studentsFor.set(key, (studentsFor.get(key) || 0) + 1);
  }
  // Revenue is what has actually been received; pending is the unpaid balance
  // still outstanding on those invoices. A credit balance is clamped to zero so
  // one over-paid invoice cannot mask real dues elsewhere in the branch.
  const revenueFor = new Map<string, number>();
  const pendingFor = new Map<string, number>();
  for (const row of invoices.data || []) {
    const key = row.branchId as string;
    const paid = Number(row.paidAmount) || 0;
    const total = Number(row.totalAmount) || 0;
    revenueFor.set(key, (revenueFor.get(key) || 0) + paid);
    pendingFor.set(key, (pendingFor.get(key) || 0) + Math.max(total - paid, 0));
  }
  // Prepaid wallet money, topped up on the Wallet Recharge screen. It is not
  // revenue and is deliberately kept out of the two totals above -- a branch
  // that has collected no fees still has whatever it has recharged.
  const walletFor = new Map<string, number>();
  for (const row of wallets.data || []) {
    walletFor.set(row.branchId as string, Number(row.balance) || 0);
  }

  return {
    success: true,
    data: (branches as Record<string, unknown>[]).map((b) => {
      const id = b.id as string;
      return {
        ...b,
        city: addressFor.get(id)?.city || "",
        state: addressFor.get(id)?.state || "",
        expiryDate: expiryFor.get(id) || "",
        students: studentsFor.get(id) || 0,
        staff: Number(b.numFaculty) || 0,
        revenue: revenueFor.get(id) || 0,
        pendingRevenue: pendingFor.get(id) || 0,
        walletBalance: walletFor.get(id) || 0,
        status: b.isActive ? "active" : "inactive",
      };
    }),
  };
}

/**
 * A branch is spread over several tables. PostgREST has no transaction across
 * requests, so if a follow-up insert fails the branch row is removed again -
 * otherwise its unique code would block the next attempt.
 */
export async function createBranchWithDetails(
  organizationId: string,
  input: {
    branch: Record<string, unknown>;
    address: Record<string, unknown>;
    director: Record<string, unknown>;
    license?: Record<string, unknown>;
  },
) {
  const branch = await insertBranchRow({ ...input.branch, organizationId });

  const branchId = branch.id as string;
  try {
    const { error: addressError } = await supabase
      .from("branch_addresses")
      .insert({ ...input.address, branchId });
    if (addressError) throw new Error(addressError.message);

    const { error: directorError } = await supabase
      .from("branch_directors")
      .insert({ ...input.director, branchId });
    if (directorError) throw new Error(directorError.message);

    if (input.license) {
      const { error: licenseError } = await supabase
        .from("branch_licenses")
        .insert({ ...input.license, branchId });
      if (licenseError) throw new Error(licenseError.message);
    }
  } catch (err) {
    // Undo the branch row, otherwise its unique code and email block the next
    // attempt against a row the register does not show. If the cleanup itself
    // fails, say so - silently swallowing it is what leaves the orphan behind
    // that then reports a baffling duplicate-key error on the retry.
    const { error: cleanupError } = await supabase.from("branches").delete().eq("id", branchId);
    const reason = err instanceof Error ? err.message : "Could not save the branch details";
    if (cleanupError) {
      throw new Error(
        `${reason}. The partly-created branch could not be removed either (${cleanupError.message}), so its code and email are still taken - delete branch ${branchId} in Supabase before retrying.`,
      );
    }
    throw err;
  }

  return { success: true, data: branch };
}

export async function updateBranch(id: string, organizationId: string, input: Record<string, unknown>) {
  const attempt = (body: Record<string, unknown>) =>
    supabase.from("branches").update(body).eq("id", id).eq("organizationId", organizationId).select("*").single();

  let { data, error } = await attempt(input);
  if (error && isMissingBranchColumn(error)) {
    ({ data, error } = await attempt(withoutOptionalBranchColumns(input)));
  }
  if (error) throw new Error(error.message);
  return { success: true, data };
}

const FUNCTION_NOT_DEPLOYED =
  'The "create-branch-user" function has not been deployed to this Supabase project, so there was nothing to mint the login. ' +
  "Run `supabase functions deploy create-branch-user`; until then the account has to be added under Authentication in the Supabase dashboard.";

/**
 * Separates "never deployed" from "deployed but unreachable".
 *
 * Sent with no headers and no body on purpose: that makes it a simple request,
 * so the browser skips the preflight that hides the real status, and the
 * gateway's `Access-Control-Allow-Origin: *` lets us read what came back.
 */
async function describeUnreachableFunction(): Promise<string> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/create-branch-user`, { method: "POST" });
    if (res.status === 404) return FUNCTION_NOT_DEPLOYED;
  } catch {
    // no network at all, or the project is unreachable - say so below
  }
  return "Could not reach the create-branch-user function. Check the connection and that the Supabase project is running, then add the login again.";
}

/**
 * Creates the branch's login. The account itself is minted by the
 * create-branch-user edge function, which holds the service-role key -
 * signing up from the browser would swap out the admin's own session.
 */
export async function createBranchLogin(input: {
  branchId: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
  phone?: string;
}) {
  const { data, error } = await supabase.functions.invoke("create-branch-user", { body: input });
  if (error) {
    const response = (error as { context?: Response }).context;
    // the function replies with { error } on 4xx, which is more useful than "non-2xx"
    const detail = await response?.json?.().catch(() => null);
    if (detail?.error) throw new Error(detail.error);
    if (response?.status === 404) throw new Error(FUNCTION_NOT_DEPLOYED);
    // A function that was never deployed is invisible from the browser. Its
    // preflight 404 comes back allowing only `authorization, x-client-info,
    // apikey`, so the POST - which carries a content-type - is blocked before
    // it is ever sent, and supabase-js can say nothing more useful than
    // "Failed to send a request to the Edge Function". Ask the gateway
    // ourselves rather than passing that on.
    if (error.name === "FunctionsFetchError") throw new Error(await describeUnreachableFunction());
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return { success: true, data } as { success: true; data: { loginEmail: string; username: string } };
}

/** City and state live on branch_addresses, the rest on the branch row itself. */
export async function updateBranchWithDetails(
  id: string,
  organizationId: string,
  input: {
    branch: Record<string, unknown>;
    address?: Record<string, unknown>;
    director?: Record<string, unknown>;
    license?: Record<string, unknown>;
  },
) {
  const result = await updateBranch(id, organizationId, input.branch);
  if (input.address) {
    const { error } = await supabase
      .from("branch_addresses")
      .update(input.address)
      .eq("branchId", id);
    if (error) throw new Error(error.message);
  }
  if (input.director) {
    const { error } = await supabase
      .from("branch_directors")
      .update(input.director)
      .eq("branchId", id);
    if (error) throw new Error(error.message);
  }
  if (input.license) {
    const { error } = await supabase
      .from("branch_licenses")
      .update(input.license)
      .eq("branchId", id);
    if (error) throw new Error(error.message);
  }
  return result;
}

export async function getBranchDetails(organizationId: string, branchId: string) {
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("*")
    .eq("id", branchId)
    .eq("organizationId", organizationId)
    .is("deletedAt", null)
    .single();
  if (branchError) throw new Error(branchError.message);

  const { data: address } = await supabase.from("branch_addresses").select("*").eq("branchId", branchId).maybeSingle();
  const { data: director } = await supabase.from("branch_directors").select("*").eq("branchId", branchId).maybeSingle();
  const { data: license } = await supabase.from("branch_licenses").select("*").eq("branchId", branchId).maybeSingle();

  return { success: true, data: { ...branch, address, director, license } };
}

export async function deleteBranch(id: string) {
  const { error } = await supabase.from("branches").update({ deletedAt: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/* ============================
   PORTAL (Student Self-Service)
   ============================ */

export async function getStudentProfile(userId: string, branchId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("userId", userId)
    .eq("branchId", branchId)
    .is("deletedAt", null)
    .single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function getStudentPortalClasses(userId: string, branchId: string) {
  const { data: student } = await supabase.from("students").select("batchId").eq("userId", userId).eq("branchId", branchId).single();
  if (!student?.batchId) return { success: true, data: [] };

  const { data, error } = await supabase
    .from("batch_timings")
    .select("*")
    .eq("batchId", student.batchId)
    .order("day")
    .order("startTime");
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map((t: any) => ({ ...t, course: t.subject || t.teacherName || "—" })) };
}

export async function getStudentPortalInvoices(userId: string, branchId: string) {
  const { data: student } = await supabase.from("students").select("id").eq("userId", userId).eq("branchId", branchId).single();
  if (!student) return { success: true, data: [] };
  return getStudentInvoices(student.id, branchId);
}

export async function getStudentPortalResults(userId: string, branchId: string, examId?: string) {
  const { data: student } = await supabase.from("students").select("id").eq("userId", userId).eq("branchId", branchId).single();
  if (!student) return { success: true, data: [] };
  return getStudentResults(student.id, branchId, examId);
}

export async function submitPortalRequest(userId: string, branchId: string, organizationId: string, kind: string, detail: string, studentId?: string) {
  const { data, error } = await supabase.from("audit_events").insert({
    actorId: userId,
    organizationId,
    branchId,
    action: kind,
    entityType: "PortalRequest",
    entityId: crypto.randomUUID(),
    after: { detail, studentId },
  }).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

/**
 * The read side of `submitPortalRequest`. Portal requests are not a table of
 * their own - they are `audit_events` rows tagged `entityType = "PortalRequest"`,
 * so this filters on that rather than on a dedicated endpoint.
 */
export async function getPortalRequests(userId: string | null, branchId: string | null) {
  if (!userId) return { success: true, data: [] as Record<string, unknown>[] };
  let query = supabase
    .from("audit_events")
    .select("*")
    .eq("entityType", "PortalRequest")
    .eq("actorId", userId)
    .order("createdAt", { ascending: false });
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

/* ============================
   MISC / SETTINGS
   ============================ */

export async function getBranchSettings(branchId: string | null) {
  if (!branchId) return { success: true, data: null };
  const { data, error } = await supabase.from("branch_settings").select("*").eq("branchId", branchId).single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return { success: true, data: data || null };
}

/**
 * The website-settings form edits far more fields than `branch_settings` has
 * columns for. Rather than reject the whole save, this drops each unknown column
 * PostgREST complains about and retries, reporting what it had to leave out so
 * the caller can tell the user which migration is missing.
 */
export async function updateBranchSettings(branchId: string | null, input: Record<string, unknown>) {
  if (!branchId) return { success: true, data: null, droppedColumns: [] as string[] };

  const payload = { ...input, branchId };
  const dropped: string[] = [];

  for (let attempt = 0; attempt < Object.keys(input).length + 1; attempt++) {
    const { data, error } = await supabase.from("branch_settings").upsert(payload).select("*").single();
    if (!error) return { success: true, data, droppedColumns: dropped };

    const missing =
      error.code === "PGRST204" || error.code === "42703"
        ? Object.keys(payload).find((key) => key !== "branchId" && error.message?.includes(`'${key}'`))
        : undefined;
    if (!missing) throw new Error(error.message);
    delete payload[missing];
    dropped.push(missing);
  }
  throw new Error("Could not save branch settings.");
}

export async function getWallet(branchId: string | null) {
  if (!branchId) return { success: true, data: null };
  const { data, error } = await supabase.from("branch_wallets").select("*").eq("branchId", branchId).single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return { success: true, data: data || null };
}

/**
 * `branch_transactions` stores `createdAt`, `balanceAfter` and an uppercase
 * enum type, while the transactions table renders `date`, `branch`, `balance`
 * and a lowercase type. Without this mapping those columns render empty.
 */
const TRANSACTION_SELECT = "*, branch:branches(name)";

function mapTransaction(row: Record<string, unknown>): Record<string, any> {
  const branch = row.branch as { name?: string } | null;
  const created = (row.createdAt as string) || "";
  const at = created ? new Date(created) : null;
  return {
    ...row,
    branch: branch?.name || "—",
    date: at && !Number.isNaN(at.getTime()) ? at.toISOString().slice(0, 10) : "—",
    createdAt: created,
    type: String(row.type || "").toUpperCase() === "DEBIT" ? "debit" : "credit",
    amount: Number(row.amount) || 0,
    balance: Number(row.balanceAfter) || 0,
    description: (row.description as string) || (row.category as string) || "—",
    reference: (row.reference as string) || (row.id as string),
  };
}

export async function getTransactions(branchId: string | null) {
  if (!branchId) return { success: true, data: [] };
  const { data, error } = await supabase.from("branch_transactions").select(TRANSACTION_SELECT).eq("branchId", branchId).order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map(mapTransaction) };
}

export async function getWalletsByOrg(organizationId: string | null) {
  if (!organizationId) return { success: true, data: [] };
  const { data, error } = await supabase
    .from("branch_wallets")
    .select("*")
    .in("branchId", (await getBranchIdsByOrg(organizationId)) || []);
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

export async function getTransactionsByOrg(organizationId: string | null) {
  if (!organizationId) return { success: true, data: [] };
  const { data, error } = await supabase
    .from("branch_transactions")
    .select(TRANSACTION_SELECT)
    .in("branchId", (await getBranchIdsByOrg(organizationId)) || [])
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map(mapTransaction) };
}

async function getBranchIdsByOrg(organizationId: string | null): Promise<string[]> {
  if (!organizationId) return [];
  const { data, error } = await supabase.from("branches").select("id").eq("organizationId", organizationId);
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((b) => b.id);
}

export async function rechargeWallet(branchId: string | null, input: { amount: number; paymentMethod: string; description?: string; reference?: string }) {
  if (!branchId) return { success: false, error: "Missing branch" };
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "Invalid amount" };
  const pm = (input.paymentMethod || "UPI").toUpperCase();
  const { data: wallet, error: wErr } = await supabase.from("branch_wallets").select("*").eq("branchId", branchId).single();
  if (wErr && wErr.code !== "PGRST116") throw new Error(wErr.message);
  const currentBalance = Number(wallet?.balance || 0);
  const newBalance = currentBalance + amount;
  // `id` and `updatedAt` are NOT NULL with no database default -- see lib/id.ts.
  if (wallet?.id) {
    const { error: uErr } = await supabase.from("branch_wallets").update({
      balance: newBalance,
      lastRechargeAmount: amount,
      lastRechargeDate: nowIso(),
      updatedAt: nowIso(),
    }).eq("id", wallet.id);
    if (uErr) throw new Error(uErr.message);
  } else {
    const { error: iErr } = await supabase.from("branch_wallets").insert({
      id: newId("wal"),
      branchId,
      balance: newBalance,
      lastRechargeAmount: amount,
      lastRechargeDate: nowIso(),
      updatedAt: nowIso(),
    });
    if (iErr) throw new Error(iErr.message);
  }
  const { data: tx, error: tErr } = await supabase.from("branch_transactions").insert({
    id: newId("txn"),
    branchId,
    amount,
    type: "CREDIT",
    category: "RECHARGE",
    description: input.description || "Wallet recharge",
    reference: input.reference || null,
    status: "COMPLETED",
    paymentMethod: pm as any,
    balanceAfter: newBalance,
    updatedAt: nowIso(),
  }).select("*").single();
  if (tErr) throw new Error(tErr.message);
  return { success: true, data: tx };
}

export async function getFeeTypes() {
  return { success: true, data: [] };
}

export async function getFeeGroups() {
  return { success: true, data: [] };
}
