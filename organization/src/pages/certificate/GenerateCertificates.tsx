import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Download, Eye, FileText, Printer, Search, Users } from "lucide-react";
import { useState } from "react";
import { useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { printHtml } from "@/lib/export";
import { certificatesPdf } from "@/lib/certificate-pdf";
import { CertificateSheet, useCertificateQrs } from "@/components/certificates/CertificateSheet";
import {
  CERTIFICATE_STUDENTS,
  CERTIFICATE_TEMPLATES_KEY,
  CERTIFICATE_TEMPLATE_SEED,
  CertificateTemplate,
  certificateSheetHtml,
  gradeFor,
} from "@/data/certificate-templates";

/** Below this the course is not passed, so no certificate should be issued. */
const PASS_MARK = 45;

export default function GenerateCertificates() {
  const { toast } = useToast();
  const { items: templates } = useLocalCollection<CertificateTemplate>(
    CERTIFICATE_TEMPLATES_KEY,
    CERTIFICATE_TEMPLATE_SEED,
  );

  const [templateId, setTemplateId] = useState(
    () => templates.find((item) => item.status === "active")?.id ?? templates[0]?.id ?? "",
  );
  const [courseFilter, setCourseFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const template = templates.find((item) => item.id === templateId) ?? null;
  const courses = Array.from(new Set(CERTIFICATE_STUDENTS.map((student) => student.course)));

  const query = search.trim().toLowerCase();
  const visible = CERTIFICATE_STUDENTS.filter(
    (student) =>
      (courseFilter === "all" || student.course === courseFilter) &&
      (gradeFilter === "all" || gradeFor(student.marks) === gradeFilter) &&
      (student.name.toLowerCase().includes(query) ||
        student.registrationNo.toLowerCase().includes(query) ||
        student.certificateNo.toLowerCase().includes(query)),
  );

  /** Rows hidden by the filters are not printed, even if they were ticked. */
  const chosen = visible.filter((student) => selected.includes(student.id));
  const failing = chosen.filter((student) => student.marks < PASS_MARK).length;
  const qrs = useCertificateQrs(template, chosen);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const toggleAll = () => {
    const ids = visible.map((student) => student.id);
    setSelected((prev) =>
      ids.every((id) => prev.includes(id))
        ? prev.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids])),
    );
  };

  const ready = () => {
    if (!template) {
      toast({ title: "Choose a template", description: "Pick a certificate template first.", variant: "destructive" });
      return false;
    }
    if (!chosen.length) {
      toast({ title: "No students selected", description: "Tick at least one student.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const print = () => {
    if (!ready() || !template) return;
    printHtml(`Certificates · ${template.name}`, certificateSheetHtml(template, chosen, qrs));
  };

  const download = () => {
    if (!ready() || !template) return;
    const { pages } = certificatesPdf(template, chosen, qrs, `certificates-${template.name || "batch"}.pdf`);
    toast({
      title: "PDF generated",
      description: `${pages} certificate${pages === 1 ? "" : "s"} — check your Downloads.`,
    });
  };

  const openPreview = () => {
    if (!ready()) return;
    setPreviewOpen(true);
  };

  const allVisibleSelected = visible.length > 0 && visible.every((student) => selected.includes(student.id));

  return (
    <AppLayout>
      <PageHeader
        title="Generate Certificates"
        description="Pick the template once, then every selected student's record fills the same base format"
        breadcrumbs={[{ label: "Certificates", href: "/certificate/template" }, { label: "Generate Certificates" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Filters & options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Certificate template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!templates.length && (
                <p className="text-xs text-muted-foreground">
                  No templates yet — create one in Certificate Template.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grade</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  <SelectItem value="A+">A+ · Excellent</SelectItem>
                  <SelectItem value="A">A · Very Good</SelectItem>
                  <SelectItem value="B">B · Good</SelectItem>
                  <SelectItem value="C">C · Pass</SelectItem>
                  <SelectItem value="F">F · Not cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Selected: {chosen.length} student{chosen.length === 1 ? "" : "s"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>Certificates to issue: {chosen.length}</span>
              </div>
              {failing > 0 && (
                <p className="text-xs text-destructive">
                  {failing} selected student{failing === 1 ? " has" : "s have"} not cleared the {PASS_MARK}% pass mark.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button className="w-full" disabled={!template || !chosen.length} onClick={openPreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview certificates
              </Button>
              <Button variant="outline" className="w-full" disabled={!template || !chosen.length} onClick={print}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" className="w-full" disabled={!template || !chosen.length} onClick={download}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <CardTitle className="text-lg">Select students</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name, registration or certificate no."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Registration</th>
                    <th className="p-3 text-left text-sm font-medium">Name</th>
                    <th className="p-3 text-left text-sm font-medium">Course</th>
                    <th className="p-3 text-left text-sm font-medium">Marks</th>
                    <th className="p-3 text-left text-sm font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((student) => {
                    const grade = gradeFor(student.marks);
                    return (
                      <tr key={student.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <Checkbox
                            checked={selected.includes(student.id)}
                            onCheckedChange={() => toggle(student.id)}
                          />
                        </td>
                        <td className="p-3 font-mono text-sm">{student.registrationNo}</td>
                        <td className="p-3 text-sm font-medium">{student.name}</td>
                        <td className="p-3 text-sm">{student.course}</td>
                        <td className="p-3 text-sm">{student.marks}%</td>
                        <td className="p-3">
                          <Badge variant={grade === "F" ? "destructive" : "default"}>{grade}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visible.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <FileText className="h-6 w-6" />
                <p className="text-sm">No students match these filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificate preview</DialogTitle>
            <DialogDescription>
              {template?.name} · {chosen.length} certificate{chosen.length === 1 ? "" : "s"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
            {template &&
              chosen.map((student) => (
                <div key={student.id} className="space-y-2">
                  <p className="text-sm font-medium">
                    {student.name} · {student.certificateNo}
                  </p>
                  <CertificateSheet template={template} student={student} qr={qrs[student.id]} />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={print}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
