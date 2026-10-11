import { page } from "./site";

export type Course = {
  title: string;
  category: string;
  description: string;
  duration: string;
  level: string;
  fee: number;
  mrp?: number;
  tags: string[];
  image: string;
  /** The course's own page, where it has one. */
  href?: string;
};

/** The courses the home page leads with. */
export const popularCourses: Course[] = [
  {
    title: "ADCA",
    category: "Computer",
    description: "Advanced Diploma in Computer Applications with office, accounting, designing, internet and web skills.",
    duration: "12 Months",
    level: "Advanced",
    fee: 4500,
    mrp: 7500,
    tags: ["MS Office", "Tally", "Web"],
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    href: page("computer-course"),
  },
  {
    title: "Tally Prime With GST",
    category: "Accounting",
    description: "Practical accounting, GST, inventory, billing, reports and complete business accounting.",
    duration: "3 Months",
    level: "Professional",
    fee: 2999,
    mrp: 4999,
    tags: ["Tally Prime", "GST", "Billing"],
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80",
    href: page("tally-prime"),
  },
  {
    title: "Graphic Designing",
    category: "Design",
    description: "Photoshop, CorelDRAW, PageMaker, Canva, branding, print design and creative projects.",
    duration: "6 Months",
    level: "Creative",
    fee: 3999,
    mrp: 6999,
    tags: ["Photoshop", "CorelDRAW", "Canva"],
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=80",
    href: page("graphics"),
  },
  {
    title: "Digital Marketing",
    category: "Marketing",
    description: "SEO, social media, content marketing, ads, analytics and digital business growth.",
    duration: "6 Months",
    level: "Career",
    fee: 5999,
    mrp: 9999,
    tags: ["SEO", "Social Media", "Ads"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
    href: page("digital-marketing"),
  },
  {
    title: "Website Design",
    category: "Web",
    description: "HTML, CSS, JavaScript, responsive design, WordPress, Elementor and practical websites.",
    duration: "6 Months",
    level: "Development",
    fee: 4999,
    mrp: 7999,
    tags: ["HTML", "CSS", "JavaScript"],
    image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=900&q=80",
    href: page("html"),
  },
  {
    title: "Python Programming",
    category: "Programming",
    description: "Python programming, OOP, automation, databases and practical programming projects.",
    duration: "6 Months",
    level: "Programming",
    fee: 4999,
    mrp: 7999,
    tags: ["Python", "OOP", "Projects"],
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80",
    href: page("python"),
  },
];

/** The certified computer courses. */
export const computerCourses: Course[] = [
  {
    title: "Google Suite",
    category: "Office",
    description: "Google Docs, Sheets, Drive, Forms, Gmail and online collaboration.",
    duration: "2 Months",
    level: "Beginner",
    fee: 1999,
    tags: ["Docs", "Sheets", "Drive"],
    image: "/image/gs.webp",
    href: page("google-office"),
  },
  {
    title: "DCA With AI",
    category: "Office",
    description: "MS Word, Excel, PowerPoint, documents and office productivity with AI tools.",
    duration: "3 Months",
    level: "Practical",
    fee: 3499,
    tags: ["Word", "Excel", "PowerPoint"],
    image: "/image/dca.webp",
    href: page("ms-office"),
  },
  {
    title: "Tally Prime With GST",
    category: "Accounting",
    description: "Accounting, GST, inventory, taxation, payroll and reports.",
    duration: "3 Months",
    level: "Job Ready",
    fee: 3499,
    mrp: 6500,
    tags: ["Accounting", "GST", "Payroll"],
    image: "/image/tally.webp",
    href: page("tally-prime"),
  },
  {
    title: "Cybercafe Management",
    category: "Services",
    description: "Online forms, printing, scanning, government portals and running a cyber café.",
    duration: "3 Months",
    level: "Advanced",
    fee: 3999,
    tags: ["Online Forms", "Printing", "Portals"],
    image: "/image/cyber.webp",
    href: page("cybercafe-mangement"),
  },
  {
    title: "Hindi & English Typing",
    category: "Typing",
    description: "Hindi and English typing speed and accuracy for data entry and office work.",
    duration: "3 Months",
    level: "Beginner",
    fee: 3499,
    tags: ["Hindi", "English", "Speed"],
    image: "/image/typing.webp",
    href: page("typing"),
  },
  {
    title: "Back Office / Computer Operator",
    category: "Office",
    description: "Data entry, MS Office, Excel, internet, email, documentation, online work and office management.",
    duration: "3 Months",
    level: "Beginner",
    fee: 5499,
    tags: ["Excel", "Email", "Documentation"],
    image: "/image/backoffice.webp",
    href: page("back-office"),
  },
  {
    title: "Data Entry Operator",
    category: "Office",
    description: "Fast, accurate data entry, Excel records, MIS reporting and documentation.",
    duration: "3 Months",
    level: "Practical",
    fee: 5499,
    tags: ["Data Entry", "Excel", "MIS"],
    image: "/image/deo.webp",
    href: page("deo"),
  },
  {
    title: "ADCA With AI",
    category: "Diploma",
    description: "Office, accounting, designing, internet and web skills in one advanced diploma, with AI tools.",
    duration: "6 Months",
    level: "Job Ready",
    fee: 6499,
    tags: ["Office", "Tally", "Design"],
    image: "/image/adca.webp",
  },
];

/** Other course families, each with its own page on the site. */
export const courseFamilies = [
  { title: "Accounting & Taxation", note: "Tally, GST, Busy & income tax", href: page("accounting") },
  { title: "Graphic & Architecture", note: "Photoshop, CorelDRAW, AutoCAD", href: page("graphics") },
  { title: "Programming", note: "C, Java, Python, React, Node", href: page("coding") },
  { title: "Web Development", note: "HTML, CSS, JavaScript, WordPress", href: page("html") },
  { title: "Digital Marketing", note: "SEO, social media & ads", href: page("digital-marketing") },
  { title: "AI Programs", note: "AI tools, automation & careers", href: page("ai_foundation") },
  { title: "Spoken English", note: "Communication & personality", href: page("spoken-english") },
  { title: "Video Editing", note: "Premiere, effects & reels", href: page("video_editior") },
];

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const discount = (c: Course) => (c.mrp ? Math.round((1 - c.fee / c.mrp) * 100) : 0);
