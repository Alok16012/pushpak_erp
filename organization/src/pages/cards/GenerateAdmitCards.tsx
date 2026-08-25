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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Eye, Search, Users, FileText, Calendar } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { printHtml } from "@/lib/export";
import { admitCardsPdf } from "@/lib/admit-card-pdf";
import {
  ADMIT_CARD_TEMPLATES_KEY,
  AdmitCardTemplate,
  EXAMS,
  admitCardHtml,
  admitCardSheetHtml,
  findExam,
} from "@/data/admit-card-templates";
import { getStudents, getBatches, getInvoices } from "@/lib/supabase/data";
import { useAuth } from "@/contexts/AuthContext";

interface AdmitCardStudent {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNo: string;
  feeStatus: "paid" | "pending" | "overdue";
}

const CLASSES = ["8th", "9th", "10th"];
const SECTIONS = ["A", "B"];

const FEE_BADGES: Record<string, string> = {
  paid: "bg-green-500/10 text-green-600 border-green-200",
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  overdue: "bg-red-500/10 text-red-600 border-red-200",
};

export default function GenerateAdmitCards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AdmitCardTemplate[]>([]);
  const [admitStudents, setAdmitStudents] = useState<AdmitCardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchMap, setBatchMap] = useState<Record<string, { name: string; code: string }>>({});

  const [examValue, setExamValue] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [examValue, setExamValue] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [feeFilter, setFeeFilter] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const exam = useMemo(() => findExam(examValue), [examValue]);
  const effectiveTemplate = template;

  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem(ADMIT_CARD_TEMPLATES_KEY);
      if (raw) setTemplates(JSON.parse(raw));
    } catch { /* use empty */ }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchId = user?.branchId || "";
    Promise.all([
      getStudents(branchId, 1, 100),
      getBatches(branchId),
      getInvoices(user?.branchId || ""),
    ])
      .then(([studentsRes, batchesRes, invoicesRes]) => {
        if (cancelled) return;
        // Build batch lookup: batchId -> { name, code }
        const map: Record<string, { name: string; code: string }> = {};
        for (const b of batchesRes.data || []) {
          map[b.id] = { name: b.name, code: b.code };
        }
        setBatchMap(map);

        // Build invoice lookup: studentId -> best status
        const invoiceByStudent: Record<string, string> = {};
        for (const inv of invoicesRes.data || []) {
          const sid = (inv as any).studentId;
          if (!sid) continue;
          const status = (inv as any).status || "PENDING";
          // Best status: PAID > PARTIAL > anything else
          if (!invoiceByStudent[sid] || status === "PAID") {
            invoiceByStudent[sid] = status;
          }
        }

        const feeMap: Record<string, "paid" | "pending" | "overdue"> = {
          PAID: "paid",
          PARTIAL: "pending",
          PENDING: "pending",
          OVERDUE: "overdue",
        };

        const mapped: AdmitCardStudent[] = (studentsRes.data || []).map((s: any) => {
          const batchKey = s.batchId || "";
          const batch = map[batchKey];
          const parts = batch?.name?.split(/\s+/) || ["—", "—"];
          const invoiceStatus = invoiceByStudent[s.id] || "PENDING";
          const feeStatus = feeMap[invoiceStatus] || "pending";
          return {
            id: s.id,
            name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
            class: parts[0] || "—",
            section: parts[1] || "—",
            rollNo: s.enrollmentNo ?? s.id.slice(0, 8),
            feeStatus,
          };
        });
        setAdmitStudents(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Failed to load students", description: "Could not fetch student list.", variant: "destructive" });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.branchId, toast]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return admitStudents.filter(
      (s) =>
        (classFilter === "all" || s.class === classFilter) &&
        (sectionFilter === "all" || s.section === sectionFilter) &&
        (feeFilter === "all" || s.feeStatus === feeFilter) &&
        (!term || s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term)),
    );
  }, [classFilter, sectionFilter, feeFilter, searchTerm, admitStudents]);

  /** Rows hidden by the filters are not printed, even if they were ticked. */
  const chosen = filteredStudents.filter((s) => selectedStudents.includes(s.id));
  const unpaid = chosen.filter((s) => s.feeStatus !== "paid").length;
  const allSelected = filteredStudents.length > 0 && chosen.length === filteredStudents.length;

  const toggleStudent = (id: string) =>
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const toggleAll = () =>
    setSelectedStudents(allSelected ? [] : filteredStudents.map((s) => s.id));

  /** Every output button needs the same two things picked. */
  const ready = () => {
    if (!effectiveTemplate) {
      toast({ title: "Pick a template", description: "Choose an admit card template first.", variant: "destructive" });
      return false;
    }
    if (!chosen.length) {
      toast({ title: "No students selected", description: "Tick at least one student to generate cards for.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const openPreview = () => {
    if (!ready()) return;
    setPreviewOpen(true);
  };

  const print = () => {
    if (!ready() || !effectiveTemplate) return;
    printHtml(
      `${effectiveTemplate.name} - ${chosen.length} admit card${chosen.length > 1 ? "s" : ""}`,
      admitCardSheetHtml(effectiveTemplate, chosen),
    );
  };

  const download = () => {
    if (!ready() || !effectiveTemplate) return;
    const { pages } = admitCardsPdf(
      effectiveTemplate,
      chosen,
      `admit-cards-${effectiveTemplate.name || "batch"}.pdf`,
    );
    toast({
      title: "Admit cards downloaded",
      description: `${chosen.length} card${chosen.length > 1 ? "s" : ""} across ${pages} page${pages > 1 ? "s" : ""}.`,
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Generate Admit Cards"
        description="Generate and print admit cards for examinations"
        breadcrumbs={[
          { label: "ID & Admit Card", href: "/cards/id-template" },
          { label: "Generate Admit Cards" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Exam & Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Examination</Label>
              <Select value={examValue} onValueChange={setExamValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose examination" />
                </SelectTrigger>
                <SelectContent>
                  {EXAMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.window}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No templates yet - design one on the Admit Card Template page.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {CLASSES.map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map((value) => (
                    <SelectItem key={value} value={value}>Section {value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fee Status Filter</Label>
              <Select value={feeFilter} onValueChange={setFeeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="paid">Fee Paid Only</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="overdue">Overdue Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Selected: {chosen.length} students</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Template: {template?.name ?? "none chosen"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Exam: {exam ? `${exam.label} (${exam.window})` : "none chosen"}</span>
              </div>
              {unpaid > 0 && (
                <p className="text-xs text-yellow-700">
                  {unpaid} selected student{unpaid > 1 ? "s have" : " has"} an unpaid fee balance.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button className="w-full" disabled={chosen.length === 0} onClick={openPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview Admit Cards
              </Button>
              <Button variant="outline" className="w-full" disabled={chosen.length === 0} onClick={print}>
                <Printer className="h-4 w-4 mr-2" />
                Print Admit Cards
              </Button>
              <Button variant="outline" className="w-full" disabled={chosen.length === 0} onClick={download}>
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
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Student ID</th>
                    <th className="p-3 text-left text-sm font-medium">Name</th>
                    <th className="p-3 text-left text-sm font-medium">Class</th>
                    <th className="p-3 text-left text-sm font-medium">Roll No</th>
                    <th className="p-3 text-left text-sm font-medium">Fee Status</th>
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
                        <Badge className={FEE_BADGES[student.feeStatus]}>
                          {student.feeStatus}
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
                No students found matching your filters
              </div>
            )}

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> Only students visible under the current filters are
                included in the printed batch. Use the fee status filter to restrict generation
                to students who have cleared their fees.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admit card preview</DialogTitle>
            <DialogDescription>
              {chosen.length} card{chosen.length > 1 ? "s" : ""} using {effectiveTemplate?.name}
              {exam ? ` for ${exam.label}` : ""}.
            </DialogDescription>
          </DialogHeader>
          {effectiveTemplate && (
            <div
              className="rounded-lg bg-white p-4"
              dangerouslySetInnerHTML={{
                __html: chosen.map((student) => admitCardHtml(effectiveTemplate, student)).join(""),
              }}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={print}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={download}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}