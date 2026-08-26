import { jsPDF } from "jspdf";
import {
  CertificateStudent,
  CertificateTemplate,
  gradeFor,
} from "@/data/certificate-templates";

/**
 * The certificate as a printable PDF. There is no html2canvas in this project,
 * so the sheet is redrawn with jsPDF primitives against the same A4 geometry
 * `certificateHtml` uses — the guilloche band included, as a set of phase
 * shifted sine strands rather than a raster.
 */

const PAGE = { width: 210, height: 297 };
const MARGIN = 20;
const CENTER = PAGE.width / 2;

const rgb = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ];
};

/** jsPDF has no cheap alpha, so faded ink is mixed toward paper white. */
const fade = (hex: string, amount: number): [number, number, number] => {
  const [r, g, b] = rgb(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return [mix(r), mix(g), mix(b)];
};

const imageFormat = (dataUrl: string) =>
  dataUrl.slice(5, dataUrl.indexOf(";")).split("/")[1]?.toUpperCase() || "PNG";

/** One sine strand along a segment, emitted as a single path. */
function strand(
  doc: jsPDF,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  amplitude: number,
  wavelength: number,
  phase: number,
) {
  const length = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / length;
  const uy = (by - ay) / length;
  const px = -uy;
  const py = ux;
  const steps = Math.max(24, Math.round(length / 1.5));

  const at = (index: number) => {
    const distance = (index / steps) * length;
    const offset = amplitude * Math.sin((distance / wavelength) * Math.PI * 2 + phase);
    return [ax + ux * distance + px * offset, ay + uy * distance + py * offset] as const;
  };

  const [startX, startY] = at(0);
  const deltas: [number, number][] = [];
  let [prevX, prevY] = [startX, startY];
  for (let index = 1; index <= steps; index += 1) {
    const [x, y] = at(index);
    deltas.push([x - prevX, y - prevY]);
    [prevX, prevY] = [x, y];
  }
  doc.lines(deltas, startX, startY, [1, 1], "S");
}

/** The braid that runs around a rectangle — three strands, phase shifted. */
function braidRect(doc: jsPDF, x: number, y: number, width: number, height: number, amplitude: number) {
  const corners: [number, number][] = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  for (let phase = 0; phase < 3; phase += 1) {
    doc.setLineWidth(0.18 - phase * 0.03);
    for (let edge = 0; edge < 4; edge += 1) {
      const [ax, ay] = corners[edge];
      const [bx, by] = corners[(edge + 1) % 4];
      strand(doc, ax, ay, bx, by, amplitude * (1 - phase * 0.28), 9, (phase * Math.PI * 2) / 3);
    }
  }
}

/** A hypotrochoid rosette — the spirograph wash behind the text. */
function rosette(doc: jsPDF, cx: number, cy: number, radius: number, lobes: number, depth: number) {
  const steps = 180;
  const point = (index: number) => {
    const t = (index / steps) * Math.PI * 2;
    const r = radius + depth * Math.cos(lobes * t);
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as const;
  };
  const [startX, startY] = point(0);
  const deltas: [number, number][] = [];
  let [prevX, prevY] = [startX, startY];
  for (let index = 1; index <= steps; index += 1) {
    const [x, y] = point(index);
    deltas.push([x - prevX, y - prevY]);
    [prevX, prevY] = [x, y];
  }
  doc.lines(deltas, startX, startY, [1, 1], "S");
}

function drawFrame(doc: jsPDF, template: CertificateTemplate) {
  if (template.frame === "plain") return;
  const color = template.frameColor;

  if (template.frame === "classic") {
    doc.setDrawColor(...rgb(color));
    doc.setLineWidth(0.9);
    doc.rect(6, 6, PAGE.width - 12, PAGE.height - 12);
    doc.setLineWidth(0.3);
    doc.rect(9, 9, PAGE.width - 18, PAGE.height - 18);
    return;
  }

  if (template.showWatermark) {
    // A security tint, not a picture: it has to stay under the text it sits
    // behind, so it is drawn hairline-thin and mixed almost to paper white.
    doc.setDrawColor(...fade(color, 0.93));
    doc.setLineWidth(0.1);
    for (let turn = 0; turn < 6; turn += 1) {
      rosette(doc, CENTER, 112, 32 + turn * 0.9, 7, 11);
    }
    for (let turn = 0; turn < 5; turn += 1) {
      rosette(doc, CENTER, 205, 22 + turn * 0.8, 11, 7);
    }
  }

  doc.setDrawColor(...fade(color, 0.25));
  braidRect(doc, 9, 9, PAGE.width - 18, PAGE.height - 18, 2.4);
  braidRect(doc, 15, 15, PAGE.width - 30, PAGE.height - 30, 1.4);

  doc.setDrawColor(...rgb(color));
  doc.setLineWidth(0.5);
  doc.rect(4.5, 4.5, PAGE.width - 9, PAGE.height - 9);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, PAGE.width - 24, PAGE.height - 24);
  doc.setLineWidth(0.7);
  doc.rect(18, 18, PAGE.width - 36, PAGE.height - 36);
}

function drawSeal(doc: jsPDF, x: number, y: number, accent: string) {
  doc.setFillColor(193, 18, 31);
  doc.triangle(x - 3, y + 2, x - 5.5, y + 15, x, y + 10, "F");
  doc.setFillColor(30, 58, 138);
  doc.triangle(x + 3, y + 2, x + 5.5, y + 15, x, y + 10, "F");

  doc.setFillColor(...rgb(accent));
  doc.circle(x, y, 8.4, "F");
  doc.setFillColor(245, 195, 59);
  doc.circle(x, y, 6.6, "F");
  doc.setFillColor(245, 158, 11);
  doc.circle(x, y, 4.6, "F");
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.circle(x, y, 6.6);
}

function drawPair(doc: jsPDF, label: string, value: string, x: number, y: number, gap: number) {
  doc.setFont("times", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 17, 17);
  doc.text(label, x, y);
  doc.setFont("times", "bold");
  doc.text(value, x + gap, y);
}

function drawCertificate(
  doc: jsPDF,
  template: CertificateTemplate,
  student: CertificateStudent,
  qr?: string,
) {
  if (template.background) {
    doc.addImage(template.background, imageFormat(template.background), 0, 0, PAGE.width, PAGE.height);
  } else {
    drawFrame(doc, template);
  }

  const accent = rgb(template.accent);
  doc.setTextColor(17, 17, 17);

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text(`BRANCH CODE :  ${template.branchCode}`, PAGE.width - MARGIN, 26, { align: "right" });

  let y = 32;
  if (template.showLogo) {
    if (template.logo) {
      doc.addImage(template.logo, imageFormat(template.logo), CENTER - 7, y - 4, 14, 14);
    } else {
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.6);
      doc.circle(CENTER, y + 3, 7);
      doc.setFontSize(6);
      doc.setTextColor(...accent);
      doc.text("LOGO", CENTER, y + 4.5, { align: "center" });
    }
    y += 18;
  }

  doc.setTextColor(17, 17, 17);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text(template.instituteName.toUpperCase(), CENTER, y, { align: "center" });
  doc.setFontSize(10.5);
  doc.text(template.addressLine1, CENTER, y + 6, { align: "center" });
  doc.text(template.addressLine2, CENTER, y + 11, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(27);
  doc.text(template.title, CENTER, y + 24, { align: "center" });

  const headTop = y + 32;
  if (template.showQr && qr) {
    doc.addImage(qr, "PNG", MARGIN + 2, headTop, 22, 22);
    doc.setFont("times", "italic");
    doc.setFontSize(6);
    doc.text("Scan for Online", MARGIN + 13, headTop + 25, { align: "center" });
    doc.text("Verification", MARGIN + 13, headTop + 28, { align: "center" });
  }

  const leftX = MARGIN + 30;
  const rightX = CENTER + 26;
  drawPair(doc, "This is to Certify That", student.name.toUpperCase(), leftX, headTop + 5, 33);
  drawPair(doc, "Father's Name", student.fatherName.toUpperCase(), leftX, headTop + 11, 33);
  drawPair(doc, "Mother's Name", student.motherName.toUpperCase(), leftX, headTop + 17, 33);
  drawPair(doc, "Registration No. :-", student.registrationNo, rightX, headTop + 5, 24);
  drawPair(doc, "Date of Birth :-", student.dob, rightX, headTop + 11, 24);
  drawPair(doc, "Aadhar No. :-", student.aadhaar, rightX, headTop + 17, 24);

  let cursor = headTop + 30;
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...accent);
  doc.text(student.course, CENTER, cursor, { align: "center", maxWidth: PAGE.width - 2 * MARGIN });

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(10);
  cursor += 7;
  doc.text(`(Duration: ${student.durationMonths} Months)`, CENTER, cursor, { align: "center" });
  doc.setFont("times", "normal");
  cursor += 5.5;
  doc.text(`Course Period:- ${student.courseFrom} To ${student.courseTo}`, CENTER, cursor, { align: "center" });
  doc.setFont("times", "bold");
  cursor += 6;
  doc.text(`Grade : ${gradeFor(student.marks)}`, CENTER, cursor, { align: "center" });
  cursor += 5.5;
  doc.text(`Marks : ${student.marks}%`, CENTER, cursor, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(7);
  cursor += 6;
  doc.text(template.gradeLegend, CENTER, cursor, { align: "center", maxWidth: 150 });

  doc.setFont("times", "bolditalic");
  cursor += 8;
  const competency = doc.splitTextToSize(template.competencyNote, 150) as string[];
  doc.text(competency, CENTER, cursor, { align: "center" });
  cursor += competency.length * 3.4 + 5;

  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.text(template.authorityHeading, CENTER, cursor, { align: "center" });
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  cursor += 5.5;
  doc.text(template.authorityName, CENTER, cursor, { align: "center", maxWidth: 170 });
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  for (const line of template.authorityLines.filter(Boolean)) {
    cursor += 3.4;
    doc.text(line, CENTER, cursor, { align: "center", maxWidth: 170 });
  }
  doc.setFontSize(9.5);
  cursor += 6;
  doc.text(template.website, CENTER, cursor, { align: "center" });
  cursor += 4.5;
  doc.text(template.email, CENTER, cursor, { align: "center" });
  doc.setFontSize(7);
  cursor += 4.5;
  doc.text(template.verificationNote, CENTER, cursor, { align: "center", maxWidth: 170 });

  // The sign-off travels with the body but never runs off the page, so a short
  // authority block does not leave a hole above the signatures.
  const signatureY = Math.min(PAGE.height - 58, cursor + 20);
  const slots = template.signatories.length || 1;
  template.signatories.forEach((person, index) => {
    const usable = PAGE.width - 2 * MARGIN;
    const x = MARGIN + (usable / slots) * (index + 0.5);
    if (person.signature) {
      doc.addImage(person.signature, imageFormat(person.signature), x - 14, signatureY - 12, 28, 10);
    }
    doc.setDrawColor(17, 17, 17);
    doc.setLineWidth(0.3);
    doc.line(x - 22, signatureY, x + 22, signatureY);
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 17, 17);
    doc.text(person.name, x, signatureY + 4, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.text(person.role, x, signatureY + 8, { align: "center" });
  });

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.text(`Certificate No. :  ${student.certificateNo}`, CENTER, signatureY + 18, { align: "center" });
  doc.text(`Issue Date :  ${student.issueDate}`, CENTER, signatureY + 23.5, { align: "center" });

  const badgeY = signatureY + 28;
  const badgeSlots = template.badges.length;
  template.badges.forEach((badge, index) => {
    const x = CENTER + (index - (badgeSlots - 1) / 2) * 24;
    if (badge.image) {
      doc.addImage(badge.image, imageFormat(badge.image), x - 9, badgeY, 18, 12);
    } else {
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.4);
      doc.roundedRect(x - 9, badgeY, 18, 8, 4, 4);
      doc.setTextColor(30, 58, 138);
      doc.setFont("times", "bold");
      doc.setFontSize(6.5);
      doc.text(badge.label, x, badgeY + 5.2, { align: "center" });
    }
  });

  // The seal sits beside the footer, not beside the signatures: a wax seal that
  // overlapped the first signatory's rule would read as a printing error.
  if (template.showSeal && !template.background) {
    drawSeal(doc, MARGIN + 6, Math.min(PAGE.height - 46, signatureY + 30), template.accent);
  }
}

/** One page per student, matching the on-screen sheet. */
export function certificatesPdf(
  template: CertificateTemplate,
  students: CertificateStudent[],
  qrs: Record<string, string> = {},
  filename = "certificates.pdf",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  students.forEach((student, index) => {
    if (index > 0) doc.addPage();
    drawCertificate(doc, template, student, qrs[student.id]);
  });
  doc.save(filename.replace(/[^a-z0-9._-]+/gi, "-"));
  return { pages: Math.max(1, students.length) };
}
