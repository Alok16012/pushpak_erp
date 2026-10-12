import {
  ArrowRight, Award, BookOpen, Bot, Briefcase, CheckCircle2, Code2, FolderKanban, GraduationCap, Laptop,
  Rocket, Sparkles, Store, Users, UserRound, Wifi,
} from "lucide-react";
import { CourseCard, CtaBand, Feature, SectionHeading } from "@/components/ui";
import { popularCourses } from "@/lib/courses";
import { page, site, whatsappLink } from "@/lib/site";

const journey = [
  { n: "01", title: "Foundation", text: "Computer basics, internet, MS Office और digital literacy.", icon: Laptop },
  { n: "02", title: "Digital Skills", text: "Web, design, marketing, coding और productivity.", icon: Code2 },
  { n: "03", title: "AI Skills", text: "Prompt engineering, AI tools और automation.", icon: Bot },
  { n: "04", title: "Career Ready", text: "Portfolio, projects, freelancing और career skills.", icon: Rocket },
];

const audiences = [
  { title: "Students", text: "Academic + career skills", icon: GraduationCap },
  { title: "Job Seekers", text: "Job-ready digital skills", icon: Briefcase },
  { title: "Business Owners", text: "Digital business skills", icon: Store },
  { title: "Freelancers", text: "Online earning skills", icon: UserRound },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#f4f7fc]">
        <picture className="absolute inset-0 -z-20">
          <source media="(min-width: 768px)" srcSet="/image/hero-digital-skills-wide-v2.webp" />
          <img
            src="/image/hero-digital-skills-v1-mobile.webp"
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            fetchPriority="high"
            loading="eager"
            className="h-full w-full object-contain object-bottom md:object-cover md:object-center"
          />
        </picture>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#f4f7fc_0%,#f4f7fc_65%,transparent_85%)] md:bg-[linear-gradient(90deg,rgba(244,247,252,0.98)_0%,rgba(244,247,252,0.94)_30%,rgba(244,247,252,0.4)_52%,transparent_72%)]" />
        <div className="container relative flex min-h-[calc(100svh-64px)] items-start pb-80 pt-12 sm:pt-16 md:min-h-[calc(100svh-72px)] md:items-center md:py-20">
          <div className="w-full md:max-w-[52%] lg:max-w-[48%]">
            <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Admissions open — {new Date().getFullYear()}</span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
              Computer Se{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">Career Tak</span>
            </h1>
            <p className="lead mt-5 max-w-xl">
              We develop your digital skills — practical computer, accounting, design, coding, digital marketing
              aur AI courses jo aapko job, freelancing aur business ke liye ready banate hain.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={page("computer-course")} className="btn-primary">Explore Courses <ArrowRight className="h-4 w-4" /></a>
              <a href={whatsappLink("Hello, mujhe admission ke baare mein jaankari chahiye.")} target="_blank" rel="noopener" className="btn-ghost">
                Talk To Counsellor
              </a>
            </div>
            <ul className="mt-8 grid max-w-lg grid-cols-2 gap-3 text-sm font-medium text-ink-700">
              {["Expert Training", "Practical Projects", "AI Tools", "Career Focus"].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-leaf-600" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Learning Path" title="Your Journey From Beginner To Professional" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map(({ n, title, text, icon: Icon }) => (
              <div key={n} className="card relative p-6">
                <span className="absolute right-5 top-4 font-display text-4xl font-extrabold text-ink-100">{n}</span>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="section bg-ink-50">
        <div className="container">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              center={false}
              eyebrow="Our Courses"
              title="Popular Courses"
              lead="Practical computer courses, professional skills aur career-focused training ke saath apna future banaiye."
            />
            <a href={page("computer-course")} className="btn-ghost shrink-0">View All Courses <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popularCourses.map((c) => <CourseCard key={c.title} course={c} />)}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              center={false}
              eyebrow={`Why ${site.fullName}?`}
              title="Sirf Certificate Nahi, Skill Seekhiye"
              lead="Hamara focus practical computer education par hai. Hum students ko concepts ke saath hands-on practice aur project-based learning provide karte hain."
            />
            <a href={page("about")} className="btn-primary mt-8">About Us <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Feature icon={Laptop} title="Practical Computer Lab" text="Practice-oriented computer learning environment." />
            <Feature icon={Users} title="Guided Learning" text="Instructor guidance during your learning journey." tone="leaf" />
            <Feature icon={FolderKanban} title="Project-Based Practice" text="Work on practical assignments and real-world projects." tone="accent" />
            <Feature icon={Award} title="Course Certificate" text="Certificate on successful course completion." />
          </div>
        </div>
      </section>

      {/* Who can join + modes */}
      <section className="section bg-ink-50">
        <div className="container">
          <SectionHeading
            eyebrow="Who Can Join?"
            title="Courses For Everyone"
            lead="Aap student hain, job seeker hain, business karte hain ya freelancing career start karna chahte hain — apne goal ke according course choose kijiye."
          />
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {audiences.map(({ title, text, icon: Icon }) => (
              <div key={title} className="card p-5 text-center sm:p-6">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink-500">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <Feature icon={BookOpen} title="Classroom Training" text="Instructor-led practical classes in our computer lab." />
            <Feature icon={Wifi} title="Online Learning" text="Flexible digital learning that fits your schedule." tone="leaf" />
            <Feature icon={FolderKanban} title="Project Practice" text="Hands-on assignments and real projects for your portfolio." tone="accent" />
          </div>
        </div>
      </section>

      {/* Mission & vision */}
      <section className="section">
        <div className="container grid gap-6 lg:grid-cols-2">
          <div className="card p-8">
            <span className="eyebrow">Our Mission</span>
            <p className="mt-5 leading-relaxed text-ink-700">
              {site.fullName} का उद्देश्य युवाओं को practical digital education, AI tools और career-oriented technology
              skills के माध्यम से सक्षम बनाना है। हम students को सिर्फ job seeker नहीं, बल्कि freelancer, professional
              और entrepreneur बनने के लिए तैयार करते हैं।
            </p>
          </div>
          <div className="card p-8">
            <span className="eyebrow !bg-leaf-50 !text-leaf-700">Our Vision</span>
            <p className="mt-5 leading-relaxed text-ink-700">
              हमारा vision है कि हर युवा digital literacy और future-ready skills के साथ अपने career और business का
              निर्माण कर सके। हम technology को accessible और practical बनाकर रोजगार और self-employment के अवसर बढ़ाने पर
              focus करते हैं।
            </p>
          </div>
        </div>
      </section>

      <CtaBand
        title="Aapko Kaunsa Course Karna Chahiye?"
        text="Computer, Accounting, Designing, Marketing ya Programming — confused hain? Hum aapko sahi learning path choose karne mein guide karenge."
      />
    </>
  );
}
