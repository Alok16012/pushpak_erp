"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { whatsappLink } from "@/lib/site";

const interests = [
  "Certified Computer Course (DCA / ADCA)",
  "Tally Prime With GST",
  "Graphic Designing",
  "Website Design / Programming",
  "Digital Marketing",
  "AI Program",
  "Spoken English",
  "Franchise",
  "Internship / Job",
  "Other",
];

/**
 * An enquiry the visitor sends on WhatsApp: the form only composes the
 * message, so nothing is stored and nothing can fail silently.
 */
export default function EnquiryForm() {
  const [form, setForm] = useState({ name: "", phone: "", interest: interests[0], message: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Apna naam likhiye.");
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10))) return setError("Sahi 10 digit mobile number likhiye.");
    setError("");
    const text = [
      "Hello, mujhe enquiry karni hai.",
      `Name: ${form.name.trim()}`,
      `Mobile: ${form.phone.trim()}`,
      `Interested in: ${form.interest}`,
      form.message.trim() && `Message: ${form.message.trim()}`,
    ].filter(Boolean).join("\n");
    window.open(whatsappLink(text), "_blank", "noopener");
  };

  const field = "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6 sm:p-8" noValidate>
      <div>
        <h2 className="font-display text-2xl font-extrabold">Send an enquiry</h2>
        <p className="mt-1 text-sm text-ink-500">Form bhariye — aapka message WhatsApp par hamare counsellor ko chala jayega.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink-700">
          Full name *
          <input className={field} value={form.name} onChange={set("name")} autoComplete="name" placeholder="Aapka naam" />
        </label>
        <label className="text-sm font-semibold text-ink-700">
          Mobile number *
          <input className={field} value={form.phone} onChange={set("phone")} type="tel" inputMode="numeric" autoComplete="tel" placeholder="10 digit number" />
        </label>
      </div>
      <label className="text-sm font-semibold text-ink-700">
        Interested in
        <select className={field} value={form.interest} onChange={set("interest")}>
          {interests.map((i) => <option key={i}>{i}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-ink-700">
        Message
        <textarea className={`${field} min-h-[110px] resize-y`} value={form.message} onChange={set("message")} placeholder="Batch timing, fees ya koi bhi sawaal…" />
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
      <button type="submit" className="btn-primary w-full sm:w-auto sm:justify-self-start">
        Send on WhatsApp <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
