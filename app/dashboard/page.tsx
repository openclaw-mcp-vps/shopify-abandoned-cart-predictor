import Link from "next/link";
import { cookies } from "next/headers";
import { CartScoreList } from "@/components/cart-score-list";
import { Pricing } from "@/components/pricing";
import { ShopifyConnect } from "@/components/shopify-connect";
import { listStoreConnections, listTopScoredCarts } from "@/lib/database";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const unlockStatus = resolvedSearchParams.unlock;

  const cookieStore = await cookies();
  const hasAccess = cookieStore.get("sap_access")?.value === "granted";
  const accessEmail = cookieStore.get("sap_email")?.value;

  if (!hasAccess) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 sm:p-8">
          <p className="inline-flex rounded-full border border-[var(--primary-soft)] bg-[rgba(46,163,255,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Dashboard Paywall
          </p>
          <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-semibold sm:text-4xl">
            Unlock High-Intent Cart Scoring
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--text-muted)] sm:text-base">
            This dashboard is available to active subscribers only. Complete checkout first, then claim access with the
            same email used in Stripe Checkout.
          </p>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6">
            <h2 className="font-[var(--font-heading)] text-xl font-semibold">Claim Dashboard Access</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              After payment succeeds, submit your purchase email to set a secure access cookie.
            </p>

            <form action="/api/billing/claim" method="post" className="mt-5 space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Purchase Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="operator@store.com"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[#081019] transition hover:bg-[#56b6ff]"
              >
                Unlock Dashboard
              </button>
            </form>

            {unlockStatus === "failed" ? (
              <p className="mt-4 rounded-lg border border-[var(--danger)]/30 bg-[rgba(251,113,133,0.12)] p-3 text-sm text-[var(--danger)]">
                No active payment found for that email yet. Confirm webhook delivery and try again.
              </p>
            ) : null}

            <p className="mt-5 text-xs text-[var(--text-muted)]">
              Need setup help? Stripe webhook endpoint should point to `/api/stripe/webhook`.
            </p>
          </div>

          <Pricing />
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--text-muted)] underline decoration-dotted underline-offset-4 transition hover:text-[var(--text)]"
          >
            Back to landing page
          </Link>
        </div>
      </main>
    );
  }

  const connectedStores = await listStoreConnections();
  const selectedShop = cookieStore.get("sap_shop")?.value ?? connectedStores[0]?.shopDomain;
  const scoredCarts = selectedShop ? await listTopScoredCarts(selectedShop, 100) : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Subscriber Dashboard</p>
            <h1 className="mt-1 font-[var(--font-heading)] text-3xl font-semibold">Recovery Priority Workspace</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Logged in as {accessEmail}. Focus outreach on high-intent carts first, then cascade to medium-intent tiers.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition hover:bg-[var(--background-soft)] hover:text-[var(--text)]"
          >
            Marketing Site
          </Link>
        </div>
      </header>

      <section className="mt-6">
        <ShopifyConnect defaultShopDomain={selectedShop} />
      </section>

      {selectedShop ? (
        <section className="mt-6">
          <CartScoreList carts={scoredCarts} shopDomain={selectedShop} />
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 text-sm text-[var(--text-muted)]">
          Connect your first Shopify store to start collecting and scoring abandoned checkout activity.
        </section>
      )}
    </main>
  );
}
