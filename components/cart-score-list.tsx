import type { ScoredCartSummary } from "@/lib/database";

interface CartScoreListProps {
  carts: ScoredCartSummary[];
  shopDomain: string;
}

function formatConfidence(score: number) {
  return `${Math.round(score * 100)}%`;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function scoreColor(scoreBand: ScoredCartSummary["scoreBand"]) {
  if (scoreBand === "high") {
    return "bg-[var(--success)]";
  }

  if (scoreBand === "medium") {
    return "bg-[#f59e0b]";
  }

  return "bg-[var(--danger)]";
}

export function CartScoreList({ carts, shopDomain }: CartScoreListProps) {
  if (carts.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 text-sm text-[var(--text-muted)]">
        No scored abandoned carts yet for <span className="font-semibold text-[var(--text)]">{shopDomain}</span>. Add
        the `checkouts/create`, `checkouts/update`, and `orders/create` webhooks in Shopify to begin scoring.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold">Prioritized Recovery Queue</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Ranked by predicted conversion probability for {shopDomain}.
          </p>
        </div>
      </header>

      <ul className="space-y-3">
        {carts.map((cart) => (
          <li
            key={cart.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{cart.customerEmail ?? `Cart ${cart.cartToken}`}</p>
                <p className="mt-1 font-[var(--font-heading)] text-lg font-semibold">
                  {formatCurrency(cart.cartValue, cart.currency)} cart value
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} • {cart.hoursSinceLastActivity.toFixed(1)}h
                  since last activity
                </p>
              </div>

              <div className="sm:text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  <span className={`h-2 w-2 rounded-full ${scoreColor(cart.scoreBand)}`} />
                  {cart.scoreBand} intent
                </div>
                <p className="mt-2 font-[var(--font-heading)] text-2xl font-semibold">{formatConfidence(cart.score)}</p>
                {cart.converted ? (
                  <p className="text-xs font-medium text-[var(--success)]">Already converted</p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Recommended outreach tier</p>
                )}
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--background-soft)]">
              <div
                className={`h-full ${scoreColor(cart.scoreBand)}`}
                style={{ width: `${Math.round(cart.score * 100)}%` }}
                aria-hidden="true"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {cart.scoreReasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
                >
                  {reason}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
