import Link from "next/link";
import PricingTable from "@/components/PricingTable";

export default function LandingPage() {
  return (
    <div>
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="font-serif text-xl font-semibold">SAC CRM</span>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <a href="#pricing" className="text-ink/70 hover:text-ink">Pricing</a>
          <Link href="/login" className="text-ink/70 hover:text-ink">Log in</Link>
          <Link href="/signup" className="bg-brass hover:bg-brassdark text-white px-4 py-2 rounded-md font-semibold">
            Start free trial
          </Link>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-20">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight mb-5">
          Turn WhatsApp &amp; social leads into booked units — automatically.
        </h1>
        <p className="text-ink/60 text-lg mb-8 max-w-2xl mx-auto">
          SAC CRM captures leads from Facebook, Instagram and WhatsApp, scores them with AI,
          drafts your follow-ups, and runs drip campaigns — all in one pipeline your team
          actually uses.
        </p>
        <Link href="/signup" className="inline-block bg-brass hover:bg-brassdark text-white px-6 py-3 rounded-md font-semibold">
          Start your 14-day free trial
        </Link>
      </section>

      <section id="pricing" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="font-serif text-2xl font-semibold text-center mb-10">Simple, per-agency pricing</h2>
        <PricingTable />
      </section>

      <footer className="border-t border-line py-8 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} SAC CRM. All rights reserved.
      </footer>
    </div>
  );
}
