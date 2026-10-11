/**
 * Everything the site says about the academy in one place: name, contact
 * details and the menu. Change a number here and every page changes.
 */
export const site = {
  name: "PNS Academy",
  fullName: "PNS Digiskills Academy",
  tagline: "Learn • Grow • Succeed",
  description:
    "Computer education aur professional digital skills ke through students ko career-ready banana — computer, accounting, design, coding, digital marketing aur AI courses.",
  phone: "+91 98765 43210",
  whatsapp: "919876543210",
  email: "info@pnsacademy.in",
  address: "PNS Academy, Bihar, India",
  hours: "Mon – Sat, 09:00 AM – 06:00 PM",
  erp: "/computercentre/",
};

export const tel = `tel:${site.phone.replace(/\s/g, "")}`;

/** A WhatsApp chat with the academy, optionally with the message typed in. */
export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** A page's address. Every page, old or new, is served as /<name>.html. */
export const page = (name: string) => (name === "index" ? "/" : `/${name}.html`);

export type NavLink = { label: string; href: string; note?: string };
export type NavGroup = { label: string; items: NavLink[] };

export const nav: Array<NavLink | NavGroup> = [
  { label: "Home", href: page("index") },
  { label: "About", href: page("about") },
  {
    label: "Courses",
    items: [
      { label: "Certified Computer Courses", href: page("computer-course"), note: "Computer fundamentals & office" },
      { label: "Accounting & Taxation", href: page("accounting"), note: "Tally, GST & accounting" },
      { label: "Graphic & Architecture", href: page("graphics"), note: "Design, CAD & sketch" },
      { label: "Programming", href: page("coding"), note: "Learn modern programming" },
      { label: "Web Development", href: page("html"), note: "HTML, CSS, JS & responsive design" },
      { label: "Digital Marketing", href: page("digital-marketing"), note: "SEO, social media & ads" },
    ],
  },
  {
    label: "Academic",
    items: [
      { label: "BSEB IX – X", href: page("bihar_board") },
      { label: "BSEB XII Arts", href: page("bihar_arts") },
      { label: "BSEB Commerce", href: page("commerce") },
      { label: "Competitive Exams", href: page("pcs") },
      { label: "Spoken English", href: page("spoken-english"), note: "Personality development" },
    ],
  },
  {
    label: "AI Program",
    items: [
      { label: "AI Foundation", href: page("ai_foundation"), note: "AI & prompt engineering" },
      { label: "AI Tools & Automation", href: page("ai_automation"), note: "Automation & productivity" },
      { label: "AI Career Program", href: page("ai_carrer"), note: "Learn → Freelance → Earn" },
    ],
  },
  {
    label: "Internship",
    items: [
      { label: "Telecaller / Counsellor", href: page("internship_telecaller") },
      { label: "Data Entry Operator", href: page("internship_backoffice") },
      { label: "Accounting Expert", href: page("internship_accounting") },
      { label: "Graphic Designer", href: page("internship_graphic-designer") },
      { label: "Frontend Developer", href: page("internship_website-designer") },
      { label: "Backend Developer", href: page("intrenship_website-developer") },
      { label: "Digital Marketing", href: page("internship_digital-marketing") },
      { label: "Career", href: page("carrer") },
    ],
  },
  {
    label: "Portal",
    items: [
      { label: "Student Login", href: `${site.erp}login?as=student`, note: "Result, ID card & fee payment" },
      { label: "Franchise Login", href: `${site.erp}login?as=franchise`, note: "Franchise portal" },
      { label: "Franchise Opportunity", href: page("franchise"), note: "Start your training centre" },
    ],
  },
  { label: "Contact", href: page("contact") },
];
