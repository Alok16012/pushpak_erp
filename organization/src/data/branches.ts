/**
 * The branch register, shared by ViewBranch (list) and CreateBranch (form) so a
 * branch created on one screen actually shows up on the other. The backend does
 * not model branches yet, so this persists through `useLocalCollection`.
 */
export interface Branch {
  id: string;
  name: string;
  code: string;
  type: string;
  instituteType: string;
  city: string;
  state: string;
  students: number;
  staff: number;
  revenue: number;
  status: "active" | "inactive";
  expiryDate: string;
}

export const BRANCHES_KEY = "erp-branches";

export const BRANCH_SEED: Branch[] = [
  { id: "1", name: "Main Campus", code: "BR001", type: "Main Branch", instituteType: "Computer Institute", city: "Mumbai", state: "Maharashtra", students: 1200, staff: 85, revenue: 2500000, status: "active", expiryDate: "2025-12-31" },
  { id: "2", name: "North Campus", code: "BR002", type: "Sub Branch", instituteType: "Typing Institute", city: "Delhi", state: "Delhi", students: 850, staff: 60, revenue: 1800000, status: "active", expiryDate: "2025-06-30" },
  { id: "3", name: "South Campus", code: "BR003", type: "Sub Branch", instituteType: "Computer Institute", city: "Bangalore", state: "Karnataka", students: 650, staff: 45, revenue: 1400000, status: "active", expiryDate: "2025-09-15" },
  { id: "4", name: "East Campus", code: "BR004", type: "Franchise", instituteType: "Paramedical Institute", city: "Kolkata", state: "West Bengal", students: 420, staff: 32, revenue: 950000, status: "active", expiryDate: "2025-03-31" },
  { id: "5", name: "West Campus", code: "BR005", type: "Sub Branch", instituteType: "Other", city: "Ahmedabad", state: "Gujarat", students: 380, staff: 28, revenue: 820000, status: "inactive", expiryDate: "2024-12-31" },
];

/** Select option values → the labels stored on a branch record. */
export const BRANCH_TYPES: Record<string, string> = {
  main: "Main Branch",
  sub: "Sub Branch",
  franchise: "Franchise",
};

export const INSTITUTE_TYPES: Record<string, string> = {
  computer: "Computer Institute",
  typing: "Typing Institute",
  paramedical: "Paramedical Institute",
  other: "Other",
};

/** `maharashtra` / `uttar-pradesh` → `Maharashtra` / `Uttar Pradesh`. */
export const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
