import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The designer is a leaf page: the layout, the auth context and the data layer
 * are all mocked away so these tests exercise the canvas and the properties
 * panel rather than the shell around them.
 */
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { branchId: "b1", organizationId: "o1" }, view: "admin" }),
}));

vi.mock("@/lib/supabase/data", () => ({
  getStudents: () => Promise.resolve({ success: true, data: [] }),
  getCourses: () => Promise.resolve({ success: true, data: [] }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));

vi.mock("qrcode", () => ({ default: { toDataURL: () => Promise.resolve("") } }));

const { default: DocumentDesigner } = await import("@/pages/documents/DocumentDesigner");

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/documents/designer" element={<DocumentDesigner />} />
        <Route path="/certificate/template" element={<DocumentDesigner />} />
        <Route path="/marksheet/template" element={<DocumentDesigner />} />
      </Routes>
    </MemoryRouter>,
  );

/** The properties panel's Text box - the only textarea on the page. */
const textBox = () => document.querySelector("textarea") as HTMLTextAreaElement | null;

/** Colour inputs in document order: canvas background, text colour, fill, border. */
/** A textarea's value is also its text content, so canvas lookups exclude it. */
const onCanvas = (text: string) => screen.getByText(text, { selector: "div" });

const colours = () =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="color"]'));

describe("document designer", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the element selected while its text is being edited", async () => {
    renderAt("/certificate/template");

    fireEvent.pointerDown(screen.getByText("CERTIFICATE OF ACHIEVEMENT"));
    await waitFor(() => expect(textBox()).toHaveValue("CERTIFICATE OF ACHIEVEMENT"));

    // One edit at a time: the panel used to close after the first, because every
    // design change also cleared the selection.
    for (const value of ["CERTIFICATE OF ACHIEVEMENT!", "CERTIFICATE OF EXCELLENCE"]) {
      fireEvent.change(textBox()!, { target: { value } });
      expect(textBox()).toHaveValue(value);
    }
    expect(onCanvas("CERTIFICATE OF EXCELLENCE")).toBeInTheDocument();
  });

  it("lets a shape be recoloured and labelled", async () => {
    renderAt("/certificate/template");

    fireEvent.click(screen.getByText("Shape"));
    await waitFor(() => expect(textBox()).toBeTruthy());

    fireEvent.change(textBox()!, { target: { value: "Seal" } });
    expect(onCanvas("Seal")).toBeInTheDocument();

    fireEvent.change(colours()[2], { target: { value: "#123456" } });
    expect(onCanvas("Seal")).toHaveStyle({ background: "#123456" });
  });

  it("follows the route when the document type changes", () => {
    const view = renderAt("/certificate/template");
    expect(screen.getByText("CERTIFICATE OF ACHIEVEMENT")).toBeInTheDocument();

    view.unmount();
    renderAt("/marksheet/template");
    expect(screen.getByText("STATEMENT OF MARKS")).toBeInTheDocument();
    expect(screen.queryByText("CERTIFICATE OF ACHIEVEMENT")).not.toBeInTheDocument();
  });

  it("leaves no placeholder label on a starter shape", async () => {
    const { DOCUMENT_KINDS, starterDesign } = await import("@/lib/documentDesigner");
    for (const kind of Object.keys(DOCUMENT_KINDS) as Array<
      keyof typeof DOCUMENT_KINDS
    >) {
      const stray = starterDesign(kind).elements.filter((el) => el.text === "Text");
      expect(stray, `${kind} has an unlabelled shape`).toEqual([]);
    }
  });

  it("reads the type out of the query string", async () => {
    renderAt("/documents/designer?type=admit-card");
    await waitFor(() => expect(screen.getByText("ADMIT CARD")).toBeInTheDocument());
  });

  it("undoes an edit without disturbing the other document types", async () => {
    renderAt("/certificate/template");

    fireEvent.pointerDown(screen.getByText("CERTIFICATE OF ACHIEVEMENT"));
    await waitFor(() => expect(textBox()).toBeTruthy());
    fireEvent.change(textBox()!, { target: { value: "Gone" } });
    expect(onCanvas("Gone")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(onCanvas("CERTIFICATE OF ACHIEVEMENT")).toBeInTheDocument();
  });
});
