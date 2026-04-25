import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const planFeatures = [
  "Abandoned checkout scoring with intent bands",
  "Prioritized daily queue for retention outreach",
  "Shopify webhook ingestion and event history",
  "Conversion outcome tracking to improve targeting",
  "One-click paywall unlock after successful payment"
];

export function Pricing() {
  return (
    <Card className="border-[var(--primary-soft)] bg-[linear-gradient(145deg,#101a26_0%,#151f2a_55%,#182534_100%)]">
      <CardHeader>
        <p className="inline-flex w-fit rounded-full border border-[var(--primary-soft)] bg-[rgba(46,163,255,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          Pricing
        </p>
        <CardTitle>Predictive Recovery Plan</CardTitle>
        <CardDescription>
          Built for Shopify operators above $10k MRR who want to stop sending expensive blanket win-back flows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="font-[var(--font-heading)] text-4xl font-semibold">$19</p>
          <p className="text-sm text-[var(--text-muted)]">per month, per store</p>
        </div>

        <ul className="space-y-2 text-sm text-[var(--text-muted)]">
          {planFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <a
          href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[#081019] transition hover:bg-[#56b6ff]"
        >
          Buy Now With Stripe Checkout
        </a>
      </CardContent>
    </Card>
  );
}
