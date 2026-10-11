import type { Metadata } from "next";
import {
  ArrowRight, Award, BarChart3, Calculator, Check, ChevronDown, Clock, FileSpreadsheet, Landmark, Layers,
  MonitorCheck, Package, Receipt, Signal, Wallet,
} from "lucide-react";
import { CtaBand, Feature, SectionHeading } from "@/components/ui";
import { rupees } from "@/lib/courses";
import { page, site, whatsappLink } from "@/lib/site";
import { modules } from "./syllabus";

export const metadata: Metadata = {
  title: "Tally Prime With GST Course",
  description:
    "Learn Tally Prime from basic to professional level — accounting, GST, inventory, payroll, banking and reports with practical training and certificate.",
};

const fee = 3499;
const mrp = 6500;
const enrol = whatsappLink("Hello, mujhe Tally Prime With GST course mein admission lena hai.");

const facts = [
  { label: "Duration", value: "3 Months", icon: Clock },
  { label: "Level", value: "Basic → Advanced", icon: Signal },
  { label: "Mode", value: "Practical", icon: MonitorCheck },
  { label: "Modules", value: "12", icon: Layers },
  { label: "Certificate", value: "Yes", icon: Award },
];

export default function TallyPrime() {
  return (
    <>
      {/* Hero with the fee card */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0 bg-brand-gradient opacity-90" />
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-leaf-400/25 blur-3xl" />
        <div className="container relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <nav className="text-sm text-white/70" aria-label="Breadcrumb">
              <a href={page("index")} className="hover:text-white">Home</a> <span className="mx-1.5">/</span>
              <a href={page("computer-course")} className="hover:text-white">Computer Courses</a> <span className="mx-1.5">/</span>
              <span className="text-white">Tally Prime</span>
            </nav>
            <span className="mt-5 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              Accounting • GST • Practical Training
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Tally Prime With GST</h1>
            <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
              Learn Tally Prime from basic to professional level with practical training in accounting, company
              creation, ledgers, vouchers, inventory, GST, taxation, payroll, banking and financial reports.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Accounting", "GST", "Inventory", "Payroll", "Certificate"].map((t) => (
                <span key={t} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm">{t}</span>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl bg-white p-6 text-ink-900 shadow-2xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-leaf-700">Special Admission Offer</p>
            <p className="mt-2 font-display text-4xl font-extrabold">
              {rupees(fee)} <span className="text-lg font-medium text-ink-400 line-through">{rupees(mrp)}</span>
            </p>
            <ul className="mt-6 divide-y divide-ink-100 text-sm">
              {facts.map(({ label, value, icon: Icon }) => (
                <li key={label} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-ink-500"><Icon className="h-4 w-4" />{label}</span>
                  <span className="font-semibold">{value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-2">
              <a href={enrol} target="_blank" rel="noopener" className="btn-primary w-full">Enroll Now <ArrowRight className="h-4 w-4" /></a>
              <a href="#syllabus" className="btn-ghost w-full">View Full Syllabus</a>
            </div>
          </aside>
        </div>
      </section>

      {/* Overview */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Course Overview"
            title="Complete Tally Prime Course"
            lead="Designed for students, job seekers, business owners and accounting professionals who want practical knowledge of computerised accounting — through practical assignments and business examples."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Calculator} title="Accounting" text="Journal, ledger, vouchers, trial balance and final accounts." />
            <Feature icon={Receipt} title="GST" text="GST setup, purchase, sales, tax calculations and reports." tone="leaf" />
            <Feature icon={Package} title="Inventory" text="Stock groups, items, units, godowns and inventory reports." tone="accent" />
            <Feature icon={Wallet} title="Payroll" text="Employee records, attendance, salary and payroll reports." />
          </div>
        </div>
      </section>

      {/* Syllabus */}
      <section id="syllabus" className="section scroll-mt-20 bg-ink-50">
        <div className="container max-w-4xl">
          <SectionHeading eyebrow="Course Content" title="Tally Prime Syllabus" lead="12 modules • detailed practical training" />
          <div className="mt-10 grid gap-3">
            {modules.map((m, i) => (
              <details key={m.title} className="card group overflow-hidden" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 font-display font-extrabold text-brand-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink-900">{m.title}</span>
                    <span className="block text-sm text-ink-500">{m.note} · {m.topics.length} topics</span>
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-ink-400 transition group-open:rotate-180" />
                </summary>
                <ul className="grid gap-x-6 gap-y-2 border-t border-ink-100 px-5 py-5 text-sm text-ink-700 sm:grid-cols-2">
                  {m.topics.map((t) => (
                    <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />{t}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes & careers */}
      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Course Outcome" title="What You Will Be Able To Do" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={FileSpreadsheet} title="Maintain Accounts" text="Record daily accounting transactions and maintain ledgers." />
            <Feature icon={Receipt} title="Handle GST Accounting" text="Record GST transactions and generate relevant reports." tone="leaf" />
            <Feature icon={Package} title="Manage Inventory" text="Manage stock items, purchases, sales and inventory reports." tone="accent" />
            <Feature icon={BarChart3} title="Generate Reports" text="Financial, GST, inventory and outstanding reports." />
          </div>

          <div className="mt-20">
            <SectionHeading
              eyebrow="Career Opportunities"
              title="Career Options After Tally Prime"
              lead="Tally Prime skills support accounting, office administration, billing and business operations roles."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Feature icon={Receipt} title="Accounts Assistant" text="Maintain ledgers, vouchers, accounts and reports." />
              <Feature icon={MonitorCheck} title="Computer Operator" text="Handle accounting software, data and office records." tone="leaf" />
              <Feature icon={Wallet} title="Billing Executive" text="Prepare sales invoices, purchase entries and billing records." tone="accent" />
              <Feature icon={Landmark} title="GST / Accounts Executive" text="Work with GST accounting, reports and business records." />
            </div>
          </div>
        </div>
      </section>

      {/* Certificate */}
      <section className="section pt-0">
        <div className="container">
          <div className="card grid gap-6 p-8 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-accent-600"><Award className="h-8 w-8" /></span>
            <div>
              <h2 className="font-display text-xl font-extrabold sm:text-2xl">{site.name} Tally Prime Certificate</h2>
              <p className="mt-2 text-ink-500">
                After the required training, practical assignments and assessment, students receive a {site.name} course
                completion certificate.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
                {["Accounting Practical", "GST Practical", "Final Project", "Skill Assessment"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5 rounded-full bg-leaf-50 px-3 py-1 text-leaf-700"><Check className="h-4 w-4" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CtaBand title="Start Your Accounting Career" text={`Tally Prime With GST — ${rupees(fee)} special admission offer. Seats limited, aaj hi enquiry kijiye.`} />
    </>
  );
}
