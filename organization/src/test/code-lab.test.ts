import { describe, it, expect } from "vitest";

import { LAB_LANGUAGES, codeFingerprint, isLabLanguage, readSavedConfig, starterConfig } from "@/lib/codeLab";
import { canAccess } from "@/lib/navigation";

describe("Code Lab starters", () => {
  // A first Run should show output, not a blank pane.
  it("opens every language with a program already in it", () => {
    for (const { id } of LAB_LANGUAGES) {
      const config = starterConfig(id);
      const content = [config.markup?.content, config.script?.content].filter(Boolean).join("");
      expect(content.length, `${id} has no starter`).toBeGreaterThan(20);
    }
  });

  it("runs Python as real CPython and C with a real compiler", () => {
    expect(starterConfig("python").script?.language).toBe("pyodide");
    expect(starterConfig("c").script?.language).toBe("cpp-wasm");
  });

  it("opens the console for languages that print, and not for a web page", () => {
    expect(starterConfig("python").tools?.status).toBe("open");
    expect(starterConfig("web").tools?.status).toBe("closed");
  });

  it("carries the title given", () => {
    expect(starterConfig("sql", "Joins").title).toBe("Joins");
  });
});

describe("readSavedConfig", () => {
  it("reads a saved project back", () => {
    const saved = JSON.stringify({ title: "Mine", script: { language: "pyodide", content: "print(1)" } });
    const { config, readable } = readSavedConfig(saved, "python");
    expect(readable).toBe(true);
    expect(config.script?.content).toBe("print(1)");
  });

  // A hand-edited row or a cut-off save must not fail the page.
  it("opens the starter, and says so, when the body cannot be read", () => {
    const { config, readable } = readSavedConfig("{not json", "python");
    expect(readable).toBe(false);
    expect(config.script?.language).toBe("pyodide");
  });
});

describe("codeFingerprint", () => {
  const code = (script: string) => ({
    markup: { language: "html" as const, content: "", compiled: "" },
    style: { language: "css" as const, content: "", compiled: "" },
    script: { language: "javascript" as const, content: script, compiled: "" },
  });

  it("is the same for the same code and differs on any edit", () => {
    expect(codeFingerprint(code("a"))).toBe(codeFingerprint(code("a")));
    expect(codeFingerprint(code("a"))).not.toBe(codeFingerprint(code("a ")));
  });

  // Editor boundaries matter: moving text between tabs is a change.
  it("does not confuse text moved from one editor to another", () => {
    const a = { ...code("x"), markup: { language: "html" as const, content: "ab", compiled: "" } };
    const b = { ...code("bx"), markup: { language: "html" as const, content: "a", compiled: "" } };
    expect(codeFingerprint(a)).not.toBe(codeFingerprint(b));
  });
});

describe("isLabLanguage", () => {
  it("accepts the lab's own ids only", () => {
    expect(isLabLanguage("python")).toBe(true);
    expect(isLabLanguage("cobol")).toBe(false);
  });
});

describe("who can open the tools", () => {
  it("is every view: the teacher, the branch and the student", () => {
    for (const path of ["/tools/code-lab", "/tools/whiteboard"]) {
      expect(canAccess("admin", path)).toBe(true);
      expect(canAccess("franchise", path)).toBe(true);
      expect(canAccess("student", path)).toBe(true);
    }
  });
});
