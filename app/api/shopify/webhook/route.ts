import { NextResponse } from "next/server";
import { markCartConverted, saveCartScore, upsertAbandonedCart } from "@/lib/database";
import { predictCartConversion } from "@/lib/ml-predictor";
import {
  extractAbandonedCartFromWebhook,
  extractConversionLookup,
  normalizeShopDomain,
  verifyShopifyWebhookSignature
} from "@/lib/shopify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopHeader = request.headers.get("x-shopify-shop-domain") ?? "";
  const signature = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (secret && !verifyShopifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid Shopify signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const shopDomain = normalizeShopDomain(shopHeader || String(payload.shop_domain ?? "unknown"));

  if (topic.startsWith("checkouts/")) {
    const extracted = extractAbandonedCartFromWebhook(payload, shopDomain);
    const cart = await upsertAbandonedCart({
      shopDomain,
      cartToken: extracted.cartToken,
      checkoutId: extracted.checkoutId,
      customerEmail: extracted.customerEmail,
      currency: extracted.currency,
      eventAt: extracted.eventAt,
      features: extracted.features
    });

    const prediction = await predictCartConversion(extracted.features);

    await saveCartScore({
      cartId: cart.id,
      score: prediction.probability,
      reasons: prediction.reasons,
      modelVersion: prediction.modelVersion
    });
  }

  if (topic === "orders/create") {
    const conversionLookup = extractConversionLookup(payload);

    await markCartConverted({
      shopDomain,
      cartToken: conversionLookup.cartToken,
      checkoutId: conversionLookup.checkoutId,
      customerEmail: conversionLookup.customerEmail,
      convertedAt: new Date().toISOString()
    });
  }

  return NextResponse.json({ received: true });
}
