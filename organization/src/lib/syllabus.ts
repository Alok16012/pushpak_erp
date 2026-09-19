/**
 * Reading a course's syllabus.
 *
 * Modules are the sections of a course and chapters are what is taught inside
 * one, so the screen always wants them nested and in teaching order — never as
 * the two flat lists the database hands back.
 */
import type { SyllabusChapter, SyllabusModule } from "@/lib/supabase/data";

export interface SyllabusSection {
  module: SyllabusModule;
  chapters: SyllabusChapter[];
}

/** Order written, then name: two sections given the same number still sort. */
const byOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export function buildSyllabus(
  modules: SyllabusModule[],
  chapters: SyllabusChapter[],
): SyllabusSection[] {
  const byModule = new Map<string, SyllabusChapter[]>();
  for (const chapter of chapters) {
    const list = byModule.get(chapter.moduleId);
    if (list) list.push(chapter);
    else byModule.set(chapter.moduleId, [chapter]);
  }
  return [...modules].sort(byOrder).map((module) => ({
    module,
    chapters: (byModule.get(module.id) ?? []).slice().sort(byOrder),
  }));
}

/**
 * Narrow a syllabus by a search and a status.
 *
 * A module whose own name matches is kept whole, because searching for a
 * section means wanting to see what is in it. A module kept only for its
 * chapters shows just the chapters that matched.
 */
export function filterSyllabus(
  sections: SyllabusSection[],
  options: { search?: string; status?: "All" | "Active" | "Inactive" } = {},
): SyllabusSection[] {
  const q = (options.search ?? "").trim().toLowerCase();
  const status = options.status ?? "All";

  return sections
    .map((section) => {
      const moduleMatches =
        !q ||
        `${section.module.name} ${section.module.description}`.toLowerCase().includes(q);

      const chapters = section.chapters.filter((chapter) => {
        if (status !== "All" && chapter.status !== status) return false;
        if (!q || moduleMatches) return true;
        return `${chapter.name} ${chapter.description} ${chapter.practical}`
          .toLowerCase()
          .includes(q);
      });

      return { section, chapters, moduleMatches };
    })
    .filter(({ chapters, moduleMatches, section }) => {
      if (status !== "All" && section.module.status !== status && !chapters.length) return false;
      return moduleMatches || chapters.length > 0;
    })
    .map(({ section, chapters }) => ({ module: section.module, chapters }));
}

/** The next number to put on a new module or chapter in a list. */
export const nextOrder = (items: Array<{ sortOrder: number }>) =>
  items.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 1;

/** How much of the syllabus carries notes or a video. */
export const studyLinkCount = (chapters: SyllabusChapter[]) =>
  chapters.filter((chapter) => chapter.pdfUrl || chapter.videoUrl).length;

/** Why a module or chapter cannot be saved, or null when it can. */
export function syllabusProblem(draft: { name: string; sortOrder: number }): string | null {
  if (!draft.name.trim()) return "Give it a name.";
  if (!Number.isFinite(draft.sortOrder) || draft.sortOrder < 1) {
    return "The order has to be 1 or more.";
  }
  return null;
}

/**
 * A link is only offered when it is one.
 *
 * A half-typed address renders as a link that navigates nowhere, and a
 * `javascript:` one is worse than useless on a page that prints what a branch
 * typed in.
 */
export function safeUrl(value: string): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
