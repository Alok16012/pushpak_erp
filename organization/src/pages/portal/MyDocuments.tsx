import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, Download, FileText, IdCard, Printer, Send } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLocalCollection, useLocalState } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { downloadHtml, printHtml } from "@/lib/export";
import { admissionPdf } from "@/lib/documents";
import { admitCardsPdf } from "@/lib/admit-card-pdf";
import { certificatesPdf } from "@/lib/certificate-pdf";
import { CertificateSheet, useCertificateQrs } from "@/components/certificates/CertificateSheet";
import { CERTIFICATE_TEMPLATES_KEY, CERTIFICATE_TEMPLATE_SEED, certificateHtml, type CertificateTemplate } from "@/data/certificate-templates";
import { ID_CARD_TEMPLATES_KEY, ID_CARD_TEMPLATE_SEED, idCardHtml, type IdCardTemplate } from "@/data/id-card-templates";
import { ADMIT_CARD_TEMPLATES_KEY, ADMIT_CARD_TEMPLATE_SEED, EXAMS, admitCardHtml, type AdmitCardTemplate } from "@/data/admit-card-templates";
import {
  INVOICE_SEED, PORTAL_KEYS, PROFILE_SEED, REQUEST_KINDS, RESULT_SEED,
  asAdmitCardStudent, asCertificateStudent, asIdCardStudent, asStudentDocument, feeSummary, money, resultSummary,
  type PortalInvoice, type PortalRequest, type PortalResult, type StudentProfile,
} from "@/data/student-portal";

export default function MyDocuments() {
  const { toast } = useToast();
  const [profile] = useLocalState<StudentProfile>(PORTAL_KEYS.profile, PROFILE_SEED);
  const { items: invoices } = useLocalCollection<PortalInvoice>(PORTAL_KEYS.fees, INVOICE_SEED);
  const { items: results } = useLocalCollection<PortalResult>(PORTAL_KEYS.results, RESULT_SEED);
  const { items: requests, add: addRequest } = useLocalCollection<PortalRequest>(PORTAL_KEYS.requests, []);
  // The same template collections the staff-side designers write to, so a card
  // published by the institute is the card the student gets.
  const { items: idTemplates } = useLocalCollection<IdCardTemplate>(ID_CARD_TEMPLATES_KEY, ID_CARD_TEMPLATE_SEED);
  const { items: admitTemplates } = useLocalCollection<AdmitCardTemplate>(ADMIT_CARD_TEMPLATES_KEY, ADMIT_CARD_TEMPLATE_SEED);
  const { items: certTemplates } = useLocalCollection<CertificateTemplate>(CERTIFICATE_TEMPLATES_KEY, CERTIFICATE_TEMPLATE_SEED);

  const activeIdTemplates = idTemplates.filter((template) => template.status === "active");
  const activeAdmitTemplates = admitTemplates.filter((template) => template.status === "active");
  const [idTemplateId, setIdTemplateId] = useState(activeIdTemplates[0]?.id ?? "");
  const [admitTemplateId, setAdmitTemplateId] = useState(activeAdmitTemplates[0]?.id ?? "");
  const [examValue, setExamValue] = useState(EXAMS[0].value);
  const [requestKind, setRequestKind] = useState(REQUEST_KINDS[2]);
  const [requestNote, setRequestNote] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);

  const dues = feeSummary(invoices);
  const idTemplate = activeIdTemplates.find((template) => template.id === idTemplateId);
  const admitTemplate = activeAdmitTemplates.find((template) => template.id === admitTemplateId);
  const exam = EXAMS.find((option) => option.value === examValue);
  const idStudent = asIdCardStudent(profile);
  // An admit card is withheld while fees are overdue — the same rule the bulk
  // generator applies on the staff side.
  const admitBlocked = dues.overdue > 0;
  const admitStudent = asAdmitCardStudent(profile, dues.due > 0 ? (admitBlocked ? "overdue" : "pending") : "paid");
  const admitCard = admitTemplate ? { ...admitTemplate, exam: examValue } : undefined;

  // A certificate is only released once every subject is cleared and the fee
  // account is settled — the same two gates Results applies.
  const certTemplate = certTemplates.find((template) => template.status === "active") ?? null;
  const certStudent = asCertificateStudent(profile, results);
  const certQrs = useCertificateQrs(certTemplate, [certStudent]);
  const pending = resultSummary(results).failed;
  const certBlocked = pending > 0 || dues.due > 0;
  const certHold = pending > 0
    ? `${pending} subject${pending === 1 ? "" : "s"} still need a pass before the certificate is issued.`
    : `${money(dues.due)} is outstanding. The certificate is released once the fee account is settled.`;

  const printIdCard = () => {
    if (!idTemplate) return toast({ title: "No ID card template published", variant: "destructive" });
    printHtml(`ID card — ${profile.name}`, idCardHtml(idTemplate, idStudent));
  };
  const saveIdCard = () => {
    if (!idTemplate) return toast({ title: "No ID card template published", variant: "destructive" });
    downloadHtml(`id-card-${profile.rollNo}.html`, `ID card — ${profile.name}`, idCardHtml(idTemplate, idStudent));
    toast({ title: "ID card saved", description: "Open the file and print it at actual size." });
  };
  const printAdmitCard = () => {
    if (!admitCard) return toast({ title: "No admit card template published", variant: "destructive" });
    if (admitBlocked) return toast({ title: "Admit card on hold", description: `${money(dues.overdue)} is overdue. Clear it from Fees & receipts to release the card.`, variant: "destructive" });
    printHtml(`Admit card — ${profile.name}`, admitCardHtml(admitCard, admitStudent));
  };
  const downloadAdmitCard = () => {
    if (!admitCard) return toast({ title: "No admit card template published", variant: "destructive" });
    if (admitBlocked) return toast({ title: "Admit card on hold", description: `${money(dues.overdue)} is overdue. Clear it from Fees & receipts to release the card.`, variant: "destructive" });
    admitCardsPdf(admitCard, [admitStudent], `admit-card-${profile.rollNo}.pdf`);
    toast({ title: "Admit card downloaded", description: `${exam?.label} · ${exam?.window}` });
  };

  const guardCertificate = () => {
    if (!certTemplate) {
      toast({ title: "No certificate template published", variant: "destructive" });
      return false;
    }
    if (certBlocked) {
      toast({ title: "Certificate on hold", description: certHold, variant: "destructive" });
      return false;
    }
    return true;
  };
  const printCertificate = () => {
    if (!guardCertificate() || !certTemplate) return;
    printHtml(`Certificate — ${profile.name}`, certificateHtml(certTemplate, certStudent, certQrs[certStudent.id]));
  };
  const downloadCertificate = () => {
    if (!guardCertificate() || !certTemplate) return;
    certificatesPdf(certTemplate, [certStudent], certQrs, `certificate-${certStudent.certificateNo}.pdf`);
    toast({ title: "Certificate downloaded", description: `Certificate no. ${certStudent.certificateNo}` });
  };

  const submitRequest = () => {
    if (!requestNote.trim()) return toast({ title: "Add a note", description: "Say what you need the document for.", variant: "destructive" });
    addRequest({ kind: requestKind, detail: requestNote.trim(), raisedAt: new Date().toISOString(), status: "open" });
    toast({ title: "Request sent", description: `${requestKind} · the branch office will respond on your registered email.` });
    setRequestOpen(false);
    setRequestNote("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Cards & certificate"
        description="The documents the institute has published for you, plus a way to ask for one it has not."
        breadcrumbs={[{ label: "Cards & certificate" }]}
        actions={<Button variant="outline" onClick={() => setRequestOpen(true)}><Send />Request a document</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><IdCard className="h-4 w-4" />Student ID card</CardTitle>
            {activeIdTemplates.length > 1 && (
              <Select value={idTemplateId} onValueChange={setIdTemplateId}>
                <SelectTrigger className="w-[190px]"><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent>{activeIdTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {idTemplate
              ? <div className="flex justify-center overflow-x-auto rounded-2xl bg-muted/50 p-4" dangerouslySetInnerHTML={{ __html: idCardHtml(idTemplate, idStudent) }} />
              : <p className="py-10 text-center text-sm text-muted-foreground">Your institute has not published an ID card template yet.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={printIdCard} disabled={!idTemplate}><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
              <Button size="sm" variant="outline" onClick={saveIdCard} disabled={!idTemplate}><Download className="mr-1.5 h-3.5 w-3.5" />Save a copy</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Admit card</CardTitle>
            <Select value={examValue} onValueChange={setExamValue}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Examination" /></SelectTrigger>
              <SelectContent>{EXAMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {admitBlocked && <p className="mb-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">Held back: {money(dues.overdue)} is overdue. The card is released as soon as the balance is cleared.</p>}
            {admitCard
              ? <div className="max-h-[420px] overflow-auto rounded-2xl bg-muted/50 p-4" dangerouslySetInnerHTML={{ __html: admitCardHtml(admitCard, admitStudent) }} />
              : <p className="py-10 text-center text-sm text-muted-foreground">Your institute has not published an admit card template yet.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={downloadAdmitCard} disabled={!admitCard}><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</Button>
              <Button size="sm" variant="outline" onClick={printAdmitCard} disabled={!admitCard}><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
              {exam && <span className="self-center text-xs text-muted-foreground">{exam.window}</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><Award className="h-4 w-4" />Course completion certificate</CardTitle>
            {certTemplate && <Badge variant="secondary">Certificate no. {certStudent.certificateNo}</Badge>}
          </CardHeader>
          <CardContent>
            {certBlocked && <p className="mb-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">Held back: {certHold}</p>}
            {certTemplate
              ? <CertificateSheet className="mx-auto max-w-[560px]" template={certTemplate} student={certStudent} qr={certQrs[certStudent.id]} />
              : <p className="py-10 text-center text-sm text-muted-foreground">Your institute has not published a certificate template yet.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={downloadCertificate} disabled={!certTemplate}><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</Button>
              <Button size="sm" variant="outline" onClick={printCertificate} disabled={!certTemplate}><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
              <span className="self-center text-xs text-muted-foreground">Scan the QR on the certificate to verify it online.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Other documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Admission summary</p><p className="text-xs text-muted-foreground">Course, batch and enrolment as recorded on {new Date(profile.admissionDate).toLocaleDateString("en-IN")}</p></div>
              <Button size="sm" variant="outline" onClick={() => { admissionPdf(asStudentDocument(profile, invoices, results)); toast({ title: "Admission summary downloaded" }); }}><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Marksheet</p><p className="text-xs text-muted-foreground">Issued per assessment from your published results</p></div>
              <Button size="sm" variant="ghost" asChild><Link to="/me/results">Open results</Link></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.length
              ? requests.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 border-b py-3 last:border-0">
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{request.kind}</p><p className="text-xs text-muted-foreground">{request.detail}</p><p className="mt-1 text-[11px] text-muted-foreground">Raised {new Date(request.raisedAt).toLocaleString("en-IN")}</p></div>
                    <Badge variant={request.status === "open" ? "default" : "secondary"} className="capitalize">{request.status}</Badge>
                  </div>
                ))
              : <p className="py-8 text-center text-sm text-muted-foreground">Nothing raised yet. Use “Request a document” for anything not listed here.</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request a document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document</Label>
              <Select value={requestKind} onValueChange={setRequestKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REQUEST_KINDS.map((kind) => <SelectItem key={kind} value={kind}>{kind}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Details</Label>
              <Textarea id="note" rows={4} value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="Needed for a scholarship application; a scanned copy on email is fine." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
