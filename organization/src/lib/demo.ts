/* eslint-disable @typescript-eslint/no-explicit-any -- the fixtures are opaque API
   snapshots; each consumer applies its own response type at the api() call site. */
// Read-only demo mode. When enabled the API layer resolves against a committed
// snapshot of the seeded dataset instead of the network, so the deployed build is
// explorable without a backend. Writes are applied to an in-memory copy: they show
// up for the rest of the session and disappear on reload.
const FLAG = "erp-demo-mode";

export const demoUser = { id: "demo-admin", name: "Demo Administrator", email: "demo@idealdigiskills.com", role: "ORGANIZATION_ADMIN", organizationId: "demo-org", branchId: "demo-branch" };

export const isDemoMode = () => localStorage.getItem(FLAG) === "1";
export const enableDemoMode = () => localStorage.setItem(FLAG, "1");
export const disableDemoMode = () => { localStorage.removeItem(FLAG); collections = null; documents = null; };

let collections: Record<string, any> | null = null;
let documents: Record<string, any> | null = null;

async function dataset() {
  if (!collections || !documents) {
    const module = await import("./demo-data");
    collections = structuredClone(module.demoCollections) as Record<string, any>;
    documents = module.demoDocuments as Record<string, any>;
  }
  return { collections, documents };
}

const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const named = (body: any) => `${body.firstName || body.visitorName || body.name || "Demo record"}`;

export async function demoRequest<T>(rawPath: string, options: RequestInit = {}): Promise<T> {
  const path = rawPath.split("?")[0];
  const method = (options.method || "GET").toUpperCase();
  const body = typeof options.body === "string" ? JSON.parse(options.body) : {};
  const { collections, documents } = await dataset();
  await new Promise(resolve => setTimeout(resolve, 120)); // keep loading states visible

  if (path === "/auth/logout") return undefined as T;

  const document = path.match(/^\/core\/documents\/students\/(.+)$/);
  if (document) {
    const record = documents[document[1]];
    if (!record) throw new Error("This student has no demo document record");
    return record as T;
  }

  const payment = path.match(/^\/core\/fees\/invoices\/(.+)\/payments$/);
  if (payment) {
    const invoice = collections["/core/fees/invoices"].find((i: any) => i.id === payment[1]);
    if (!invoice) throw new Error("Invoice not found");
    const receipt = { id: id("pay"), receiptNo: `DEMO-RCT-${Date.now().toString().slice(-6)}`, amount: body.amount, method: body.method, paidAt: new Date().toISOString(), reversedAt: null };
    invoice.payments.push(receipt);
    const paid = invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    invoice.status = paid >= Number(invoice.amount) ? "PAID" : "PARTIAL";
    return receipt as T;
  }

  if (method === "GET") {
    const data = collections[path];
    if (data === undefined) throw new Error(`${path} is not available in demo mode`);
    return data as T;
  }

  // Writes: append to the in-memory collection so the change is visible immediately.
  if (path === "/core/attendance" || path.endsWith("/results")) return (body.records || body.results || []) as T;
  const collection = collections[path];
  if (Array.isArray(collection)) {
    const record = { id: id("demo"), createdAt: new Date().toISOString(), ...body, name: body.name || named(body) };
    collection.unshift(record);
    return record as T;
  }
  return { id: id("demo"), ...body } as T;
}
