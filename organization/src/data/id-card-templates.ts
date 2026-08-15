/**
 * ID card templates, shared by the designer (/cards/id-template) and the bulk
 * generator (/cards/generate-id) so a template saved in one is printable from
 * the other.
 */

export interface IdCardTemplate {
  id: string;
  name: string;
  orientation: "portrait" | "landscape";
  accent: string;
  instituteName: string;
  instituteAddress: string;
  /** Labels from `ID_CARD_FIELDS` printed on the card. */
  fields: string[];
  showPhoto: boolean;
  showQr: boolean;
  showSignature: boolean;
  validUntil: string;
  status: "active" | "draft";
}

export interface IdCardStudent {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNo: string;
  photo: boolean;
  dob: string;
  bloodGroup: string;
  parentContact: string;
  address: string;
}

export const ID_CARD_TEMPLATES_KEY = "erp-id-card-templates";

export const ID_CARD_FIELDS = [
  "Student Name",
  "Student ID",
  "Class & Section",
  "Roll Number",
  "Date of Birth",
  "Blood Group",
  "Parent Contact",
  "Address",
  "Valid Until",
];

export const DEFAULT_ID_FIELDS = [
  "Student Name",
  "Student ID",
  "Class & Section",
  "Roll Number",
  "Blood Group",
  "Valid Until",
];

export const ACCENT_OPTIONS = [
  { label: "Blue", value: "#1d4ed8" },
  { label: "Green", value: "#15803d" },
  { label: "Red", value: "#b91c1c" },
  { label: "Purple", value: "#6d28d9" },
  { label: "Slate", value: "#334155" },
];

export const ID_CARD_TEMPLATE_SEED: IdCardTemplate[] = [
  {
    id: "1",
    name: "Standard Blue Template",
    orientation: "portrait",
    accent: "#1d4ed8",
    instituteName: "Pushpak Institute",
    instituteAddress: "12 MG Road, Pune - 411001",
    fields: DEFAULT_ID_FIELDS,
    showPhoto: true,
    showQr: true,
    showSignature: true,
    validUntil: "31 May 2027",
    status: "active",
  },
  {
    id: "2",
    name: "Modern Green Template",
    orientation: "landscape",
    accent: "#15803d",
    instituteName: "Pushpak Institute",
    instituteAddress: "12 MG Road, Pune - 411001",
    fields: [...DEFAULT_ID_FIELDS, "Parent Contact"],
    showPhoto: true,
    showQr: true,
    showSignature: false,
    validUntil: "31 May 2027",
    status: "active",
  },
  {
    id: "3",
    name: "Classic Red Template",
    orientation: "portrait",
    accent: "#b91c1c",
    instituteName: "Pushpak Institute",
    instituteAddress: "12 MG Road, Pune - 411001",
    fields: ["Student Name", "Student ID", "Class & Section", "Roll Number"],
    showPhoto: true,
    showQr: false,
    showSignature: true,
    validUntil: "31 May 2027",
    status: "draft",
  },
];

export const ID_CARD_STUDENTS: IdCardStudent[] = [
  { id: "STU001", name: "Rahul Sharma", class: "10th", section: "A", rollNo: "101", photo: true, dob: "12 Mar 2009", bloodGroup: "B+", parentContact: "+91 98765 43210", address: "24 Shivaji Nagar, Pune" },
  { id: "STU002", name: "Priya Patel", class: "10th", section: "A", rollNo: "102", photo: true, dob: "04 Jul 2009", bloodGroup: "O+", parentContact: "+91 87654 32109", address: "8 Kothrud, Pune" },
  { id: "STU003", name: "Amit Kumar", class: "10th", section: "B", rollNo: "103", photo: false, dob: "29 Nov 2008", bloodGroup: "A+", parentContact: "+91 76543 21098", address: "51 Aundh, Pune" },
  { id: "STU004", name: "Sneha Gupta", class: "9th", section: "A", rollNo: "201", photo: true, dob: "16 Jan 2010", bloodGroup: "AB+", parentContact: "+91 65432 10987", address: "3 Baner Road, Pune" },
  { id: "STU005", name: "Vikram Singh", class: "9th", section: "B", rollNo: "202", photo: true, dob: "22 Sep 2010", bloodGroup: "B-", parentContact: "+91 54321 09876", address: "77 Hadapsar, Pune" },
  { id: "STU006", name: "Anita Desai", class: "8th", section: "A", rollNo: "301", photo: true, dob: "09 Apr 2011", bloodGroup: "O-", parentContact: "+91 43210 98765", address: "19 Viman Nagar, Pune" },
];

/** The sample record the designer canvas renders, so the layout is never empty. */
export const SAMPLE_STUDENT: IdCardStudent = {
  id: "STU001",
  name: "Rahul Sharma",
  class: "10th",
  section: "A",
  rollNo: "101",
  photo: true,
  dob: "12 Mar 2009",
  bloodGroup: "B+",
  parentContact: "+91 98765 43210",
  address: "24 Shivaji Nagar, Pune",
};

export const blankIdCardTemplate = (): Omit<IdCardTemplate, "id"> => ({
  name: "",
  orientation: "portrait",
  accent: ACCENT_OPTIONS[0].value,
  instituteName: "Pushpak Institute",
  instituteAddress: "12 MG Road, Pune - 411001",
  fields: [...DEFAULT_ID_FIELDS],
  showPhoto: true,
  showQr: true,
  showSignature: true,
  validUntil: "31 May 2027",
  status: "draft",
});

/** Resolve a field label against a student record — the single source of truth
 *  for what each label prints, used by the canvas, the print sheet and the PDF. */
export function fieldValue(
  label: string,
  student: IdCardStudent,
  template: Pick<IdCardTemplate, "validUntil">,
): string {
  switch (label) {
    case "Student Name": return student.name;
    case "Student ID": return student.id;
    case "Class & Section": return `${student.class} - ${student.section}`;
    case "Roll Number": return student.rollNo;
    case "Date of Birth": return student.dob;
    case "Blood Group": return student.bloodGroup;
    case "Parent Contact": return student.parentContact;
    case "Address": return student.address;
    case "Valid Until": return template.validUntil;
    default: return "—";
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );

/** One card as standalone HTML, for the print sheet. */
export function idCardHtml(template: IdCardTemplate, student: IdCardStudent) {
  const rows = template.fields
    .filter((label) => label !== "Student Name")
    .map(
      (label) =>
        `<tr><td style="color:#6b7280;padding:1px 6px 1px 0;font-size:9px">${escapeHtml(label)}</td>` +
        `<td style="font-weight:600;font-size:9px">${escapeHtml(fieldValue(label, student, template))}</td></tr>`,
    )
    .join("");

  const width = template.orientation === "portrait" ? 204 : 324;
  const height = template.orientation === "portrait" ? 324 : 204;

  return `
    <div style="width:${width}px;height:${height}px;border:1px solid #d4d4d8;border-radius:8px;overflow:hidden;font-family:system-ui,sans-serif;display:inline-block;vertical-align:top;margin:0 8px 8px 0">
      <div style="background:${template.accent};color:#fff;padding:8px 10px">
        <p style="margin:0;font-size:12px;font-weight:700">${escapeHtml(template.instituteName)}</p>
        <p style="margin:0;font-size:8px;opacity:.85">${escapeHtml(template.instituteAddress)}</p>
      </div>
      <div style="padding:8px 10px;display:flex;gap:8px">
        ${template.showPhoto ? `<div style="width:52px;height:62px;border:1px solid #d4d4d8;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#9ca3af;flex:none">${student.photo ? "PHOTO" : "NO PHOTO"}</div>` : ""}
        <div style="flex:1;min-width:0">
          ${template.fields.includes("Student Name") ? `<p style="margin:0 0 4px;font-size:12px;font-weight:700">${escapeHtml(student.name)}</p>` : ""}
          <table style="border-collapse:collapse;width:100%">${rows}</table>
        </div>
      </div>
      <div style="padding:0 10px;display:flex;align-items:flex-end;justify-content:space-between">
        ${template.showQr ? `<div style="width:40px;height:40px;border:1px solid #d4d4d8;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:7px;color:#9ca3af">QR</div>` : "<span></span>"}
        ${template.showSignature ? `<div style="text-align:center"><div style="width:70px;border-top:1px solid #111"></div><span style="font-size:7px;color:#6b7280">Principal</span></div>` : ""}
      </div>
    </div>`;
}

/** The full print sheet for a batch of students. */
export const idCardSheetHtml = (template: IdCardTemplate, students: IdCardStudent[]) =>
  `<div style="display:flex;flex-wrap:wrap">${students
    .map((student) => idCardHtml(template, student))
    .join("")}</div>`;
