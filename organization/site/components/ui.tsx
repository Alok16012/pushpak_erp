import { ArrowRight, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { discount, rupees, type Course } from "@/lib/courses";
import { page, whatsappLink } from "@/lib/site";

/** A section's eyebrow, heading and lead, centred or left-aligned. */
export function SectionHeading({
  eyebrow, title, lead, center = true,
}: { eyebrow?: string; title: React.ReactNode; lead?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="h2 mt-4">{title}</h2>
      {lead && <p className="lead mt-4">{lead}</p>}
    </div>
  );
}

/** An icon, a title and a line or two — the building block of most grids. */
export function Feature({ icon: Icon, title, text, tone = "brand" }: { icon: LucideIcon; title: string; text: string; tone?: "brand" | "leaf" | "accent" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    leaf: "bg-leaf-50 text-leaf-700",
    accent: "bg-amber-50 text-accent-600",
  };
  return (
    <div className="card h-full p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}

export function CourseCard({ course }: { course: Course }) {
  const off = discount(course);
  const href = course.href ?? whatsappLink(`Hello, mujhe ${course.title} course ke baare mein jaankari chahiye.`);
  return (
    <article className="card group flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        <img src={course.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-brand-700 shadow">{course.category}</span>
        {off > 0 && <span className="absolute right-3 top-3 rounded-full bg-accent-400 px-2.5 py-1 text-xs font-bold text-ink-900">{off}% OFF</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-xs font-medium text-ink-500">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.duration}</span>
          <span className="h-1 w-1 rounded-full bg-ink-200" />
          <span>{course.level}</span>
        </div>
        <h3 className="mt-2 text-lg font-bold text-ink-900">{course.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {course.tags.map((t) => (
            <span key={t} className="rounded-md bg-ink-50 px-2 py-1 text-[11px] font-medium text-ink-700">{t}</span>
          ))}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink-100 pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Course Fee</p>
            <p className="font-display text-xl font-extrabold text-ink-900">
              {rupees(course.fee)}
              {course.mrp && <span className="ml-2 text-sm font-medium text-ink-400 line-through">{rupees(course.mrp)}</span>}
            </p>
          </div>
          <a
            href={href}
            {...(course.href ? {} : { target: "_blank", rel: "noopener" })}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white"
          >
            {course.href ? "Details" : "Enquire"} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

/** The closing call to action most pages end on. */
export function CtaBand({ title, text }: { title: string; text: string }) {
  return (
    <section className="section pt-0">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-leaf-400/20 blur-2xl" />
          <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
              <p className="mt-3 text-white/80">{text}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a href={page("contact")} className="btn-accent">Talk To Counsellor <ArrowRight className="h-4 w-4" /></a>
              <a href={page("computer-course")} className="btn-light">Explore Courses</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The coloured banner at the top of inner pages. */
export function PageHero({ eyebrow, title, lead, children }: { eyebrow: string; title: React.ReactNode; lead: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-brand-950 text-white">
      <div className="absolute inset-0 bg-brand-gradient opacity-90" />
      <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-leaf-400/25 blur-3xl" />
      <div className="container relative py-14 sm:py-20">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">{eyebrow}</span>
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">{lead}</p>
        {children}
      </div>
    </section>
  );
}
