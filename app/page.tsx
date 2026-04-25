import Link from "next/link";
import { Pricing } from "@/components/pricing";

const painPoints = [
  "Most stores trigger the same recovery campaign for every abandoned checkout, even though intent varies drastically.",
  "Paid retargeting budgets are wasted on low-probability carts while high-intent buyers wait too long for outreach.",
  "Teams cannot see which abandoners are most likely to convert without manually digging through Shopify events."
];

const solutionBullets = [
  "Capture checkout and order events in real time from Shopify webhooks",
  "Predict conversion probability using behavior-based feature scoring",
  "Surface a ranked queue so your team follows up with the right abandoners first",
  "Track converted outcomes to tighten future campaign targeting"
];

const faqItems = [
  {
    question: "How quickly does scoring start after setup?",
    answer:
      "As soon as you connect your Shopify Admin API token and point your checkout webhooks to this app, new abandonment events are scored immediately."
  },
  {
    question: "What kind of stores is this built for?",
    answer:
      "The workflow is optimized for Shopify stores doing at least $10k monthly revenue where retention spend and operator bandwidth both matter."
  },
  {
    question: "How do I unlock the dashboard after payment?",
    answer:
      "Complete checkout with Stripe using your work email, then open the dashboard and claim access with that same email. The app sets a secure cookie after verification."
  },
  {
    question: "Can this replace all recovery emails?",
    answer:
      "It should guide prioritization rather than replace your lifecycle stack. Use high-intent scores for immediate personalized outreach and lower-intent scores for lower-cost automation."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <nav className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 px-4 py-3 sm:px-6">
        <p className="font-[var(--font-heading)] text-lg font-semibold">Abandoned Cart Predictor</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--background-soft)] hover:text-[var(--text)]"
        >
          Open Dashboard
        </Link>
      </nav>

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,#111b28_0%,#182233_45%,#122434_100%)] px-6 py-12 sm:px-10 sm:py-16">
        <div className="absolute -right-24 top-[-80px] h-64 w-64 rounded-full bg-[rgba(46,163,255,0.2)] blur-3xl" />
        <div className="absolute -left-20 bottom-[-100px] h-64 w-64 rounded-full bg-[rgba(52,211,153,0.15)] blur-3xl" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-[var(--primary-soft)] bg-[rgba(46,163,255,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              Predict Which Cart Abandoners Will Actually Convert
            </p>
            <h1 className="font-[var(--font-heading)] text-4xl font-semibold leading-tight sm:text-5xl">
              Stop blasting every abandoner. Recover revenue from the buyers most likely to come back.
            </h1>
            <p className="mt-5 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
              Cart abandonment is above 70% for most stores. This tool scores each abandoned checkout by conversion
              likelihood so your retention team can prioritize high-intent prospects first.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[#081019] transition hover:bg-[#56b6ff]"
              >
                Start Prioritizing Carts
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--panel)]"
              >
                View Pricing
              </a>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em]">Core Outcome</p>
              <p className="mt-2 text-base font-semibold text-[var(--text)]">Higher recovery ROI per outreach dollar</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em]">Target Customer</p>
              <p className="mt-2 text-base font-semibold text-[var(--text)]">Shopify brands above $10k monthly revenue</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 sm:p-8">
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold">Why Current Recovery Workflows Break</h2>
          <ul className="mt-5 space-y-4 text-sm text-[var(--text-muted)] sm:text-base">
            {painPoints.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--danger)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 sm:p-8">
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold">What This App Changes</h2>
          <ul className="mt-5 space-y-4 text-sm text-[var(--text-muted)] sm:text-base">
            {solutionBullets.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="mt-14">
        <Pricing />
      </section>

      <section className="mt-14 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 sm:p-8">
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold">Frequently Asked Questions</h2>
        <div className="mt-6 grid gap-4">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
              <h3 className="font-semibold text-[var(--text)]">{item.question}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
