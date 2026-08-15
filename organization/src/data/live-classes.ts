/**
 * Live-class schedule shared by the setup form and the class list, so a class
 * scheduled on one screen shows up on the other.
 */
export interface LiveClass {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  course: string;
  batch: string;
  date: string;
  time: string;
  duration: string;
  platform: string;
  meetingLink?: string;
  meetingId?: string;
  description?: string;
  attendees: number;
  totalStudents: number;
  status: "scheduled" | "active" | "completed" | "cancelled";
  recorded?: boolean;
}

export const LIVE_CLASSES_KEY = "erp-live-classes";

/** Dated around today so "Live now" and "Upcoming" are not perpetually empty. */
const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const LIVE_CLASS_SEED: LiveClass[] = [
  { id: "1", title: "Introduction to Algorithms", subject: "Computer Science", instructor: "Dr. John Smith", course: "Computer Science", batch: "2024-A", date: day(0), time: "10:00 AM", duration: "1 hour", platform: "Zoom", meetingLink: "https://zoom.us/j/8841203397", attendees: 42, totalStudents: 45, status: "active", recorded: true },
  { id: "2", title: "Organic Chemistry Basics", subject: "Chemistry", instructor: "Prof. Sarah Johnson", course: "Science", batch: "2024-B", date: day(0), time: "2:00 PM", duration: "1.5 hours", platform: "Google Meet", meetingLink: "https://meet.google.com/hqz-krmt-ovd", attendees: 0, totalStudents: 38, status: "scheduled" },
  { id: "3", title: "Financial Accounting", subject: "Accounting", instructor: "Mr. Michael Brown", course: "Commerce", batch: "2024-A", date: day(-1), time: "11:00 AM", duration: "1 hour", platform: "Zoom", meetingLink: "https://zoom.us/j/7712049886", attendees: 35, totalStudents: 40, status: "completed", recorded: true },
  { id: "4", title: "English Literature", subject: "English", instructor: "Ms. Emily Davis", course: "Arts", batch: "2024-C", date: day(1), time: "3:00 PM", duration: "1 hour", platform: "Microsoft Teams", meetingLink: "https://teams.microsoft.com/l/meetup-join/19%3ameeting", attendees: 0, totalStudents: 32, status: "scheduled" },
  { id: "5", title: "Physics Lab Session", subject: "Physics", instructor: "Dr. Robert Wilson", course: "Science", batch: "2024-A", date: day(-2), time: "9:00 AM", duration: "2 hours", platform: "Zoom", meetingLink: "https://zoom.us/j/2298104477", attendees: 28, totalStudents: 30, status: "completed", recorded: false },
];

export const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Computer Science", "English"];
export const COURSES = ["Computer Science", "Science", "Commerce", "Arts"];
export const BATCHES = ["2024-A", "2024-B", "2024-C"];
export const INSTRUCTORS = ["Dr. John Smith", "Prof. Sarah Johnson", "Mr. Michael Brown", "Ms. Emily Davis"];
export const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Cisco Webex", "Custom Link"];
export const DURATIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

/** Roll strength per batch — used to fill `totalStudents` on a new class. */
export const BATCH_SIZE: Record<string, number> = { "2024-A": 45, "2024-B": 38, "2024-C": 32 };

/** A stand-in join link, so a scheduled class always has something to open. */
export const generateMeetingLink = (platform: string) => {
  const id = Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000);
  if (platform === "Google Meet") return `https://meet.google.com/${String(id).slice(0, 3)}-${String(id).slice(3, 7)}-${String(id).slice(7, 10)}`;
  if (platform === "Microsoft Teams") return `https://teams.microsoft.com/l/meetup-join/${id}`;
  if (platform === "Cisco Webex") return `https://webex.com/meet/${id}`;
  return `https://zoom.us/j/${id}`;
};
