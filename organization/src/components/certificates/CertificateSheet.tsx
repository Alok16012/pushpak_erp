import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { qrDataUrl } from "@/lib/upi";
import {
  CertificateStudent,
  CertificateTemplate,
  SHEET,
  certificateHtml,
  verifyUrl,
} from "@/data/certificate-templates";

/**
 * Real verification QRs for a set of students, keyed by student id. The payload
 * is the template's verification URL with the student's certificate number, so
 * two students never share a code.
 */
export function useCertificateQrs(
  template: CertificateTemplate | null,
  students: CertificateStudent[],
) {
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const payloads = template
    ? students.map((student) => `${student.id}|${verifyUrl(template, student)}`).join(",")
    : "";

  useEffect(() => {
    if (!template || !template.showQr) {
      setQrs({});
      return;
    }
    let live = true;
    Promise.all(
      students.map(async (student) => [student.id, await qrDataUrl(verifyUrl(template, student), 240)] as const),
    )
      .then((entries) => live && setQrs(Object.fromEntries(entries)))
      .catch(() => live && setQrs({}));
    return () => {
      live = false;
    };
    // The payload string covers every input the QR depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloads, template?.showQr]);

  return qrs;
}

interface CertificateSheetProps {
  template: CertificateTemplate;
  student: CertificateStudent;
  qr?: string;
  className?: string;
}

/**
 * The A4 sheet, scaled to whatever width it is given. The markup is the same
 * string the print sheet and the student portal use, so the preview is the
 * document rather than an approximation of it.
 */
export function CertificateSheet({ template, student, qr, className }: CertificateSheetProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setScale(Math.min(1, element.clientWidth / SHEET.width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className={className}>
      <div
        className="overflow-hidden rounded-md border bg-white shadow-sm"
        style={{ height: SHEET.height * scale }}
      >
        <div
          style={{ width: SHEET.width, transform: `scale(${scale})`, transformOrigin: "top left" }}
          dangerouslySetInnerHTML={{ __html: certificateHtml(template, student, qr) }}
        />
      </div>
    </div>
  );
}
