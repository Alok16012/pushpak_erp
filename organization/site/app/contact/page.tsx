import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import EnquiryForm from "@/components/EnquiryForm";
import { PageHero } from "@/components/ui";
import { site, tel, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Contact ${site.fullName} for admissions, courses, franchise and internships.`,
};

export default function Contact() {
  const ways = [
    { icon: Phone, title: "Call Us", value: site.phone, href: tel },
    { icon: MessageCircle, title: "WhatsApp", value: "Chat with a counsellor", href: whatsappLink("Hello, mujhe jaankari chahiye."), external: true },
    { icon: Mail, title: "Email Us", value: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, title: "Visit Us", value: site.address },
    { icon: Clock, title: "Office Hours", value: site.hours },
  ];
  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="We Are Here To Help"
        lead="Admission, course selection, fees, franchise ya internship — koi bhi sawaal ho, humse baat kijiye."
      />
      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
          <div className="grid content-start gap-4">
            {ways.map(({ icon: Icon, title, value, href, external }) => {
              const body = (
                <>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-ink-400">{title}</span>
                    <span className="block break-words font-semibold text-ink-900">{value}</span>
                  </span>
                </>
              );
              return href ? (
                <a key={title} href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                  {body}
                </a>
              ) : (
                <div key={title} className="card flex items-center gap-4 p-5">{body}</div>
              );
            })}
          </div>
          <EnquiryForm />
        </div>
      </section>
    </>
  );
}
