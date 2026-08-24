import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Download, Eye, Search, Users, CreditCard, Image as ImageIcon, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { printHtml } from "@/lib/export";
import { idCardsPdf } from "@/lib/id-card-pdf";
import {
  ID_CARD_TEMPLATES_KEY,
  IdCardTemplate,
  fieldValue,
  idCardSheetHtml,
} from "@/data/id-card-templates";
import { getStudents } from "@/lib/supabase/data";
import { useAuth } from "@/contexts/AuthContext";

interface IdCardStudent {
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

const STORAGE_KEY = ID_CARD_TEMPLATES_KEY;

export default function GenerateIDCards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [students, setStudents] = useState<IdCardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTemplates(JSON.parse(raw));
    } catch { /* use empty */ }
    return () => { cancelled = true; };
  }, []);

  const persistTemplates = (next: IdCardTemplate[]) => {
    setTemplates(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchId = user?.branchId || "";
    getStudents(branchId, 1, 100)
      .then((data) => {
        if (cancelled) return;
        const mapped: IdCardStudent[] = (data ?? []).map((s: any) => ({
          id: s.id,
          name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
          class: s.batch?.name?.split(/\s+/)[0] ?? s.course?.name ?? "—",
          section: s.batch?.name?.split(/\s+/)[1] ?? "—",
          rollNo: s.enrollmentNo ?? s.id.slice(0, 8),
          photo: !!s.photo,
          dob: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          bloodGroup: s.bloodGroup ?? "—",
          parentContact: s.fatherName ? `Guardian: ${s.fatherName}` : s.phone ?? "—",
          address: [s.streetAddress, s.city, s.state, s.pincode].filter(Boolean).join(", ") || "—",
        }));
        setStudents(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Failed to load students", description: "Could not fetch student list.", variant: "destructive" });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  const template = templates.find((item) => item.id === templateId) ?? null;
  const classes = Array.from(new Set(students.map((s) => s.class))).sort();
  const sections = Array.from(new Set(students.map((s) => s.section))).sort();

  const filteredStudents = students.filter(
    (s) =>
      (classFilter === "all" || s.class === classFilter) &&
      (sectionFilter === "all" || s.section === sectionFilter) &&
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  /** Rows hidden by the filters are not printed, even if they were ticked. */
  const chosen = filteredStudents.filter((s) => selectedStudents.includes(s.id));
  const missingPhotos = chosen.filter((s) => !s.photo).length;

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    setSelectedStudents((prev) =>
      visibleIds.every((id) => prev.includes(id))
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  /** Every output button needs the same two things picked. */
  const ready = () => {
    if (!template) {
      toast({ title: "Choose a template", description: "Pick an ID card template first.", variant: "destructive" });
      return false;
    }
    if (!chosen.length) {
      toast({ title: "No students selected", description: "Tick at least one student.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const printCards = () => {
    if (!ready() || !template) return;
    printHtml(
      `ID Cards - ${template.name} - ${academicYear}`,
      idCardSheetHtml(template, chosen),
    );
  };

  const downloadPdf = () => {
    if (!ready() || !template) return;
    const { pages } = idCardsPdf(template, chosen, `id-cards-${academicYear}.pdf`);
    toast({
      title: "PDF generated",
      description: `${chosen.length} card${chosen.length === 1 ? "" : "s"} across ${pages} page${pages === 1 ? "" : "s"} - check your Downloads.`,
    });
  };

  const openPreview = () => {
    if (!ready()) return;
    setPreviewOpen(true);
  };

  const allVisibleSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudents.includes(s.id));

  return (
    <AppLayout>
      <PageHeader
        title="Generate ID Cards"
        description="Select students and generate ID cards in bulk"
        breadcrumbs={[
          { label: "ID & Admit Card", href: "/cards/id-template" },
          { label: "Generate ID Cards" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.orientation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!templates.length && (
                <p className="text-xs text-muted-foreground">
                  No templates yet - create one in ID Card Template.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((value) => (
                    <SelectItem key={value} value={value}>Section {value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Selected: {chosen.length} students</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>Cards to generate: {chosen.length}</span>
              </div>
              {missingPhotos > 0 && (
                <p className="text-xs text-destructive">
                  {missingPhotos} selected student{missingPhotos === 1 ? "" : "s"} have no photo - those cards print a blank frame.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button className="w-full" disabled={!template || chosen.length === 0} onClick={openPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview Cards
              </Button>
              <Button variant="outline" className="w-full" disabled={!template || chosen.length === 0} onClick={printCards}>
                <Printer className="h-4 w-4 mr-2" />
                Print Cards
              </Button>
              <Button variant="outline" className="w-full" disabled={!template || chosen.length === 0} onClick={downloadPdf}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">Select Students</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-center py-8 text-muted-foreground">Loading students...</div>
            )}
            {!loading && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Student ID</th>
                    <th className="p-3 text-left text-sm font-medium">Name</th>
                    <th className="p-3 text-left text-sm font-medium">Class</th>
                    <th className="p-3 text-left text-sm font-medium">Roll No</th>
                    <th className="p-3 text-left text-sm font-medium">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                      </td>
                      <td className="p-3 text-sm font-mono">{student.id}</td>
                      <td className="p-3 text-sm font-medium">{student.name}</td>
                      <td className="p-3 text-sm">{student.class} - {student.section}</td>
                      <td className="p-3 text-sm">{student.rollNo}</td>
                      <td className="p-3">
                        <Badge variant={student.photo ? "default" : "destructive"}>
                          {student.photo ? "Available" : "Missing"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {!loading && filteredStudents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No students found matching your search
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Card preview</DialogTitle>
            <DialogDescription>
              {template?.name} - {chosen.length} card{chosen.length === 1 ? "" : "s"} - {academicYear}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="flex flex-wrap gap-4">
              {template && chosen.map((student) => (
                <div
                  key={student.id}
                  className="overflow-hidden rounded-lg border bg-card shadow-sm"
                  style={{
                    width: template.orientation === "portrait" ? 200 : 300,
                    height: template.orientation === "portrait" ? 300 : 200,
                  }}
                >
                  <div className="px-3 py-2 text-white" style={{ background: template.accent }}>
                    <p className="text-xs font-bold leading-tight">{template.instituteName}</p>
                    <p className="text-[9px] opacity-85">{template.instituteAddress}</p>
                  </div>
                  <div className="flex gap-2 p-3">
                    {template.showPhoto && (
                      <div className="h-16 w-12 shrink-0 rounded border bg-muted flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {template.fields.includes("Student Name") && (
                        <p className="mb-1 truncate text-xs font-bold">{student.name}</p>
                      )}
                      <dl className="space-y-0.5">
                        {template.fields
                          .filter((label) => label !== "Student Name")
                          .map((label) => (
                            <div key={label} className="flex justify-between gap-2 text-[9px]">
                              <dt className="shrink-0 text-muted-foreground">{label}</dt>
                              <dd className="truncate font-medium">{fieldValue(label, student, template)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  </div>
                  <div className="flex items-end justify-between px-3">
                    {template.showQr ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded border">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <span />
                    )}
                    {template.showSignature && (
                      <div className="text-center">
                        <div className="mb-1 w-16 border-t border-foreground" />
                        <span className="text-[9px]">Principal</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={printCards}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={downloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}