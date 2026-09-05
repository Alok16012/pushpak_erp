import { supabase } from "./client";

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

  const dueQuery = supabase.from("fee_invoices").select("*").in("status", ["PENDING", "PARTIAL", "OVERDUE"]);
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

  const outstanding = (dueRes.data || []).reduce((sum, inv: any) => sum + Number(inv.netAmount || inv.totalAmount || 0), 0);

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
  let query = supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .is("deletedAt", null)
    .single();
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
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
  let query = supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .is("deletedAt", null)
    .single();
  if (branchId) query = query.eq("branchId", branchId);
  const { data, error } = await query;
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

function mapCourse(row: Record<string, unknown>) {
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

export async function createCourse(organizationId: string | null, input: Record<string, unknown>) {
  const { durationMonths, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest, organizationId };
  // Callers speak months; the column pair is what actually exists.
  if (payload.durationValue === undefined) {
    payload.durationValue = Number(durationMonths) || 1;
    payload.durationUnit = "MONTHS";
  }
  const { data, error } = await supabase.from("courses").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return { success: true, data: mapCourse(data as Record<string, unknown>) };
}

/** Soft delete, matching the `deletedAt is null` filter used when reading. */
export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").update({ deletedAt: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/** Added by `supabase/schema/add-batch-fee-fields.sql`; may not be deployed. */
const BATCH_OPTIONAL_COLUMNS = ["feeDiscount", "remark"];

/** The column is `maxSeats`; the screens say `maxStudents`. Expose both. */
function mapBatch(row: Record<string, unknown>) {
  return {
    ...row,
    maxStudents: row.maxSeats === null || row.maxSeats === undefined ? undefined : Number(row.maxSeats),
    feeDiscount: row.feeDiscount === undefined ? 0 : Number(row.feeDiscount) || 0,
    remark: (row.remark as string) ?? "",
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
async function withEnrolmentCounts(rows: Record<string, unknown>[]) {
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

export async function getBatchTimings(branchId: string, filters?: { batchId?: string; courseId?: string }) {
  let query = supabase.from("batch_timings").select("*").order("batchId").order("day").order("startTime");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let result = data || [];
  if (filters?.batchId) result = result.filter((t: any) => t.batchId === filters.batchId);
  return { success: true, data: result };
}

export async function createBatchTiming(input: Record<string, unknown>) {
  const { data, error } = await supabase.from("batch_timings").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateBatchTiming(id: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("batch_timings").update(input).eq("id", id).select("*").single();
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

export async function getInvoices(branchId: string | null) {
  let query = supabase
    .from("fee_invoices")
    .select("*")
    .in("status", ["PENDING", "PARTIAL", "OVERDUE"])
    .order("createdAt", { ascending: false });
  if (branchId) {
    query = query.eq("branchId", branchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}

export async function createInvoice(branchId: string, input: Record<string, unknown>) {
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase.from("fee_invoices").insert({ ...input, invoiceNumber }).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateInvoice(id: string, _branchId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("fee_invoices").update(input).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
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
  return { success: true, data: data || [] };
}

export async function createExam(branchId: string | null, input: Record<string, unknown>) {
  if (!branchId) throw new Error("Branch ID required to create exam");
  const { data, error } = await supabase.from("exams").insert({ ...input, branchId }).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateExam(id: string, branchId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("exams").update(input).eq("id", id).eq("branchId", branchId).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function submitExamResults(examId: string, branchId: string, results: Array<{ studentId: string; marksObtained: number; remarks?: string }>, publish = false) {
  const exam = await getExamById(examId, branchId);
  if (!exam) throw new Error("Exam not found");

  const upserts = results.map(r => ({
    examId,
    studentId: r.studentId,
    marksObtained: r.marksObtained,
    remarks: r.remarks || null,
  }));

  const { data, error } = await supabase.from("exam_results").upsert(upserts, { onConflict: "examId_studentId" }).select("*");
  if (error) throw new Error(error.message);

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

export async function createBranch(organizationId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("branches").insert({ ...input, organizationId }).select("*").single();
  if (error) throw new Error(error.message);
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

  const [addresses, licenses, students, invoices] = await Promise.all([
    supabase.from("branch_addresses").select("branchId, city, state").in("branchId", ids),
    supabase.from("branch_licenses").select("branchId, expiryDate").in("branchId", ids),
    supabase.from("students").select("id, branchId").in("branchId", ids).is("deletedAt", null),
    supabase.from("fee_invoices").select("branchId, totalAmount, paidAmount").in("branchId", ids),
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
  const { data: branch, error } = await supabase
    .from("branches")
    .insert({ ...input.branch, organizationId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

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
    await supabase.from("branches").delete().eq("id", branchId);
    throw err;
  }

  return { success: true, data: branch };
}

export async function updateBranch(id: string, organizationId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("branches").update(input).eq("id", id).eq("organizationId", organizationId).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
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
    // the function replies with { error } on 4xx, which is more useful than "non-2xx"
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
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

/* ============================
   MISC / SETTINGS
   ============================ */

export async function getBranchSettings(branchId: string | null) {
  if (!branchId) return { success: true, data: null };
  const { data, error } = await supabase.from("branch_settings").select("*").eq("branchId", branchId).single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return { success: true, data: data || null };
}

export async function updateBranchSettings(branchId: string | null, input: Record<string, unknown>) {
  if (!branchId) return { success: true, data: null };
  const { data, error } = await supabase.from("branch_settings").upsert({ ...input, branchId }).select("*").single();
  if (error) throw new Error(error.message);
  return { success: true, data };
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

function mapTransaction(row: Record<string, unknown>) {
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
  if (wallet?.id) {
    const { error: uErr } = await supabase.from("branch_wallets").update({
      balance: newBalance,
      lastRechargeAmount: amount,
      lastRechargeDate: new Date().toISOString(),
    }).eq("id", wallet.id);
    if (uErr) throw new Error(uErr.message);
  } else {
    const { error: iErr } = await supabase.from("branch_wallets").insert({
      branchId,
      balance: newBalance,
      lastRechargeAmount: amount,
      lastRechargeDate: new Date().toISOString(),
    });
    if (iErr) throw new Error(iErr.message);
  }
  const { data: tx, error: tErr } = await supabase.from("branch_transactions").insert({
    branchId,
    amount,
    type: "CREDIT",
    category: "RECHARGE",
    description: input.description || "Wallet recharge",
    reference: input.reference || null,
    status: "COMPLETED",
    paymentMethod: pm as any,
    balanceAfter: newBalance,
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
