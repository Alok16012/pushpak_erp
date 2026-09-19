/**
 * Putting students into a batch.
 *
 * The rules live here rather than in the page because they are the part worth
 * being sure about: a seat count that is wrong lets a batch overfill, and an
 * assignment that quietly moves someone out of another batch is a change
 * nobody asked for.
 */

/** A student as the assignment screen reads them. */
export interface AssignableStudent {
  id: string;
  name: string;
  code: string;
  phone: string;
  /** The batch they are in today, or "" when they are unplaced. */
  batchId: string;
  courseId: string;
}

export type Placement = "Unassigned" | "In this batch" | "In another batch";

export function placementOf(student: AssignableStudent, batchId: string): Placement {
  if (!student.batchId) return "Unassigned";
  return student.batchId === batchId ? "In this batch" : "In another batch";
}

/**
 * How many more will fit.
 *
 * `null` when the batch has no seat limit — unlimited is not the same as zero,
 * and treating it as zero would refuse every assignment.
 */
export function seatsLeft(capacity: number | undefined | null, taken: number): number | null {
  if (capacity === undefined || capacity === null || !Number.isFinite(capacity)) return null;
  return Math.max(0, Number(capacity) - taken);
}

/**
 * Why this selection cannot be assigned, or null when it can.
 *
 * Counted against the seats actually free, so selecting someone who is already
 * in the batch does not consume one twice.
 */
export function assignmentProblem(input: {
  batchId: string;
  selected: AssignableStudent[];
  capacity: number | undefined | null;
  taken: number;
}): string | null {
  if (!input.batchId) return "Pick the batch to assign these students to.";
  if (!input.selected.length) return "Select at least one student.";

  const joining = input.selected.filter((student) => student.batchId !== input.batchId);
  const free = seatsLeft(input.capacity, input.taken);
  if (free !== null && joining.length > free) {
    return free === 0
      ? "This batch is full. Free a seat or raise its capacity first."
      : `Only ${free} ${free === 1 ? "seat is" : "seats are"} left in this batch, and ${joining.length} students are selected.`;
  }
  return null;
}

/** Those who would be moved out of a batch they are already in. */
export const movingFrom = (selected: AssignableStudent[], batchId: string) =>
  selected.filter((student) => student.batchId && student.batchId !== batchId);
