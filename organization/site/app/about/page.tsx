import type { Metadata } from "next";
import { Bot, Briefcase, Code2, Compass, GraduationCap, HeartHandshake, Laptop, Lightbulb, Rocket, Store, TrendingUp, Wrench } from "lucide-react";
import { CtaBand, Feature, PageHero, SectionHeading } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `${site.fullName} — practical, career-focused computer and digital skills education in Bihar.`,
};

const roadmap = [
  { n: "01", title: "Computer Foundation", text: "Computer basics, internet, office tools और digital literacy।", icon: Laptop },
  { n: "02", title: "Digital Skills", text: "Design, web, marketing, productivity और online tools।", icon: Code2 },
  { n: "03", title: "AI Skills", text: "Prompt engineering, GenAI, automation और AI workflows।", icon: Bot },
  { n: "04", title: "Career Projects", text: "Real projects, portfolio, freelancing और career preparation।", icon: Rocket },
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title={<>Practical skills for a <span className="text-accent-400">confident career</span></>}
        lead={`${site.name} is committed to practical, career-focused education that helps students build digital skills, confidence and readiness for real-world opportunities.`}
      />

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Why Choose Us" title="Why Join Us?" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Lightbulb} title="Industry-Focused Learning" text="Practical, job-oriented skills designed around current industry requirements." />
            <Feature icon={Wrench} title="Practical Training" text="Projects, assignments and real-world activities that strengthen your skills." tone="leaf" />
            <Feature icon={TrendingUp} title="Career Development" text="Professional skills, communication and the confidence to move towards better opportunities." tone="accent" />
            <Feature icon={Compass} title="Expert Guidance" text="Continuous guidance and support from trainers throughout your learning journey." />
          </div>
        </div>
      </section>

      <section className="section bg-ink-50">
        <div className="container">
          <SectionHeading eyebrow="Learning Roadmap" title="From Beginner To AI Professional" />
          <ol className="relative mt-12 grid gap-5 md:grid-cols-4">
            {roadmap.map(({ n, title, text, icon: Icon }) => (
              <li key={n} className="card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white"><Icon className="h-6 w-6" /></span>
                  <span className="font-display text-3xl font-extrabold text-ink-200">{n}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card grid gap-10 overflow-hidden p-8 sm:p-12 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="mx-auto grid h-40 w-40 place-items-center rounded-full bg-brand-gradient p-1.5">
              <img src="/logo.webp" alt="" width={148} height={148} className="h-full w-full rounded-full bg-white" />
            </div>
            <div>
              <span className="eyebrow">Leadership Message</span>
              <blockquote className="mt-5 font-display text-xl font-bold leading-snug text-ink-900 sm:text-2xl">
                “Education is not just about getting a certificate; it is about gaining the right skills, confidence
                and mindset to create a better future.”
              </blockquote>
              <p className="mt-5 leading-relaxed text-ink-500">
                At {site.name}, our goal is to make quality digital education accessible to every learner. We believe
                practical knowledge, continuous learning and the right guidance can transform careers and lives. We
                help our students become job-ready, digitally skilled and confident enough to explore employment,
                freelancing, entrepreneurship and the growing digital economy.
              </p>
              <p className="mt-4 text-sm font-semibold text-ink-900">Founder &amp; Director, {site.name}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-ink-50">
        <div className="container">
          <SectionHeading
            eyebrow="Career Ready"
            title="Turn Your Skills Into Opportunities"
            lead="AI और computer skills का उपयोग job, freelancing, business और personal productivity में करें।"
          />
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { t: "Jobs", d: "Career-focused skills.", i: Briefcase },
              { t: "Freelancing", d: "Work from anywhere.", i: GraduationCap },
              { t: "Business", d: "Build digital businesses.", i: Store },
              { t: "Startups", d: "Build technology products.", i: Rocket },
            ].map(({ t, d, i: Icon }) => (
              <div key={t} className="card p-5 text-center sm:p-6">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-leaf-50 text-leaf-700"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-ink-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <Feature icon={GraduationCap} title="Quality Education" text="Practical learning for everyone." />
            <Feature icon={TrendingUp} title="Career Growth" text="Skills for a better future." tone="leaf" />
            <Feature icon={HeartHandshake} title="Student Support" text="Guidance at every step." tone="accent" />
          </div>
        </div>
      </section>

      <div className="pt-16 sm:pt-20 lg:pt-24" />
      <CtaBand title="Ready to start learning?" text="Hamare counsellor se baat kijiye aur apne goal ke hisaab se sahi course choose kijiye." />
    </>
  );
}
