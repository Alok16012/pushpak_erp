import { page } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container max-w-xl text-center">
        <p className="font-display text-6xl font-extrabold text-brand-700">404</p>
        <h1 className="h2 mt-4">Page not found</h1>
        <p className="lead mt-3">Ye page nahi mila. Home page se dobara shuru kijiye.</p>
        <a href={page("index")} className="btn-primary mt-8">Go to Home</a>
      </div>
    </section>
  );
}
