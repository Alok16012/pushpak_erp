import { describe, it, expect } from "vitest";

import {
  assignmentProblem,
  movingFrom,
  placementOf,
  seatsLeft,
  type AssignableStudent,
} from "@/lib/batchAssignment";

const student = (id: string, batchId = ""): AssignableStudent => ({
  id,
  name: `Student ${id}`,
  code: `APP-${id}`,
  phone: "9876543210",
  batchId,
  courseId: "c1",
});

describe("seatsLeft", () => {
  it("counts what is free", () => {
    expect(seatsLeft(30, 18)).toBe(12);
    expect(seatsLeft(30, 30)).toBe(0);
  });

  it("never goes negative when a batch is already over its limit", () => {
    expect(seatsLeft(20, 25)).toBe(0);
  });

  // Unlimited is not zero: treating it as zero would refuse every assignment.
  it("says nothing about a batch with no seat limit", () => {
    expect(seatsLeft(undefined, 40)).toBeNull();
    expect(seatsLeft(null, 40)).toBeNull();
  });
});

describe("placementOf", () => {
  it("tells the three states apart", () => {
    expect(placementOf(student("1"), "b1")).toBe("Unassigned");
    expect(placementOf(student("2", "b1"), "b1")).toBe("In this batch");
    expect(placementOf(student("3", "b2"), "b1")).toBe("In another batch");
  });
});

describe("assignmentProblem", () => {
  const base = { batchId: "b1", capacity: 30, taken: 28 };

  it("passes a selection that fits", () => {
    expect(assignmentProblem({ ...base, selected: [student("1"), student("2")] })).toBeNull();
  });

  it("asks for a batch and for a selection", () => {
    expect(assignmentProblem({ ...base, batchId: "", selected: [student("1")] })).toMatch(/batch/i);
    expect(assignmentProblem({ ...base, selected: [] })).toMatch(/select at least one/i);
  });

  it("refuses to overfill, and says how many seats are left", () => {
    const problem = assignmentProblem({
      ...base,
      selected: [student("1"), student("2"), student("3")],
    });
    expect(problem).toMatch(/only 2 seats are left/i);
  });

  it("says plainly when the batch is full", () => {
    expect(assignmentProblem({ ...base, taken: 30, selected: [student("1")] })).toMatch(/full/i);
  });

  // Re-selecting someone already in the batch must not consume a second seat.
  it("does not charge a seat to a student already in the batch", () => {
    expect(
      assignmentProblem({
        ...base,
        taken: 30,
        selected: [student("1", "b1"), student("2", "b1")],
      }),
    ).toBeNull();
  });

  it("lets a batch with no seat limit take everyone", () => {
    const many = Array.from({ length: 200 }, (_, i) => student(String(i)));
    expect(assignmentProblem({ batchId: "b1", capacity: undefined, taken: 500, selected: many })).toBeNull();
  });
});

describe("movingFrom", () => {
  // Assigning someone who is already placed moves them out of that batch, and
  // the screen has to say so rather than doing it quietly.
  it("names those being moved out of another batch", () => {
    const moved = movingFrom([student("1"), student("2", "b2"), student("3", "b1")], "b1");
    expect(moved.map((s) => s.id)).toEqual(["2"]);
  });
});
