import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Eye, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";
import { newId, useLocalCollection } from "@/hooks/use-local-collection";
import { useToast } from "@/hooks/use-toast";
import { printHtml, pickImage } from "@/lib/export";
import { certificatesPdf } from "@/lib/certificate-pdf";
import { CertificateSheet, useCertificateQrs } from "@/components/certificates/CertificateSheet";
import {
  ACCENT_OPTIONS,
  CERTIFICATE_TEMPLATES_KEY,
  CERTIFICATE_TEMPLATE_SEED,
  CertificateTemplate as Template,
  FRAME_COLORS,
  FRAME_OPTIONS,
  SAMPLE_CERTIFICATE_STUDENT,
  blankCertificateTemplate,
  certificateHtml,
} from "@/data/certificate-templates";

type Draft = Omit<Template, "id">;

export default function CertificateTemplatePage() {
  const { toast } = useToast();
  const { items, add, update, remove } = useLocalCollection<Template>(
    CERTIFICATE_TEMPLATES_KEY,
    CERTIFICATE_TEMPLATE_SEED,
  );
  const [editingId, setEditingId] = useState<string | null>(items[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft>(() => {
    if (!items[0]) return blankCertificateTemplate();
    const { id: _id, ...rest } = items[0];
    return rest;
  });
  const [deleting, setDeleting] = useState<Template | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const current: Template = { ...draft, id: editingId ?? "preview" };
  const student = SAMPLE_CERTIFICATE_STUDENT;
  const qrs = useCertificateQrs(current, [student]);

  /** Every image slot on the sheet goes through the same picker. */
  const upload = async (accept: string, apply: (dataUrl: string) => void) => {
    const picked = await pickImage(accept, 1_500_000);
    if (picked === "too-large") {
      toast({ title: "Image too large", description: "Use an image under 1.5 MB.", variant: "destructive" });
      return;
    }
    if (!picked) return;
    apply(picked.dataUrl);
  };

  const load = (template: Template) => {
    const { id, ...rest } = template;
    setEditingId(id);
    setDraft(rest);
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(blankCertificateTemplate());
    toast({ title: "New template", description: "The base format is ready — fill in the institute details." });
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast({ title: "Name required", description: "Give the template a name before saving.", variant: "destructive" });
      return;
    }
    if (!draft.instituteName.trim()) {
      toast({ title: "Institute name required", description: "The certificate head prints blank without it.", variant: "destructive" });
      return;
    }
    if (editingId) {
      update(editingId, draft);
      toast({ title: "Template updated", description: `${draft.name} was saved.` });
      return;
    }
    const id = newId("certtpl");
    add({ ...draft, id });
    setEditingId(id);
    toast({ title: "Template saved", description: `${draft.name} is now available in Generate Certificates.` });
  };

  const duplicate = (template: Template) => {
    const { id: _id, ...rest } = template;
    add({ ...rest, name: `${template.name} (Copy)`, status: "draft" });
    toast({ title: "Template duplicated", description: `A draft copy of ${template.name} was created.` });
  };

  const preview = () =>
    printHtml(draft.name || "Certificate", certificateHtml(current, student, qrs[student.id]));

  const downloadSample = () => {
    certificatesPdf(current, [student], qrs, `${draft.name || "certificate"}-sample.pdf`);
    toast({ title: "Sample PDF generated", description: "A one-page proof is in your Downloads." });
  };

  const setSignatory = (index: number, patch: Partial<Template["signatories"][number]>) =>
    set("signatories", draft.signatories.map((person, i) => (i === index ? { ...person, ...patch } : person)));

  const setBadge = (index: number, patch: Partial<Template["badges"][number]>) =>
    set("badges", draft.badges.map((badge, i) => (i === index ? { ...badge, ...patch } : badge)));

  return (
    <AppLayout>
      <PageHeader
        title="Certificate Template"
        description="The base format is fixed — edit the institute wording here and every student's certificate fills itself in"
        breadcrumbs={[{ label: "Certificates", href: "/certificate/template" }, { label: "Certificate Template" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadSample}>Sample PDF</Button>
            <Button variant="outline" onClick={preview}>
              <Eye className="mr-2 h-4 w-4" />
              Print preview
            </Button>
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              {editingId ? "Update template" : "Save template"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Live preview</CardTitle>
              <Badge variant="secondary">Sample: {student.name}</Badge>
            </CardHeader>
            <CardContent>
              <CertificateSheet template={current} student={student} qr={qrs[student.id]} />
              <p className="pt-3 text-xs text-muted-foreground">
                Names, parentage, registration, course, grade, marks and certificate number come from
                the student record — the layout above never changes.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="institute">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="institute">Head</TabsTrigger>
                  <TabsTrigger value="authority">Authority</TabsTrigger>
                  <TabsTrigger value="people">Sign-off</TabsTrigger>
                  <TabsTrigger value="look">Look</TabsTrigger>
                </TabsList>

                <TabsContent value="institute" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Template name</Label>
                    <Input value={draft.name} placeholder="e.g. ADCA Completion" onChange={(e) => set("name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch code</Label>
                    <Input value={draft.branchCode} onChange={(e) => set("branchCode", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Institute name</Label>
                    <Input value={draft.instituteName} onChange={(e) => set("instituteName", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Address line 1</Label>
                      <Input value={draft.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Address line 2</Label>
                      <Input value={draft.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={draft.title} onChange={(e) => set("title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Institute logo</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => upload("image/*", (dataUrl) => set("logo", dataUrl))}>
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        {draft.logo ? "Replace" : "Upload"}
                      </Button>
                      {draft.logo && (
                        <Button variant="ghost" size="sm" onClick={() => set("logo", null)}>
                          <X className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="authority" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Heading</Label>
                    <Input value={draft.authorityHeading} onChange={(e) => set("authorityHeading", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Authorising company</Label>
                    <Input value={draft.authorityName} onChange={(e) => set("authorityName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration lines</Label>
                    <Textarea
                      rows={5}
                      value={draft.authorityLines.join("\n")}
                      onChange={(e) => set("authorityLines", e.target.value.split("\n"))}
                    />
                    <p className="text-xs text-muted-foreground">One line per row — CIN, UDYAM, ISO, registered office.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={draft.website} onChange={(e) => set("website", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={draft.email} onChange={(e) => set("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Verification note</Label>
                    <Input value={draft.verificationNote} onChange={(e) => set("verificationNote", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Verification URL (QR)</Label>
                    <Input value={draft.verifyBaseUrl} onChange={(e) => set("verifyBaseUrl", e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      The certificate number is appended, so each student's QR resolves to their own record.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Grading legend</Label>
                    <Textarea rows={2} value={draft.gradeLegend} onChange={(e) => set("gradeLegend", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Competency paragraph</Label>
                    <Textarea rows={4} value={draft.competencyNote} onChange={(e) => set("competencyNote", e.target.value)} />
                  </div>
                </TabsContent>

                <TabsContent value="people" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Signatories</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={draft.signatories.length >= 4}
                      onClick={() =>
                        set("signatories", [...draft.signatories, { id: newId("sig"), name: "", role: "", signature: null }])
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {draft.signatories.map((person, index) => (
                    <div key={person.id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Name"
                          value={person.name}
                          onChange={(e) => setSignatory(index, { name: e.target.value })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => set("signatories", draft.signatories.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Designation, e.g. (Centre Head)"
                        value={person.role}
                        onChange={(e) => setSignatory(index, { role: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => upload("image/*", (dataUrl) => setSignatory(index, { signature: dataUrl }))}
                        >
                          <Upload className="mr-2 h-3.5 w-3.5" />
                          {person.signature ? "Replace signature" : "Upload signature"}
                        </Button>
                        {person.signature && (
                          <Button size="sm" variant="ghost" onClick={() => setSignatory(index, { signature: null })}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <Label>Accreditation badges</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={draft.badges.length >= 5}
                      onClick={() => set("badges", [...draft.badges, { id: newId("badge"), label: "ISO", image: null }])}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {draft.badges.map((badge, index) => (
                    <div key={badge.id} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        placeholder="Label"
                        value={badge.label}
                        onChange={(e) => setBadge(index, { label: e.target.value })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => upload("image/*", (dataUrl) => setBadge(index, { image: dataUrl }))}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => set("badges", draft.badges.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="look" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Border</Label>
                    <Select value={draft.frame} onValueChange={(value) => set("frame", value as Template["frame"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FRAME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Border colour</Label>
                    <Select value={draft.frameColor} onValueChange={(value) => set("frameColor", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FRAME_COLORS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ background: option.value }} />
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Text accent</Label>
                    <Select value={draft.accent} onValueChange={(value) => set("accent", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ background: option.value }} />
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pre-printed stationery</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => upload("image/*", (dataUrl) => set("background", dataUrl))}>
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        {draft.background ? "Replace artwork" : "Upload artwork"}
                      </Button>
                      {draft.background && (
                        <Button variant="ghost" size="sm" onClick={() => set("background", null)}>
                          <X className="mr-1 h-3.5 w-3.5" />
                          Use drawn border
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload your own blank certificate (A4 portrait) to replace the drawn guilloche border entirely.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show logo</Label>
                    <Switch checked={draft.showLogo} onCheckedChange={(value) => set("showLogo", value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show verification QR</Label>
                    <Switch checked={draft.showQr} onCheckedChange={(value) => set("showQr", value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show award seal</Label>
                    <Switch checked={draft.showSeal} onCheckedChange={(value) => set("showSeal", value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Guilloche watermark</Label>
                    <Switch checked={draft.showWatermark} onCheckedChange={(value) => set("showWatermark", value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Publish as active</Label>
                    <Switch
                      checked={draft.status === "active"}
                      onCheckedChange={(value) => set("status", value ? "active" : "draft")}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Saved templates</CardTitle>
              <Button size="sm" variant="ghost" onClick={startNew}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 && <p className="text-sm text-muted-foreground">No templates saved yet.</p>}
              {items.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 ${
                    editingId === template.id ? "border-primary" : ""
                  }`}
                >
                  <button type="button" className="flex-1 text-left" onClick={() => load(template)}>
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {template.frame} · {template.signatories.length} signatories
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Badge variant={template.status === "active" ? "default" : "secondary"}>{template.status}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(template)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleting(template)}
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

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} will no longer be selectable in Generate Certificates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleting) return;
                remove(deleting.id);
                if (editingId === deleting.id) {
                  setEditingId(null);
                  setDraft(blankCertificateTemplate());
                }
                toast({ title: "Template deleted", description: `${deleting.name} was removed.` });
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
