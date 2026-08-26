/**
 * Course-completion certificates, shared by the designer (/certificate/template)
 * and the generator (/certificate/generate) so a template saved in one is
 * printable from the other — the same arrangement the ID cards use.
 *
 * The *format* below is fixed: branch code, institute block, script title,
 * verification QR, the certify/registration two-column head, the course band,
 * the authorising-body block, three signatories and the certificate footer all
 * sit where they sit. What a template carries is the wording and the marks that
 * fill that format; what a student record carries is everything personal.
 */

export interface CertificateSignatory {
  id: string;
  name: string;
  role: string;
  /** Data URL of a scanned signature; falls back to a ruled line. */
  signature: string | null;
}

export interface CertificateBadge {
  id: string;
  label: string;
  /** Data URL of the accreditation mark; falls back to a lettered pill. */
  image: string | null;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  status: "active" | "draft";

  /* Institute identity — the top block. */
  branchCode: string;
  instituteName: string;
  addressLine1: string;
  addressLine2: string;
  logo: string | null;
  title: string;

  /* The authorising body — everything under "An Institute Authorized By". */
  authorityHeading: string;
  authorityName: string;
  authorityLines: string[];
  website: string;
  email: string;
  verificationNote: string;
  /** The certificate number is appended to this to build the QR payload. */
  verifyBaseUrl: string;

  /* Standing wording. */
  gradeLegend: string;
  competencyNote: string;

  signatories: CertificateSignatory[];
  badges: CertificateBadge[];

  /* Look. */
  accent: string;
  frame: "guilloche" | "classic" | "plain";
  frameColor: string;
  /** Uploaded artwork that replaces the drawn frame entirely. */
  background: string | null;
  showQr: boolean;
  showLogo: boolean;
  showSeal: boolean;
  showWatermark: boolean;
}

export interface CertificateStudent {
  id: string;
  name: string;
  fatherName: string;
  motherName: string;
  registrationNo: string;
  dob: string;
  aadhaar: string;
  course: string;
  durationMonths: number;
  courseFrom: string;
  courseTo: string;
  marks: number;
  certificateNo: string;
  issueDate: string;
  photo: string | null;
}

export const CERTIFICATE_TEMPLATES_KEY = "erp-certificate-templates";

export const FRAME_OPTIONS = [
  { label: "Guilloche security", value: "guilloche" as const },
  { label: "Classic rule", value: "classic" as const },
  { label: "Plain", value: "plain" as const },
];

export const ACCENT_OPTIONS = [
  { label: "Red", value: "#c1121f" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Green", value: "#15803d" },
  { label: "Purple", value: "#6d28d9" },
  { label: "Ink", value: "#18181b" },
];

export const FRAME_COLORS = [
  { label: "Royal blue", value: "#2f4fbf" },
  { label: "Rose", value: "#c25b86" },
  { label: "Emerald", value: "#177a5a" },
  { label: "Gold", value: "#a5761c" },
  { label: "Graphite", value: "#3f3f46" },
];

/** The grading scale printed in the legend, and used to grade a mark. */
export const GRADE_BANDS = [
  { grade: "A+", label: "Excellent (A+)", min: 85 },
  { grade: "A", label: "Very Good (A)", min: 75 },
  { grade: "B", label: "Good (B)", min: 65 },
  { grade: "C", label: "Pass (C)", min: 45 },
];

export const gradeFor = (marks: number) =>
  GRADE_BANDS.find((band) => marks >= band.min)?.grade ?? "F";

export const DEFAULT_LEGEND =
  "Excellent (A+):- 85%-100%, Very Good (A):- 75%-84%, Good (B):- 65%-74%, Pass(C):- 45%-64%";

export const DEFAULT_COMPETENCY =
  "The Student mentioned above showed the following competency in the final exam of the listed courses and secure these performances under guidance of the certified institute.";

export const CERTIFICATE_TEMPLATE_SEED: CertificateTemplate[] = [
  {
    id: "1",
    name: "ADCA Completion — Guilloche",
    status: "active",
    branchCode: "AIIES05501",
    instituteName: "IT Zone Institute",
    addressLine1: "Near Simartalla Chowk,",
    addressLine2: "Thana Road, Mansurchak",
    logo: null,
    title: "Certificate",
    authorityHeading: "An Institute Authorized By :",
    authorityName: "AIIES EDUCATIONAL SERVICES PRIVATE LIMITED",
    authorityLines: [
      "Registered Under Ministry of Corporate Affairs (Govt. of India)",
      "CIN : U80300BR2022PTC057906 & UDYAM-BR-30-0014803",
      "An ISO : 9001-2015 EGAC Accredited Certified Company",
      "Registered & Head Office :- Ward-12, Loknathpur, Mansurchak Road,",
      "Dalsinghsarai, Samastipur, 848114, Bihar",
    ],
    website: "www.aiieseducation.in",
    email: "help.aiieseducation@gmail.com",
    verificationNote:
      "Online Certificate Verification Available on :- www.aiieseducation.in",
    verifyBaseUrl: "https://aiieseducation.in/verify/",
    gradeLegend: DEFAULT_LEGEND,
    competencyNote: DEFAULT_COMPETENCY,
    signatories: [
      { id: "s1", name: "Dhaneshwar Choudhary", role: "(Centre Head)", signature: null },
      { id: "s2", name: "Aman Kumar", role: "(M.D of AIIES Education)", signature: null },
      { id: "s3", name: "Sohit Kumar", role: "(C.E.O of AIIES Education)", signature: null },
    ],
    badges: [
      { id: "b1", label: "ISO", image: null },
      { id: "b2", label: "MSME", image: null },
      { id: "b3", label: "IAF", image: null },
    ],
    accent: "#c1121f",
    frame: "guilloche",
    frameColor: "#2f4fbf",
    background: null,
    showQr: true,
    showLogo: true,
    showSeal: true,
    showWatermark: true,
  },
  {
    id: "2",
    name: "Short Course — Classic",
    status: "draft",
    branchCode: "AIIES05501",
    instituteName: "IT Zone Institute",
    addressLine1: "Near Simartalla Chowk,",
    addressLine2: "Thana Road, Mansurchak",
    logo: null,
    title: "Certificate",
    authorityHeading: "An Institute Authorized By :",
    authorityName: "AIIES EDUCATIONAL SERVICES PRIVATE LIMITED",
    authorityLines: [
      "Registered Under Ministry of Corporate Affairs (Govt. of India)",
      "An ISO : 9001-2015 EGAC Accredited Certified Company",
    ],
    website: "www.aiieseducation.in",
    email: "help.aiieseducation@gmail.com",
    verificationNote:
      "Online Certificate Verification Available on :- www.aiieseducation.in",
    verifyBaseUrl: "https://aiieseducation.in/verify/",
    gradeLegend: DEFAULT_LEGEND,
    competencyNote: DEFAULT_COMPETENCY,
    signatories: [
      { id: "s1", name: "Dhaneshwar Choudhary", role: "(Centre Head)", signature: null },
      { id: "s2", name: "Aman Kumar", role: "(M.D of AIIES Education)", signature: null },
    ],
    badges: [{ id: "b1", label: "ISO", image: null }],
    accent: "#1d4ed8",
    frame: "classic",
    frameColor: "#3f3f46",
    background: null,
    showQr: true,
    showLogo: true,
    showSeal: false,
    showWatermark: false,
  },
];

export const CERTIFICATE_STUDENTS: CertificateStudent[] = [
  {
    id: "STU2201", name: "Durga Parsad", fatherName: "Raj Kishor Parshad", motherName: "Reena Devi",
    registrationNo: "A1792402001", dob: "05/11/2003", aadhaar: "911678033516",
    course: "Advance Diploma in Computer Application (ADCA)", durationMonths: 12,
    courseFrom: "14-02-2024", courseTo: "14-02-2025", marks: 83.2,
    certificateNo: "06A1792402001", issueDate: "19-02-2025", photo: null,
  },
  {
    id: "STU2202", name: "Aarav Sharma", fatherName: "Rakesh Sharma", motherName: "Sunita Sharma",
    registrationNo: "A1792402002", dob: "12/03/2004", aadhaar: "774512908833",
    course: "Diploma in Computer Application (DCA)", durationMonths: 6,
    courseFrom: "01-03-2024", courseTo: "01-09-2024", marks: 91.5,
    certificateNo: "06A1792402002", issueDate: "12-09-2024", photo: null,
  },
  {
    id: "STU2203", name: "Priya Kumari", fatherName: "Manoj Kumar", motherName: "Anita Devi",
    registrationNo: "A1792402003", dob: "28/07/2003", aadhaar: "620188345219",
    course: "Certificate in Tally with GST", durationMonths: 3,
    courseFrom: "05-01-2025", courseTo: "05-04-2025", marks: 78.0,
    certificateNo: "06A1792402003", issueDate: "18-04-2025", photo: null,
  },
  {
    id: "STU2204", name: "Rohit Verma", fatherName: "Suresh Verma", motherName: "Kavita Verma",
    registrationNo: "A1792402004", dob: "19/12/2002", aadhaar: "540922117603",
    course: "Advance Diploma in Computer Application (ADCA)", durationMonths: 12,
    courseFrom: "10-04-2024", courseTo: "10-04-2025", marks: 68.4,
    certificateNo: "06A1792402004", issueDate: "25-04-2025", photo: null,
  },
  {
    id: "STU2205", name: "Sneha Gupta", fatherName: "Dinesh Gupta", motherName: "Rekha Gupta",
    registrationNo: "A1792402005", dob: "03/09/2004", aadhaar: "883410276594",
    course: "Certificate in Spoken English", durationMonths: 4,
    courseFrom: "02-02-2025", courseTo: "02-06-2025", marks: 88.7,
    certificateNo: "06A1792402005", issueDate: "14-06-2025", photo: null,
  },
  {
    id: "STU2206", name: "Amit Ranjan", fatherName: "Vinod Ranjan", motherName: "Poonam Devi",
    registrationNo: "A1792402006", dob: "22/05/2003", aadhaar: "119874336520",
    course: "Diploma in Financial Accounting", durationMonths: 9,
    courseFrom: "15-05-2024", courseTo: "15-02-2025", marks: 56.3,
    certificateNo: "06A1792402006", issueDate: "28-02-2025", photo: null,
  },
];

/** The record the designer canvas renders, so the layout is never empty. */
export const SAMPLE_CERTIFICATE_STUDENT = CERTIFICATE_STUDENTS[0];

export const blankCertificateTemplate = (): Omit<CertificateTemplate, "id"> => ({
  name: "",
  status: "draft",
  branchCode: "",
  instituteName: "IT Zone Institute",
  addressLine1: "Near Simartalla Chowk,",
  addressLine2: "Thana Road, Mansurchak",
  logo: null,
  title: "Certificate",
  authorityHeading: "An Institute Authorized By :",
  authorityName: "",
  authorityLines: [""],
  website: "",
  email: "",
  verificationNote: "",
  verifyBaseUrl: "https://aiieseducation.in/verify/",
  gradeLegend: DEFAULT_LEGEND,
  competencyNote: DEFAULT_COMPETENCY,
  signatories: [
    { id: "s1", name: "", role: "(Centre Head)", signature: null },
    { id: "s2", name: "", role: "(M.D)", signature: null },
    { id: "s3", name: "", role: "(C.E.O)", signature: null },
  ],
  badges: [],
  accent: ACCENT_OPTIONS[0].value,
  frame: "guilloche",
  frameColor: FRAME_COLORS[0].value,
  background: null,
  showQr: true,
  showLogo: true,
  showSeal: true,
  showWatermark: true,
});

export const verifyUrl = (template: CertificateTemplate, student: CertificateStudent) =>
  `${template.verifyBaseUrl.replace(/\/?$/, "/")}${student.certificateNo}`;

const escapeHtml = (value: string) =>
  String(value).replace(/[&<>"]/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );

/* ── The printed sheet ─────────────────────────────────────────────────────
   A4 portrait at 96dpi is 794 × 1123px. Everything below is laid out against
   that box so the screen preview, the print sheet and the PDF agree.        */

export const SHEET = { width: 794, height: 1123 };

/** Interlocking sine braid — the security pattern behind the border band. */
const guillochePattern = (uid: string, color: string) => `
  <pattern id="braid-${uid}" width="46" height="30" patternUnits="userSpaceOnUse">
    <path d="M0 15 C 11 -3, 35 -3, 46 15 C 35 33, 11 33, 0 15" fill="none" stroke="${color}" stroke-width=".7" opacity=".85"/>
    <path d="M0 15 C 11 3, 35 3, 46 15 C 35 27, 11 27, 0 15" fill="none" stroke="${color}" stroke-width=".5" opacity=".55"/>
    <path d="M0 15 C 11 9, 35 9, 46 15 C 35 21, 11 21, 0 15" fill="none" stroke="${color}" stroke-width=".4" opacity=".4"/>
    <circle cx="23" cy="15" r="8.5" fill="none" stroke="${color}" stroke-width=".35" opacity=".5"/>
    <circle cx="0"  cy="15" r="4"   fill="none" stroke="${color}" stroke-width=".35" opacity=".45"/>
    <circle cx="46" cy="15" r="4"   fill="none" stroke="${color}" stroke-width=".35" opacity=".45"/>
  </pattern>`;

/** The rosette a guilloche background is built from, drawn once and tiled. */
const rosette = (uid: string, color: string) => {
  const points = Array.from({ length: 160 }, (_, i) => {
    const t = (i / 160) * Math.PI * 2;
    const r = 120 + 46 * Math.cos(7 * t);
    return `${(150 + r * Math.cos(t)).toFixed(1)},${(150 + r * Math.sin(t)).toFixed(1)}`;
  }).join(" ");
  const inner = Array.from({ length: 160 }, (_, i) => {
    const t = (i / 160) * Math.PI * 2;
    const r = 88 + 34 * Math.cos(11 * t + 0.6);
    return `${(150 + r * Math.cos(t)).toFixed(1)},${(150 + r * Math.sin(t)).toFixed(1)}`;
  }).join(" ");
  return `
    <g id="rosette-${uid}" fill="none" stroke="${color}" stroke-width=".45">
      ${Array.from({ length: 9 }, (_, i) =>
        `<polygon points="${points}" opacity="${(0.5 - i * 0.04).toFixed(2)}" transform="rotate(${i * 4} 150 150)"/>`,
      ).join("")}
      ${Array.from({ length: 7 }, (_, i) =>
        `<polygon points="${inner}" opacity="${(0.42 - i * 0.045).toFixed(2)}" transform="rotate(${i * 5.5} 150 150)"/>`,
      ).join("")}
    </g>`;
};

/** The award seal — concentric rings on a starburst, with a ribbon tail. */
const seal = (color: string) => {
  const teeth = Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2;
    const r = i % 2 ? 25 : 32;
    return `${(34 + r * Math.cos(t)).toFixed(1)},${(34 + r * Math.sin(t)).toFixed(1)}`;
  }).join(" ");
  return `
    <svg width="76" height="118" viewBox="0 0 68 118" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 58 L14 108 L27 100 L34 112 L34 58 Z" fill="#c1121f"/>
      <path d="M46 58 L54 108 L41 100 L34 112 L34 58 Z" fill="#1e3a8a"/>
      <polygon points="${teeth}" fill="${color}"/>
      <circle cx="34" cy="34" r="24" fill="#f5c33b" stroke="#b45309" stroke-width="1.5"/>
      <circle cx="34" cy="34" r="17" fill="#f59e0b" stroke="#fde68a" stroke-width="1"/>
      <circle cx="34" cy="28" r="9" fill="#fff" opacity=".28"/>
    </svg>`;
};

/** The full decorative frame for a sheet: border band, wash and rosettes. */
function frameSvg(template: CertificateTemplate, uid: string) {
  if (template.frame === "plain") return "";
  const { width, height } = SHEET;
  const color = template.frameColor;

  if (template.frame === "classic") {
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="${color}" stroke-width="3"/>
        <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${color}" stroke-width="1" opacity=".7"/>
        <rect x="29" y="29" width="${width - 58}" height="${height - 58}" fill="none" stroke="${color}" stroke-width=".5" opacity=".5"/>
      </svg>`;
  }

  // Border band drawn as one even-odd path so the braid fills only the rim.
  const band = (outer: number, thickness: number) =>
    `M${outer} ${outer} H${width - outer} V${height - outer} H${outer} Z ` +
    `M${outer + thickness} ${outer + thickness} V${height - outer - thickness} ` +
    `H${width - outer - thickness} V${outer + thickness} Z`;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${guillochePattern(uid, color)}
        ${rosette(uid, color)}
        <linearGradient id="wash-${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f7d7e6"/>
          <stop offset="45%" stop-color="#e6dcf5"/>
          <stop offset="100%" stop-color="#d4e6f7"/>
        </linearGradient>
        <radialGradient id="fade-${uid}" cx=".5" cy=".5" r=".62">
          <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
          <stop offset="55%" stop-color="#fff" stop-opacity=".82"/>
          <stop offset="100%" stop-color="#fff" stop-opacity=".35"/>
        </radialGradient>
      </defs>

      ${template.showWatermark ? `
        <rect x="34" y="34" width="${width - 68}" height="${height - 68}" fill="url(#wash-${uid})" opacity=".5"/>
        <g opacity=".5">
          <use href="#rosette-${uid}" x="97" y="90"  width="600" height="600" transform="translate(-53 -55) scale(1.35)"/>
          <use href="#rosette-${uid}" x="197" y="560" width="400" height="400"/>
        </g>
        <rect x="34" y="34" width="${width - 68}" height="${height - 68}" fill="url(#fade-${uid})"/>
      ` : ""}

      <path d="${band(10, 22)}" fill="url(#braid-${uid})" fill-rule="evenodd"/>
      <path d="${band(40, 14)}" fill="url(#braid-${uid})" fill-rule="evenodd" opacity=".9"/>
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="${color}" stroke-width="1.2"/>
      <rect x="32" y="32" width="${width - 64}" height="${height - 64}" fill="none" stroke="${color}" stroke-width=".8"/>
      <rect x="54" y="54" width="${width - 108}" height="${height - 108}" fill="none" stroke="${color}" stroke-width="1.6"/>
      <rect x="58" y="58" width="${width - 116}" height="${height - 116}" fill="none" stroke="${color}" stroke-width=".5" opacity=".8"/>
    </svg>`;
}

const labelled = (label: string, value: string) => `
  <tr>
    <td style="padding:2px 8px 2px 0;font-style:italic;font-size:11.5px;color:#111;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:2px 0;font-size:11.5px;font-weight:700;color:#111">${escapeHtml(value)}</td>
  </tr>`;

/**
 * One certificate as standalone HTML — used by the designer canvas, the
 * student portal and the print sheet. `qr` is a data URL; when it is missing
 * the QR box is drawn as a placeholder so the layout never shifts.
 */
export function certificateHtml(
  template: CertificateTemplate,
  student: CertificateStudent,
  qr?: string,
  uid = student.id,
) {
  const grade = gradeFor(student.marks);
  const background = template.background
    ? `<img src="${template.background}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>`
    : frameSvg(template, uid);

  const signatories = template.signatories
    .map(
      (person) => `
        <div style="text-align:center;min-width:150px">
          ${person.signature
            ? `<img src="${person.signature}" alt="" style="height:34px;object-fit:contain;display:block;margin:0 auto 2px"/>`
            : `<div style="height:34px"></div>`}
          <div style="border-top:1px solid #111;padding-top:3px">
            <p style="margin:0;font-size:10.5px;font-weight:600;color:#111">${escapeHtml(person.name)}</p>
            <p style="margin:0;font-size:9.5px;color:#333">${escapeHtml(person.role)}</p>
          </div>
        </div>`,
    )
    .join("");

  const badges = template.badges
    .map(
      (badge) =>
        badge.image
          ? `<img src="${badge.image}" alt="${escapeHtml(badge.label)}" style="height:34px;object-fit:contain"/>`
          : `<span style="display:inline-grid;place-items:center;height:34px;min-width:52px;padding:0 8px;border:1.5px solid #1e3a8a;border-radius:17px;font-size:9px;font-weight:700;color:#1e3a8a;letter-spacing:.04em">${escapeHtml(badge.label)}</span>`,
    )
    .join("");

  return `
  <div style="position:relative;width:${SHEET.width}px;height:${SHEET.height}px;background:#fff;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:#111;page-break-after:always;display:inline-block;vertical-align:top">
    ${background}
    <div style="position:relative;padding:72px 78px 0">

      <p style="margin:0;text-align:right;font-size:12.5px;font-weight:700;letter-spacing:.02em">BRANCH CODE :&nbsp; ${escapeHtml(template.branchCode)}</p>
      <p style="margin:2px 0 0;text-align:center;color:${template.accent};font-size:13px">&#9733;</p>

      <div style="text-align:center;margin-top:6px">
        ${template.showLogo && template.logo
          ? `<img src="${template.logo}" alt="" style="height:56px;object-fit:contain"/>`
          : template.showLogo
            ? `<div style="display:inline-grid;place-items:center;height:56px;width:56px;border:2px solid ${template.accent};border-radius:50%;font-size:11px;font-weight:700;color:${template.accent}">LOGO</div>`
            : ""}
        <h1 style="margin:6px 0 0;font-size:31px;letter-spacing:.02em;font-variant:small-caps;font-weight:700">${escapeHtml(template.instituteName)}</h1>
        <p style="margin:3px 0 0;font-size:14px;font-weight:600">${escapeHtml(template.addressLine1)}</p>
        <p style="margin:0;font-size:14px;font-weight:600">${escapeHtml(template.addressLine2)}</p>
        <p style="margin:8px 0 0;font-size:38px;font-family:'Segoe Script','Brush Script MT','Apple Chancery',cursive;font-style:italic">${escapeHtml(template.title)}</p>
      </div>

      <div style="display:flex;gap:18px;margin-top:14px;align-items:flex-start">
        <div style="width:104px;flex:none;text-align:center">
          ${template.showQr
            ? `${qr
                ? `<img src="${qr}" alt="" style="width:92px;height:92px;display:block;margin:0 auto"/>`
                : `<div style="width:92px;height:92px;margin:0 auto;border:1px solid #111;display:grid;place-items:center;font-size:9px;color:#666">QR</div>`}
               <p style="margin:3px 0 0;font-size:8.5px;font-style:italic;line-height:1.2">Scan for Online<br/>Verification</p>`
            : ""}
        </div>
        <table style="flex:1;border-collapse:collapse">
          <tr>
            <td style="vertical-align:top;width:56%">
              <table style="border-collapse:collapse">
                ${labelled("This is to Certify That", student.name.toUpperCase())}
                ${labelled("Father's Name", student.fatherName.toUpperCase())}
                ${labelled("Mother's Name", student.motherName.toUpperCase())}
              </table>
            </td>
            <td style="vertical-align:top">
              <table style="border-collapse:collapse">
                ${labelled("Registration No. :-", student.registrationNo)}
                ${labelled("Date of Birth :-", student.dob)}
                ${labelled("Aadhar No. :-", student.aadhaar)}
              </table>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:10px">
        <p style="margin:0;font-size:15px;font-weight:700;color:${template.accent}">${escapeHtml(student.course)}</p>
        <p style="margin:5px 0 0;font-size:12.5px;font-weight:700">(Duration: ${student.durationMonths} Months)</p>
        <p style="margin:4px 0 0;font-size:12px">Course Period:- ${escapeHtml(student.courseFrom)} To ${escapeHtml(student.courseTo)}</p>
        <p style="margin:6px 0 0;font-size:12.5px;font-weight:700">Grade : ${grade}</p>
        <p style="margin:4px 0 0;font-size:12.5px;font-weight:700">Marks : ${student.marks}%</p>
        <p style="margin:8px auto 0;max-width:560px;font-size:9.5px;font-style:italic">${escapeHtml(template.gradeLegend)}</p>
        <p style="margin:8px auto 0;max-width:560px;font-size:9.5px;font-weight:700;font-style:italic;line-height:1.45">${escapeHtml(template.competencyNote)}</p>
      </div>

      <div style="text-align:center;margin-top:10px">
        <p style="margin:0;font-size:16px;font-style:italic">${escapeHtml(template.authorityHeading)}</p>
        <p style="margin:4px 0 0;font-size:12.5px;font-weight:700">${escapeHtml(template.authorityName)}</p>
        ${template.authorityLines
          .filter(Boolean)
          .map((line) => `<p style="margin:1px 0 0;font-size:9.5px">${escapeHtml(line)}</p>`)
          .join("")}
        <p style="margin:8px 0 0;font-size:12.5px">${escapeHtml(template.website)}</p>
        <p style="margin:2px 0 0;font-size:12.5px">${escapeHtml(template.email)}</p>
        <p style="margin:6px 0 0;font-size:9.5px">${escapeHtml(template.verificationNote)}</p>
      </div>

      <div style="display:flex;justify-content:space-around;align-items:flex-end;margin-top:18px">${signatories}</div>

      <div style="text-align:center;margin-top:10px">
        <p style="margin:0;font-size:11.5px;font-weight:700">Certificate No. :&nbsp; ${escapeHtml(student.certificateNo)}</p>
        <p style="margin:3px 0 0;font-size:11.5px;font-weight:700">Issue Date :&nbsp; ${escapeHtml(student.issueDate)}</p>
      </div>

      <div style="display:flex;justify-content:center;align-items:center;gap:14px;margin-top:10px">${badges}</div>
    </div>

    ${template.showSeal
      ? `<div style="position:absolute;left:78px;bottom:74px">${seal(template.accent)}</div>`
      : ""}
  </div>`;
}

/** The print sheet for a batch — one certificate per page. */
export const certificateSheetHtml = (
  template: CertificateTemplate,
  students: CertificateStudent[],
  qrs: Record<string, string> = {},
) => students.map((student) => certificateHtml(template, student, qrs[student.id])).join("");
