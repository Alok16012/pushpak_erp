/**
 * The enquiry pipeline, shared by the three enquiry screens: the website forms
 * (/enquiry/online-branch, /enquiry/online-student) feed the branch enquiry
 * desk (/enquiry/branch), so "Convert to Lead" on one page produces a row the
 * other page can actually work.
 */

/** `YYYY-MM-DD`, `offset` days from today — fixtures must stay near "now". */
export const dayOffset = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export interface FollowUp {
  date: string;
  by: string;
  note: string;
}

export interface Enquiry {
  id: string;
  date: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  source: string;
  assignedTo: string;
  followUpDate: string;
  status: "new" | "contacted" | "interested" | "converted" | "closed";
  priority: "high" | "medium" | "low";
  notes?: string;
  followUps?: FollowUp[];
}

export interface OnlineEnquiry {
  id: string;
  date: string;
  branch: string;
  name: string;
  phone: string;
  email: string;
  enquiryType: string;
  message: string;
  ipAddress: string;
  status: "pending" | "reviewed" | "responded" | "closed";
  response?: string;
  convertedTo?: string;
}

export interface StudentEnquiry {
  id: string;
  date: string;
  name: string;
  phone: string;
  email: string;
  currentClass: string;
  applyingFor: string;
  parentName: string;
  parentPhone: string;
  city: string;
  preferredBranch: string;
  status: "new" | "contacted" | "scheduled" | "visited" | "applied";
  visitDate?: string;
  infoPackSentOn?: string;
  closedReason?: string;
}

export const ENQUIRY_KEY = "erp-branch-enquiries";
export const ONLINE_ENQUIRY_KEY = "erp-online-branch-enquiries";
export const STUDENT_ENQUIRY_KEY = "erp-online-student-enquiries";

export const COURSE_OPTIONS = [
  "Computer Science",
  "Commerce",
  "Engineering",
  "Medical",
  "Arts",
  "Science",
];

export const SOURCE_OPTIONS = [
  "Walk-in",
  "Phone Call",
  "Referral",
  "Website",
  "Social Media",
];

export const STAFF_OPTIONS = ["John Doe", "Jane Smith", "Mike Johnson"];

export const BRANCH_OPTIONS = [
  "Main Campus",
  "North Campus",
  "South Campus",
  "East Campus",
];

export const ENQUIRY_SEED: Enquiry[] = [
  { id: "1", date: dayOffset(0), name: "Rahul Sharma", phone: "+91 98765 43210", email: "rahul@example.com", course: "Computer Science", source: "Walk-in", assignedTo: "John Doe", followUpDate: dayOffset(3), status: "new", priority: "high", notes: "Wants the evening batch." },
  { id: "2", date: dayOffset(0), name: "Priya Patel", phone: "+91 87654 32109", email: "priya@example.com", course: "Commerce", source: "Website", assignedTo: "Jane Smith", followUpDate: dayOffset(2), status: "contacted", priority: "medium", followUps: [{ date: dayOffset(0), by: "Jane Smith", note: "Called — asked for the fee structure over email." }] },
  { id: "3", date: dayOffset(-1), name: "Amit Kumar", phone: "+91 76543 21098", email: "amit@example.com", course: "Engineering", source: "Referral", assignedTo: "John Doe", followUpDate: dayOffset(1), status: "interested", priority: "high", followUps: [{ date: dayOffset(-1), by: "John Doe", note: "Visited campus with parents, keen on the CS-2024-A batch." }] },
  { id: "4", date: dayOffset(-1), name: "Sneha Gupta", phone: "+91 65432 10987", email: "sneha@example.com", course: "Medical", source: "Social Media", assignedTo: "Mike Johnson", followUpDate: dayOffset(4), status: "converted", priority: "medium" },
  { id: "5", date: dayOffset(-2), name: "Vikram Singh", phone: "+91 54321 09876", email: "vikram@example.com", course: "Arts", source: "Walk-in", assignedTo: "Jane Smith", followUpDate: dayOffset(-1), status: "closed", priority: "low", notes: "Chose another institute." },
];

export const ONLINE_ENQUIRY_SEED: OnlineEnquiry[] = [
  { id: "1", date: `${dayOffset(0)} 10:30 AM`, branch: "Main Campus", name: "Ravi Kumar", phone: "+91 98765 43210", email: "ravi@example.com", enquiryType: "Admission", message: "Interested in admission for B.Tech program", ipAddress: "192.168.1.100", status: "pending" },
  { id: "2", date: `${dayOffset(0)} 09:15 AM`, branch: "North Campus", name: "Anita Sharma", phone: "+91 87654 32109", email: "anita@example.com", enquiryType: "Fee Structure", message: "Please share the fee structure for MBA", ipAddress: "192.168.1.101", status: "reviewed" },
  { id: "3", date: `${dayOffset(-1)} 04:45 PM`, branch: "Main Campus", name: "Deepak Verma", phone: "+91 76543 21098", email: "deepak@example.com", enquiryType: "Course Details", message: "Looking for information about BCA course", ipAddress: "192.168.1.102", status: "responded", response: "Shared the BCA prospectus and the 2024 intake calendar." },
  { id: "4", date: `${dayOffset(-1)} 02:30 PM`, branch: "South Campus", name: "Meera Joshi", phone: "+91 65432 10987", email: "meera@example.com", enquiryType: "Scholarship", message: "What scholarships are available?", ipAddress: "192.168.1.103", status: "pending" },
  { id: "5", date: `${dayOffset(-2)} 11:00 AM`, branch: "East Campus", name: "Suresh Reddy", phone: "+91 54321 09876", email: "suresh@example.com", enquiryType: "Hostel", message: "Need information about hostel facilities", ipAddress: "192.168.1.104", status: "closed" },
];

export const STUDENT_ENQUIRY_SEED: StudentEnquiry[] = [
  { id: "1", date: dayOffset(0), name: "Arjun Mehta", phone: "+91 98765 43210", email: "arjun@example.com", currentClass: "10th", applyingFor: "11th Science", parentName: "Rajesh Mehta", parentPhone: "+91 98765 43211", city: "Mumbai", preferredBranch: "Main Campus", status: "new" },
  { id: "2", date: dayOffset(0), name: "Kavya Nair", phone: "+91 87654 32109", email: "kavya@example.com", currentClass: "12th", applyingFor: "B.Tech CSE", parentName: "Suresh Nair", parentPhone: "+91 87654 32110", city: "Pune", preferredBranch: "North Campus", status: "contacted" },
  { id: "3", date: dayOffset(-1), name: "Rohan Desai", phone: "+91 76543 21098", email: "rohan@example.com", currentClass: "9th", applyingFor: "10th", parentName: "Mahesh Desai", parentPhone: "+91 76543 21099", city: "Delhi", preferredBranch: "Main Campus", status: "scheduled", visitDate: dayOffset(2) },
  { id: "4", date: dayOffset(-1), name: "Ishika Kapoor", phone: "+91 65432 10987", email: "ishika@example.com", currentClass: "12th", applyingFor: "BBA", parentName: "Vinod Kapoor", parentPhone: "+91 65432 10988", city: "Bangalore", preferredBranch: "South Campus", status: "visited", visitDate: dayOffset(-1) },
  { id: "5", date: dayOffset(-2), name: "Aditya Rao", phone: "+91 54321 09876", email: "aditya@example.com", currentClass: "Graduate", applyingFor: "MBA", parentName: "Krishna Rao", parentPhone: "+91 54321 09877", city: "Hyderabad", preferredBranch: "Main Campus", status: "applied" },
];

/**
 * Read the branch-enquiry list straight from storage and prepend a lead. The
 * online pages are not mounted alongside the branch desk, so a plain read/write
 * is enough and avoids a second `useLocalCollection` on every online screen.
 */
export function pushLead(lead: Omit<Enquiry, "id">) {
  try {
    const raw = localStorage.getItem(ENQUIRY_KEY);
    const current: Enquiry[] = raw ? (JSON.parse(raw) as Enquiry[]) : ENQUIRY_SEED;
    const row: Enquiry = { ...lead, id: `lead-${Date.now().toString(36)}` };
    localStorage.setItem(ENQUIRY_KEY, JSON.stringify([row, ...current]));
    return row;
  } catch {
    return null;
  }
}
