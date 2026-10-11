import type { Metadata } from "next";
import { ArrowRight, Briefcase } from "lucide-react";
import { CourseCard, CtaBand, PageHero, SectionHeading } from "@/components/ui";
import { computerCourses, courseFamilies } from "@/lib/courses";
import { page, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Certified Computer Courses",
  description: `DCA, ADCA, Tally Prime, typing, data entry and office courses at ${site.fullName}.`,
};

export default function ComputerCourses() {
  return (
    <>
      <PageHero
        eyebrow="Certified Computer Courses"
        title="Our Computer Courses"
        lead="Computer fundamentals, office productivity, accounting aur data entry — practical training aur course certificate ke saath."
      />

      <section className="section">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {computerCourses.map((c) => <CourseCard key={c.title} course={c} />)}
          </div>
        </div>
      </section>

      <section className="section bg-ink-50">
        <div className="container">
          <SectionHeading eyebrow="More Programs" title="Explore Other Courses" lead="Design, coding, marketing, AI aur communication — har goal ke liye ek course." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courseFamilies.map((f) => (
              <a key={f.title} href={f.href} className="card group flex items-center justify-between gap-3 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                <span>
                  <span className="block font-bold text-ink-900">{f.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-500">{f.note}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-ink-400 transition group-hover:translate-x-1 group-hover:text-brand-700" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card flex flex-col items-start gap-6 p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-leaf-50 text-leaf-700"><Briefcase className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-xl font-extrabold sm:text-2xl">Hire for Any Job Role</h2>
                <p className="mt-1 text-ink-500">Data entry operators, accounting experts, telecallers aur counsellors — trained candidates hire kijiye.</p>
              </div>
            </div>
            <a href={page("contact")} className="btn-primary shrink-0">Hire Now <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <CtaBand title="Kaunsa course aapke liye sahi hai?" text="Apna goal batayiye — hum aapko sahi course aur batch choose karne mein madad karenge." />
    </>
  );
}
