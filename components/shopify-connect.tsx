"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ShopifyConnectProps {
  defaultShopDomain?: string;
}

interface ConnectResponse {
  ok: boolean;
  shopDomain?: string;
  shopName?: string;
  error?: string;
}

export function ShopifyConnect({ defaultShopDomain }: ShopifyConnectProps) {
  const router = useRouter();
  const [shopDomain, setShopDomain] = useState(defaultShopDomain ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/shopify/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ shopDomain, accessToken })
        });

        const payload = (await response.json()) as ConnectResponse;

        if (!response.ok || !payload.ok) {
          setServerMessage(payload.error ?? "Could not connect this Shopify store.");
          return;
        }

        setServerMessage(
          `Connected ${payload.shopName ?? payload.shopDomain}. Webhook endpoint: /api/shopify/webhook`
        );
        setAccessToken("");
        router.refresh();
      } catch {
        setServerMessage("Network issue while connecting to Shopify. Try again.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="font-[var(--font-heading)] text-xl font-semibold">Connect Shopify Admin API</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Enter your <code>{"{shop}.myshopify.com"}</code> domain and a private Admin API access token with{" "}
          <code>read_checkouts</code> and <code>read_orders</code> scopes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">Shop Domain</span>
          <input
            value={shopDomain}
            onChange={(event) => setShopDomain(event.target.value)}
            placeholder="acme-store.myshopify.com"
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-0 transition focus:border-[var(--primary)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">Admin API Access Token</span>
          <input
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            type="password"
            placeholder="shpat_..."
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-0 transition focus:border-[var(--primary)]"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[#081019] transition hover:bg-[#56b6ff] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Connecting..." : "Connect Store"}
        </button>
      </form>

      {serverMessage ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background-soft)] p-3 text-sm text-[var(--text-muted)]">
          {serverMessage}
        </p>
      ) : null}
    </section>
  );
}
