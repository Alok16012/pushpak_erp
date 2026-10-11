import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { page, site, tel } from "@/lib/site";

const quick = [
  ["Home", page("index")],
  ["About Us", page("about")],
  ["Computer Courses", page("computer-course")],
  ["Franchise", page("franchise")],
  ["Career", page("carrer")],
  ["Contact", page("contact")],
];

const popular = [
  ["ADCA", page("computer-course")],
  ["Tally Prime With GST", page("tally-prime")],
  ["Graphic Designing", page("graphics")],
  ["Digital Marketing", page("digital-marketing")],
  ["Website Design", page("html")],
  ["Python Programming", page("python")],
];

export default function SiteFooter() {
  return (
    <footer className="bg-ink-900 text-ink-200">
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="" width={48} height={48} className="h-12 w-12 rounded-full bg-white" />
            <div>
              <p className="font-display text-lg font-extrabold text-white">{site.name}</p>
              <p className="text-xs text-ink-400">{site.tagline}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            Computer education aur professional digital skills ke through students ko career-ready banana.
          </p>
        </div>
        <FooterList title="Quick Links" links={quick} />
        <FooterList title="Popular Courses" links={popular} />
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-leaf-400" />{site.address}</li>
            <li><a href={tel} className="flex gap-3 hover:text-white"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-leaf-400" />{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`} className="flex gap-3 break-all hover:text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-leaf-400" />{site.email}</a></li>
            <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-leaf-400" />{site.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 py-5 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.fullName}. All rights reserved.</p>
          <p>Designed by Er. Pushpak Kumar</p>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([label, href]) => (
          <li key={label}><a href={href} className="hover:text-white">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}
