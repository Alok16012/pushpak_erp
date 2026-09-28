import { describe, it, expect, vi } from "vitest";

// Stands in for the SDK exactly where it matters: it builds the iframe and sets
// the sandbox synchronously, the way livecodes' createPlayground does.
const created: HTMLIFrameElement[] = [];
vi.mock("livecodes", () => ({
  createPlayground: (container: HTMLElement) => {
    const frame = document.createElement("iframe");
    frame.setAttribute(
      "sandbox",
      "allow-same-origin allow-downloads allow-forms allow-modals allow-popups allow-scripts",
    );
    frame.setAttribute("title", "LiveCodes");
    container.appendChild(frame);
    created.push(frame);
    return Promise.resolve({ destroy: () => undefined });
  },
}));

const { createPortalPlayground, withoutPopups } = await import("@/lib/codeLab");

describe("withoutPopups", () => {
  it("drops allow-popups and nothing else", () => {
    expect(withoutPopups("allow-scripts allow-popups  allow-modals")).toBe("allow-scripts allow-modals");
  });

  it("leaves a list without it alone", () => {
    expect(withoutPopups("allow-scripts allow-same-origin")).toBe("allow-scripts allow-same-origin");
  });
});

describe("createPortalPlayground", () => {
  // "Edit on LiveCodes" opens a new tab on livecodes.io; with no popups the
  // frame cannot take the student out of the portal.
  it("mounts the playground in a frame that cannot open windows", async () => {
    await createPortalPlayground(document.createElement("div"), {});
    const sandbox = created[0].getAttribute("sandbox") ?? "";
    expect(sandbox.split(" ")).not.toContain("allow-popups");
    expect(sandbox.split(" ")).toEqual(expect.arrayContaining(["allow-scripts", "allow-modals"]));
    expect(created[0].getAttribute("title")).toBe("LiveCodes");
  });

  it("puts setAttribute back for every other iframe on the page", async () => {
    await createPortalPlayground(document.createElement("div"), {});
    const other = document.createElement("iframe");
    other.setAttribute("sandbox", "allow-scripts allow-popups");
    expect(other.getAttribute("sandbox")).toBe("allow-scripts allow-popups");
  });
});
