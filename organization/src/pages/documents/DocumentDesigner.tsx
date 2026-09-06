import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Droplet,
  Image as ImageIcon,
  Minus,
  Plus,
  Printer,
  QrCode,
  Redo2,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { printHtml } from "@/lib/export";
import { getStudents, getCourses } from "@/lib/supabase/data";
import {
  DOCUMENT_KINDS,
  type DocElement,
  type DocumentDesign,
  type DocumentKind,
  SAMPLE_DATA,
  TOKEN_LABELS,
  type TokenData,
  designHtml,
  element,
  loadDesigns,
  replaceTokens,
  saveDesigns,
  starterDesign,
  usedTokens,
} from "@/lib/documentDesigner";

const KIND_ORDER: DocumentKind[] = [
  "certificate",
  "marksheet",
  "student-id",
  "staff-id",
  "admit-card",
];

/** So `/certificate/template` and `/marksheet/template` open on the right one. */
function kindFromPath(pathname: string, param: string | null): DocumentKind {
  if (param && (KIND_ORDER as string[]).includes(param)) return param as DocumentKind;
  if (pathname.startsWith("/marksheet")) return "marksheet";
  if (pathname.startsWith("/cards/admit")) return "admit-card";
  if (pathname.startsWith("/cards/id")) return "student-id";
  return "certificate";
}

interface StudentRow {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fatherName?: string;
  motherName?: string;
  enrollmentNo?: string;
  applicationNo?: string;
  phone?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  courseId?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export default function DocumentDesigner() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<DocumentKind>(() =>
    kindFromPath(window.location.pathname, params.get("type")),
  );
  const [designs, setDesigns] = useState<Partial<Record<DocumentKind, DocumentDesign>>>(
    () => loadDesigns(),
  );
  const design = designs[kind] ?? starterDesign(kind);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.6);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [studentId, setStudentId] = useState("");
  const [instituteName, setInstituteName] = useState(SAMPLE_DATA.institute);
  const [qrByElement, setQrByElement] = useState<Record<string, string>>({});
  // Per-kind history, so undo after a type switch cannot resurrect a foreign layout.
  const history = useRef<Record<string, { stack: string[]; index: number }>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const meta = DOCUMENT_KINDS[kind];
  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  const commit = useCallback(
    (next: DocumentDesign, record = true) => {
      setDesigns((prev) => {
        const merged = { ...prev, [kind]: next };
        if (record) {
          const entry = history.current[kind] ?? { stack: [], index: -1 };
          entry.stack = entry.stack.slice(0, entry.index + 1);
          entry.stack.push(JSON.stringify(next));
          if (entry.stack.length > 40) entry.stack.shift();
          entry.index = entry.stack.length - 1;
          history.current[kind] = entry;
        }
        return merged;
      });
    },
    [kind],
  );

  // A kind opened for the first time gets its starter layout, and its first
  // history entry, so the very first undo has somewhere to land.
  useEffect(() => {
    if (!designs[kind]) {
      const fresh = starterDesign(kind);
      history.current[kind] = { stack: [JSON.stringify(fresh)], index: 0 };
      setDesigns((prev) => ({ ...prev, [kind]: fresh }));
    } else if (!history.current[kind]) {
      history.current[kind] = { stack: [JSON.stringify(designs[kind])], index: 0 };
    }
    setSelectedId(null);
  }, [kind, designs]);

  useEffect(() => {
    const branchId = user?.branchId ?? null;
    getStudents(branchId, 1, 100)
      .then((r) => setStudents((r.data || []) as StudentRow[]))
      .catch(() => setStudents([]));
    getCourses(user?.organizationId)
      .then((r) => setCourses(r.data as Array<{ id: string; name: string }>))
      .catch(() => setCourses([]));
  }, [user?.branchId, user?.organizationId]);

  /**
   * Sample values are the fallback, not the source: a chosen student overwrites
   * only the tokens their record can actually answer, so a certificate keeps a
   * readable placeholder for the ones it cannot.
   */
  const data: TokenData = useMemo(() => {
    const base: TokenData = { ...SAMPLE_DATA, institute: instituteName };
    const student = students.find((s) => s.id === studentId);
    if (!student) return base;
    const name = [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" ");
    const filled: TokenData = {
      student_name: name || base.student_name,
      father_name: student.fatherName || "",
      mother_name: student.motherName || "",
      course_name:
        courses.find((c) => c.id === student.courseId)?.name || base.course_name,
      enrollment_no: student.enrollmentNo || "",
      application_no: student.applicationNo || "",
      certificate_id: student.enrollmentNo || student.applicationNo || "",
      phone: student.phone || "",
      blood_group: student.bloodGroup || "",
      dob: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
      address: [student.streetAddress, student.city, student.state, student.pincode]
        .filter(Boolean)
        .join(", "),
      issue_date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    };
    for (const [key, value] of Object.entries(filled)) {
      if (value) base[key] = value;
    }
    return base;
  }, [students, studentId, courses, instituteName]);

  // QR images are async, so they are rendered once per (element, payload) pair
  // and cached - regenerating inside render would loop forever.
  useEffect(() => {
    const qrs = design.elements.filter((e) => e.type === "qr");
    if (!qrs.length) return;
    let cancelled = false;
    const payload = data.certificate_id || data.enrollment_no || data.student_name;
    Promise.all(
      qrs.map((el) =>
        QRCode.toDataURL(`verify:${payload}`, {
          width: Math.max(64, Math.round(el.width)),
          margin: 0,
        })
          .then((src) => [el.id, src] as const)
          .catch(() => [el.id, ""] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setQrByElement(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [design.elements, data]);

  const update = (patch: Partial<DocElement>) => {
    if (!selected) return;
    commit({
      ...design,
      elements: design.elements.map((e) =>
        e.id === selected.id ? { ...e, ...patch } : e,
      ),
    });
  };

  const add = (el: DocElement) => {
    commit({ ...design, elements: [...design.elements, el] });
    setSelectedId(el.id);
  };

  const remove = () => {
    if (!selected) return;
    commit({ ...design, elements: design.elements.filter((e) => e.id !== selected.id) });
    setSelectedId(null);
  };

  const duplicate = () => {
    if (!selected) return;
    // `id` is dropped so the copy gets a fresh one - keeping it would leave two
    // elements sharing a key and only one of them selectable.
    const { id: _ignored, ...rest } = selected;
    add(element(selected.type, { ...rest, x: selected.x + 20, y: selected.y + 20 }));
  };

  const step = (direction: -1 | 1) => {
    const entry = history.current[kind];
    if (!entry) return;
    const next = entry.index + direction;
    if (next < 0 || next >= entry.stack.length) return;
    entry.index = next;
    commit(JSON.parse(entry.stack[next]) as DocumentDesign, false);
    setSelectedId(null);
  };

  const startDrag = (event: React.PointerEvent, el: DocElement) => {
    event.preventDefault();
    setSelectedId(el.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = el.x;
    const originY = el.y;
    let latest = { x: originX, y: originY };
    const move = (ev: PointerEvent) => {
      latest = {
        x: Math.round(originX + (ev.clientX - startX) / zoom),
        y: Math.round(originY + (ev.clientY - startY) / zoom),
      };
      // Dragging is recorded once on release; recording every pointermove would
      // fill the undo stack with a pixel of movement per entry.
      setDesigns((prev) => {
        const current = prev[kind];
        if (!current) return prev;
        return {
          ...prev,
          [kind]: {
            ...current,
            elements: current.elements.map((e) =>
              e.id === el.id ? { ...e, ...latest } : e,
            ),
          },
        };
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      setDesigns((prev) => {
        const current = prev[kind];
        if (current) {
          const entry = history.current[kind] ?? { stack: [], index: -1 };
          entry.stack = entry.stack.slice(0, entry.index + 1);
          entry.stack.push(JSON.stringify(current));
          entry.index = entry.stack.length - 1;
          history.current[kind] = entry;
        }
        return prev;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const uploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      add(
        element("image", {
          x: 340,
          y: 240,
          width: 180,
          height: 180,
          src: String(reader.result),
        }),
      );
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const save = () => {
    saveDesigns(designs);
    toast({
      title: "Design saved",
      description: `${meta.label} layout stored on this device.`,
    });
  };

  const reset = () => {
    const fresh = starterDesign(kind);
    commit(fresh);
    setSelectedId(null);
  };

  const print = () => {
    printHtml(meta.label, designHtml(kind, design, data, qrByElement));
  };

  const unfilled = usedTokens(design.elements).filter((t) => !data[t]);

  return (
    <AppLayout>
      <PageHeader
        title="Document Designer"
        description="One designer for certificates, marksheets, ID cards and admit cards. Drag the boxes, and {{tokens}} fill from the student record."
        breadcrumbs={[{ label: "Documents" }, { label: meta.label }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => step(-1)}>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
            </Button>
            <Button variant="outline" onClick={() => step(1)}>
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
            </Button>
            <Button variant="outline" onClick={print}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              Save design
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* -------- left: type, elements, tokens -------- */}
        <div className="space-y-4 xl:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Document type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as DocumentKind);
                  setParams({ type: v }, { replace: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>
                      {DOCUMENT_KINDS[k].icon} {DOCUMENT_KINDS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Canvas {meta.width} × {meta.height} px
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to starter layout
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Elements</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <ElementButton
                icon={Type}
                label="Text"
                onClick={() =>
                  add(element("text", { x: 350, y: 250, width: 300, height: 50, text: "New text" }))
                }
              />
              <ElementButton
                icon={Type}
                label="Heading"
                onClick={() =>
                  add(
                    element("text", {
                      x: 300,
                      y: 150,
                      width: 400,
                      height: 70,
                      text: "HEADING",
                      fontSize: 38,
                      fontWeight: "800",
                    }),
                  )
                }
              />
              <ElementButton
                icon={Square}
                label="Shape"
                onClick={() =>
                  add(
                    element("shape", {
                      x: 300,
                      y: 200,
                      width: 300,
                      height: 150,
                      border: "2px solid #334155",
                      background: "#f8fafc",
                      radius: 10,
                    }),
                  )
                }
              />
              <ElementButton
                icon={User}
                label="Photo box"
                onClick={() =>
                  add(
                    element("shape", {
                      x: 80,
                      y: 180,
                      width: 190,
                      height: 240,
                      background: "#cbd5e1",
                      radius: 12,
                      text: "Photo",
                    }),
                  )
                }
              />
              <ElementButton
                icon={QrCode}
                label="QR code"
                onClick={() => add(element("qr", { x: 750, y: 480, width: 120, height: 120 }))}
              />
              <ElementButton
                icon={Droplet}
                label="Watermark"
                onClick={() =>
                  add(
                    element("text", {
                      x: 250,
                      y: 300,
                      width: 500,
                      height: 100,
                      text: "{{institute}}",
                      fontSize: 42,
                      fontWeight: "800",
                      color: "#94a3b8",
                      opacity: 0.15,
                      rotate: -25,
                      z: 1,
                    }),
                  )
                }
              />
              <label className="col-span-2">
                <span className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-muted/40 p-3 text-xs font-semibold hover:bg-muted">
                  <ImageIcon className="h-4 w-4" />
                  Upload image / logo / signature
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dynamic data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Click to drop the token on the canvas.
              </p>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {Object.entries(TOKEN_LABELS).map(([token, label]) => (
                  <button
                    key={token}
                    onClick={() =>
                      add(
                        element("text", {
                          x: 300,
                          y: 250,
                          width: 320,
                          height: 45,
                          text: `{{${token}}}`,
                          fontSize: 22,
                        }),
                      )
                    }
                    className="flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/30 px-2.5 py-2 text-xs hover:bg-muted"
                  >
                    <span>{label}</span>
                    <code className="text-[10px] text-brand">{`{{${token}}}`}</code>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* -------- centre: canvas -------- */}
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Zoom</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs font-semibold">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.1).toFixed(2)))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={duplicate} disabled={!selected}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={remove} disabled={!selected}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-auto rounded-2xl border bg-muted/40 p-6">
            <div
              style={{
                width: meta.width * zoom,
                height: meta.height * zoom,
                margin: "0 auto",
              }}
            >
              <div
                ref={canvasRef}
                onPointerDown={(e) => {
                  if (e.target === canvasRef.current) setSelectedId(null);
                }}
                style={{
                  position: "relative",
                  width: meta.width,
                  height: meta.height,
                  background: design.background,
                  backgroundImage: design.backgroundImage
                    ? `url('${design.backgroundImage}')`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(15,23,42,.18)",
                }}
              >
                {[...design.elements]
                  .sort((a, b) => a.z - b.z)
                  .map((el) => (
                    <div
                      key={el.id}
                      onPointerDown={(e) => startDrag(e, el)}
                      style={{
                        position: "absolute",
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        transform: `rotate(${el.rotate}deg)`,
                        opacity: el.opacity,
                        zIndex: el.z,
                        cursor: "move",
                        userSelect: "none",
                        outline:
                          el.id === selectedId ? "2px solid hsl(var(--brand))" : undefined,
                        outlineOffset: 3,
                      }}
                    >
                      <ElementBody el={el} data={data} qr={qrByElement[el.id]} />
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {unfilled.length > 0 && (
            <p className="text-xs text-muted-foreground">
              No value yet for {unfilled.map((t) => `{{${t}}}`).join(", ")} — these
              print as written until the record or the sample data supplies them.
            </p>
          )}
        </div>

        {/* -------- right: properties + data -------- */}
        <div className="space-y-4 xl:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Institute name</Label>
                <Input
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preview with student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sample data" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {[s.firstName, s.lastName].filter(Boolean).join(" ") || s.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {students.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No students on this branch yet — the sample values are used.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Background colour</Label>
                <Input
                  type="color"
                  value={design.background}
                  onChange={(e) => commit({ ...design, background: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Select an element on the canvas.
                </p>
              ) : (
                <div className="space-y-3">
                  {selected.type === "text" && (
                    <div className="space-y-2">
                      <Label>Text</Label>
                      <Textarea
                        rows={3}
                        value={selected.text}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="X" value={selected.x} onChange={(x) => update({ x })} />
                    <NumberField label="Y" value={selected.y} onChange={(y) => update({ y })} />
                    <NumberField
                      label="Width"
                      value={selected.width}
                      onChange={(width) => update({ width })}
                    />
                    <NumberField
                      label="Height"
                      value={selected.height}
                      onChange={(height) => update({ height })}
                    />
                    <NumberField
                      label="Rotate"
                      value={selected.rotate}
                      onChange={(rotate) => update({ rotate })}
                    />
                    <NumberField
                      label="Font size"
                      value={selected.fontSize}
                      onChange={(fontSize) => update({ fontSize })}
                    />
                  </div>
                  {selected.type === "text" && (
                    <>
                      <div className="space-y-2">
                        <Label>Colour</Label>
                        <Input
                          type="color"
                          value={selected.color}
                          onChange={(e) => update({ color: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Weight</Label>
                          <Select
                            value={selected.fontWeight}
                            onValueChange={(fontWeight) => update({ fontWeight })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["400", "600", "700", "800"].map((w) => (
                                <SelectItem key={w} value={w}>
                                  {w}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Align</Label>
                          <Select
                            value={selected.align}
                            onValueChange={(v) =>
                              update({ align: v as DocElement["align"] })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Centre</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Opacity — {Math.round(selected.opacity * 100)}%</Label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                      value={selected.opacity}
                      onChange={(e) => update({ opacity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update({ z: Math.max(...design.elements.map((e) => e.z)) + 1 })
                      }
                    >
                      Bring front
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => update({ z: 1 })}>
                      Send back
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function ElementBody({
  el,
  data,
  qr,
}: {
  el: DocElement;
  data: TokenData;
  qr?: string;
}) {
  if (el.type === "image") {
    return (
      <img
        src={el.src}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: el.radius }}
      />
    );
  }
  if (el.type === "qr") {
    return qr ? (
      <img src={qr} alt="QR" style={{ width: "100%", height: "100%", background: "#fff" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#fff", border: "1px solid #cbd5e1" }} />
    );
  }
  const justify =
    el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight as never,
        color: el.color,
        background: el.background,
        border: el.border,
        borderRadius: el.radius,
        textAlign: el.align,
        padding: 4,
        overflow: "hidden",
      }}
    >
      {el.type === "shape" && el.text === "Text" ? "" : replaceTokens(el.text, data)}
    </div>
  );
}

function ElementButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Type;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border bg-muted/30 p-3 text-xs font-semibold transition hover:bg-muted"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
