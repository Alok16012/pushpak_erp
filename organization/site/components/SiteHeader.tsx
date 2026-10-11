"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { nav, page, site, tel, type NavGroup, type NavLink } from "@/lib/site";

const isGroup = (item: NavLink | NavGroup): item is NavGroup => "items" in item;

/**
 * The bar on every page. Desktop menus open on hover or keyboard focus with
 * no script; on phones the menu is a full-height drawer with each group
 * folding open in place.
 */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The page behind an open drawer should not scroll.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled ? "border-ink-100 bg-white/90 backdrop-blur-md" : "border-transparent bg-white"
      }`}
    >
      <div className="container flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <a href={page("index")} className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.webp" alt="" width={44} height={44} className="h-11 w-11 rounded-full" />
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-extrabold text-ink-900">{site.name}</span>
            <span className="block text-[11px] font-medium text-ink-500">{site.tagline}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {nav.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 hover:text-brand-700"
                >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" />
                </button>
                <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="card p-2">
                    {item.items.map((link) => (
                      <a key={link.href} href={link.href} className="block rounded-xl px-3 py-2.5 transition hover:bg-brand-50">
                        <span className="block text-sm font-semibold text-ink-900">{link.label}</span>
                        {link.note && <span className="block text-xs text-ink-500">{link.note}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 hover:text-brand-700"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <a href={tel} className="hidden items-center gap-2 text-sm font-semibold text-ink-700 hover:text-brand-700 md:flex xl:hidden 2xl:flex">
            <Phone className="h-4 w-4" /> {site.phone}
          </a>
          <a href={page("contact")} className="btn-primary hidden !py-2.5 sm:inline-flex">
            Join Now
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink-200 text-ink-900 xl:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Phone / tablet drawer */}
      <div className={`fixed inset-0 z-50 xl:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-ink-900/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
            <span className="font-display text-lg font-extrabold">{site.name}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-full border border-ink-200"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
            {nav.map((item) =>
              isGroup(item) ? (
                <div key={item.label} className="border-b border-ink-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setSection(section === item.label ? null : item.label)}
                    className="flex w-full items-center justify-between px-2 py-3.5 text-left text-[15px] font-semibold"
                    aria-expanded={section === item.label}
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 transition ${section === item.label ? "rotate-180" : ""}`} />
                  </button>
                  {section === item.label && (
                    <div className="pb-3">
                      {item.items.map((link) => (
                        <a key={link.href} href={link.href} className="block rounded-xl px-3 py-2.5 hover:bg-brand-50">
                          <span className="block text-sm font-medium">{link.label}</span>
                          {link.note && <span className="block text-xs text-ink-500">{link.note}</span>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <a key={item.label} href={item.href} className="block border-b border-ink-100 px-2 py-3.5 text-[15px] font-semibold">
                  {item.label}
                </a>
              ),
            )}
          </nav>
          <div className="grid gap-2 border-t border-ink-100 p-4">
            <a href={page("contact")} className="btn-primary w-full">Join Now</a>
            <a href={tel} className="btn-ghost w-full"><Phone className="h-4 w-4" /> {site.phone}</a>
          </div>
        </div>
      </div>
    </header>
  );
}
