import { describe, it, expect } from "vitest";

import { canAccess, canAccessWithRole, menuFor, modulesForView } from "@/lib/navigation";

/**
 * Roles used to decide one thing only: which of the three views a person got.
 * An accountant, a receptionist and a teacher were therefore handed the same
 * branch menu, and choosing between them at Add User changed nothing at all.
 *
 * A role now carries the pages it may open. What this file pins down is the
 * boundary: the list narrows a view, it can never widen one, and a role with
 * no list of its own behaves exactly as every account did before.
 */
describe("a role's own menu", () => {
  it("gives the whole view to a role that was never narrowed", () => {
    // Every account had no list until an administrator made one, and none of
    // them should have lost a page the day roles arrived.
    expect(canAccessWithRole("franchise", "/student/view", [])).toBe(true);
    expect(canAccessWithRole("franchise", "/fee/collection", null)).toBe(true);
    expect(menuFor("franchise", []).length).toBe(menuFor("franchise", null).length);
  });

  it("opens only what it was granted, once it has been narrowed", () => {
    const accounts = ["/fee/collection", "/fee/due-collection"];
    expect(canAccessWithRole("franchise", "/fee/collection", accounts)).toBe(true);
    expect(canAccessWithRole("franchise", "/student/view", accounts)).toBe(false);
  });

  it("cannot be granted a page its view was never authorised for", () => {
    // The ceiling is the view, which is the line the database keeps too: a
    // branch role handed an organisation page would be refused the data anyway.
    expect(canAccess("franchise", "/branch/create")).toBe(false);
    expect(canAccessWithRole("franchise", "/branch/create", ["/branch/create"])).toBe(false);
    expect(canAccessWithRole("student", "/user/all", ["/user/all"])).toBe(false);
  });

  it("keeps the landing page, so a narrowed role is not locked out of its own home", () => {
    expect(canAccessWithRole("franchise", "/", ["/fee/collection"])).toBe(true);
  });

  it("refuses a menu page that was not ticked, even to someone who knows the URL", () => {
    expect(canAccessWithRole("admin", "/student/view", ["/fee/collection"])).toBe(false);
  });

  it("carries the paths no picker can offer along with their own section", () => {
    // `/student/add` is what the New admission button opens; it is on no menu,
    // so granting the student pages has to carry it or the button dead-ends.
    expect(canAccessWithRole("admin", "/student/add", ["/student/view"])).toBe(true);
    expect(canAccessWithRole("admin", "/student/add", ["/fee/collection"])).toBe(false);
  });

  it("drops a group whose every page was withheld, rather than leaving it empty", () => {
    const menu = menuFor("franchise", ["/fee/collection"]);
    expect(menu).toHaveLength(1);
    expect(menu[0].items.map((item) => item.url)).toEqual(["/fee/collection"]);
  });
});

describe("the pages an administrator can tick", () => {
  it("offers a view's real menu, grouped as the sidebar groups it", () => {
    const groups = modulesForView("franchise");
    expect(groups.length).toBeGreaterThan(0);
    const urls = groups.flatMap((group) => group.items.map((item) => item.url));
    // Only pages that view can actually open are offered.
    expect(urls.every((url) => canAccess("franchise", url))).toBe(true);
    expect(urls).toContain("/fee/collection");
    expect(urls).not.toContain("/branch/create");
  });
});
