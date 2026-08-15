import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Save,
  Eye,
  Trash2,
  Copy,
  Type,
  Image,
  QrCode,
  Table,
  GripVertical,
} from "lucide-react";
import { useState } from "react";
import { useLocalCollection, newId } from "@/hooks/use-local-collection";
import { printHtml } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

type Template = {
  id: string;
  name: string;
  exam: string;
  status: "active" | "draft";
  size: string;
  showQr: boolean;
  showPhoto: boolean;
  showSchedule: boolean;
  /** Labels from `fieldElements` that are placed on the card. */
  elements: string[];
};

const EXAMS = [
  { value: "midterm", label: "Mid-Term Exam" },
  { value: "final", label: "Final Exam" },
  { value: "unit", label: "Unit Test" },
];

const fieldElements = [
  { icon: Type, label: "Student Name", type: "text" },
  { icon: Type, label: "Roll Number", type: "text" },
  { icon: Type, label: "Class & Section", type: "text" },
  { icon: Type, label: "Exam Name", type: "text" },
  { icon: Type, label: "Exam Date", type: "text" },
  { icon: Image, label: "Student Photo", type: "image" },
  { icon: Image, label: "School Logo", type: "image" },
  { icon: QrCode, label: "QR Code", type: "qr" },
  { icon: Table, label: "Exam Schedule", type: "table" },
  { icon: Type, label: "Instructions", type: "textarea" },
];

/** Placeholder values so the canvas shows what a printed card will look like. */
const SAMPLE: Record<string, string> = {
  "Student Name": "Aarav Sharma",
  "Roll Number": "101",
  "Class & Section": "10th - A",
  "Exam Name": "Mid-Term Examination 2024",
  "Exam Date": "15 Jan 2025",
};

const SCHEDULE = [
  { subject: "Mathematics", when: "15 Jan, 9:00 AM" },
  { subject: "Science", when: "16 Jan, 9:00 AM" },
  { subject: "English", when: "17 Jan, 9:00 AM" },
];

const DEFAULT_ELEMENTS = [
  "Student Name",
  "Roll Number",
  "Class & Section",
  "Exam Name",
  "Exam Date",
  "School Logo",
];

const SEED: Template[] = [
  { id: "1", name: "Mid-Term Exam 2024", exam: "midterm", status: "active", size: "a4", showQr: true, showPhoto: true, showSchedule: true, elements: DEFAULT_ELEMENTS },
  { id: "2", name: "Final Exam 2024", exam: "final", status: "draft", size: "a4", showQr: false, showPhoto: true, showSchedule: true, elements: DEFAULT_ELEMENTS },
  { id: "3", name: "Unit Test Template", exam: "unit", status: "active", size: "a5", showQr: true, showPhoto: false, showSchedule: false, elements: ["Student Name", "Roll Number", "Exam Name"] },
];

const blank = (): Omit<Template, "id"> => ({
  name: "",
  exam: "",
  status: "draft",
  size: "a4",
  showQr: true,
  showPhoto: true,
  showSchedule: true,
  elements: [...DEFAULT_ELEMENTS],
});

/** The three toggles that have their own switches, keyed by element label. */
const SWITCHED: Record<string, "showPhoto" | "showQr" | "showSchedule"> = {
  "Student Photo": "showPhoto",
  "QR Code": "showQr",
  "Exam Schedule": "showSchedule",
};

export default function AdmitCardTemplate() {
  const { toast } = useToast();
  const { items, add, update, remove } = useLocalCollection<Template>("erp-admit-card-templates", SEED);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);

  const set = <K extends keyof Omit<Template, "id">>(key: K, value: Omit<Template, "id">[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const isPlaced = (label: string) => {
    const flag = SWITCHED[label];
    return flag ? draft[flag] : draft.elements.includes(label);
  };

  const togglePlaced = (label: string) => {
    const flag = SWITCHED[label];
    if (flag) return set(flag, !draft[flag]);
    set(
      "elements",
      draft.elements.includes(label)
        ? draft.elements.filter((e) => e !== label)
        : [...draft.elements, label],
    );
  };

  const load = (template: Template) => {
    const { id, ...rest } = template;
    setEditingId(id);
    setDraft(rest);
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(blank());
    toast({ title: "New template", description: "The canvas is reset — name it and save." });
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast({ title: "Name required", description: "Give the template a name before saving.", variant: "destructive" });
      return;
    }
    if (editingId) {
      update(editingId, draft);
      toast({ title: "Template updated", description: `${draft.name} was saved.` });
      return;
    }
    const id = newId("tpl");
    add({ ...draft, id });
    setEditingId(id);
    toast({ title: "Template saved", description: `${draft.name} was added to your templates.` });
  };

  const duplicate = (template: Template) => {
    const { id, ...rest } = template;
    add({ ...rest, name: `${template.name} (Copy)`, status: "draft" });
    toast({ title: "Template duplicated", description: `A draft copy of ${template.name} was created.` });
  };

  const destroy = (template: Template) => {
    remove(template.id);
    if (editingId === template.id) {
      setEditingId(null);
      setDraft(blank());
    }
    toast({ title: "Template deleted", description: `${template.name} was removed.` });
  };

  const examLabel = EXAMS.find((e) => e.value === draft.exam)?.label ?? "Examination";

  const preview = () => {
    const rows = draft.elements
      .filter((label) => SAMPLE[label])
      .map((label) => `<tr><td>${label}</td><td>${SAMPLE[label]}</td></tr>`)
      .join("");
    const schedule = draft.showSchedule
      ? `<h3>Exam Schedule</h3><table>${SCHEDULE.map((s) => `<tr><td>${s.subject}</td><td>${s.when}</td></tr>`).join("")}</table>`
      : "";
    const photo = draft.showPhoto ? "<p>[ Student Photo ]</p>" : "";
    const qr = draft.showQr ? "<p>[ QR Code ]</p>" : "";
    const instructions = draft.elements.includes("Instructions")
      ? "<p><strong>Instructions:</strong> Carry this admit card and a valid photo ID to every session.</p>"
      : "";
    printHtml(
      draft.name || "Admit Card",
      `<div class="card"><h2>ADMIT CARD — ${examLabel}</h2>${photo}<table>${rows}</table>${schedule}${instructions}${qr}<p>Principal's Signature: ____________</p></div>`,
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Admit Card Template"
        description="Design admit card templates for examinations"
        breadcrumbs={[
          { label: "ID & Admit Card", href: "/cards/id-template" },
          { label: "Admit Card Template" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={preview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={save}>
              <Save className="h-4 w-4 mr-2" />
              {editingId ? "Update Template" : "Save Template"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Elements */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fieldElements.map((element) => (
              <button
                key={element.label}
                type="button"
                onClick={() => togglePlaced(element.label)}
                className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors hover:bg-muted/50 ${
                  isPlaced(element.label) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <element.icon className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1">{element.label}</span>
                {isPlaced(element.label) && <Badge variant="secondary" className="text-[10px]">on</Badge>}
              </button>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Click an element to place it on — or remove it from — the canvas
            </p>
          </CardContent>
        </Card>

        {/* Center - Canvas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Template Canvas</CardTitle>
              <Select value={draft.size} onValueChange={(v) => set("size", v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 Size</SelectItem>
                  <SelectItem value="a5">A5 Size</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-4 min-h-[600px] bg-background">
              {/* Admit Card Preview */}
              <div className="border rounded-lg p-6 bg-card shadow-sm max-w-md mx-auto">
                <div className="text-center border-b pb-4 mb-4">
                  {draft.elements.includes("School Logo") && (
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-2 flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <h2 className="font-bold text-lg">School Name Here</h2>
                  <p className="text-xs text-muted-foreground">School Address, City - PIN</p>
                </div>

                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-sm">ADMIT CARD</Badge>
                  <h3 className="font-semibold mt-2">{draft.name || examLabel}</h3>
                </div>

                <div className="flex gap-4 mb-4">
                  {draft.showPhoto && (
                    <div className="w-24 h-28 bg-muted rounded border flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2 text-sm">
                    {draft.elements
                      .filter((label) => SAMPLE[label])
                      .map((label) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-muted-foreground">{label}:</span>
                          <span className="font-medium">{SAMPLE[label]}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {draft.showSchedule && (
                  <div className="border rounded p-3 mb-4">
                    <h4 className="text-xs font-semibold mb-2">EXAM SCHEDULE</h4>
                    <div className="text-xs space-y-1">
                      {SCHEDULE.map((slot) => (
                        <div key={slot.subject} className="flex justify-between">
                          <span>{slot.subject}</span>
                          <span>{slot.when}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {draft.elements.includes("Instructions") && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Carry this admit card and a valid photo ID to every session.
                  </p>
                )}

                <div className="flex justify-between items-end pt-4 border-t">
                  {draft.showQr ? (
                    <div className="w-16 h-16 border rounded flex items-center justify-center">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="text-center">
                    <div className="w-24 border-t border-foreground mb-1"></div>
                    <span className="text-xs">Principal's Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Properties & Saved Templates */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input placeholder="Enter template name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={draft.exam} onValueChange={(v) => set("exam", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAMS.map((exam) => (
                      <SelectItem key={exam.value} value={exam.value}>{exam.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Show QR Code</Label>
                <Switch checked={draft.showQr} onCheckedChange={(v) => set("showQr", v)} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Show Photo</Label>
                <Switch checked={draft.showPhoto} onCheckedChange={(v) => set("showPhoto", v)} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Show Schedule</Label>
                <Switch checked={draft.showSchedule} onCheckedChange={(v) => set("showSchedule", v)} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Publish as Active</Label>
                <Switch
                  checked={draft.status === "active"}
                  onCheckedChange={(v) => set("status", v ? "active" : "draft")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Saved Templates</CardTitle>
                <Button size="sm" variant="ghost" onClick={startNew}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No templates saved yet.</p>
              )}
              {items.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 ${
                    editingId === template.id ? "border-primary" : ""
                  }`}
                >
                  <button type="button" className="text-left flex-1" onClick={() => load(template)}>
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {EXAMS.find((e) => e.value === template.exam)?.label ?? template.exam}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Badge variant={template.status === "active" ? "default" : "secondary"}>
                      {template.status}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(template)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => destroy(template)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
