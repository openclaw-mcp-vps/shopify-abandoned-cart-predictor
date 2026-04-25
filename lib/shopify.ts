import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminApiClient } from "@shopify/admin-api-client";
import type { CartFeatures } from "@/lib/database";

export interface ShopifyConnectionCheck {
  shopName: string;
  shopDomain: string;
  email?: string;
}

export interface ExtractedAbandonedCart {
  cartToken: string;
  checkoutId?: string;
  customerEmail?: string;
  currency: string;
  eventAt: string;
  features: CartFeatures;
}

export interface ConversionLookup {
  cartToken?: string;
  checkoutId?: string;
  customerEmail?: string;
}

type GenericPayload = Record<string, unknown>;

const SOCIAL_PATTERNS = ["facebook", "instagram", "tiktok", "pinterest", "snapchat", "x.com"];
const SEARCH_PATTERNS = ["google", "bing", "yahoo", "duckduckgo", "search"];
const EMAIL_PATTERNS = ["klaviyo", "mailchimp", "email", "newsletter"];
const PAID_PATTERNS = ["cpc", "paid", "utm_medium=paid", "ad", "ads"];

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeTrafficSource(raw: string): CartFeatures["trafficSource"] {
  const value = raw.toLowerCase();

  if (SOCIAL_PATTERNS.some((pattern) => value.includes(pattern))) {
    return "social";
  }

  if (SEARCH_PATTERNS.some((pattern) => value.includes(pattern))) {
    return "search";
  }

  if (EMAIL_PATTERNS.some((pattern) => value.includes(pattern))) {
    return "email";
  }

  if (PAID_PATTERNS.some((pattern) => value.includes(pattern))) {
    return "paid";
  }

  if (value.includes("direct") || value.trim().length === 0) {
    return "direct";
  }

  return "unknown";
}

function normalizeDeviceType(raw: string | undefined): CartFeatures["deviceType"] {
  const value = raw?.toLowerCase() ?? "";

  if (value.includes("ipad") || value.includes("tablet")) {
    return "tablet";
  }

  if (value.includes("mobile") || value.includes("iphone") || value.includes("android")) {
    return "mobile";
  }

  if (value.length === 0) {
    return "unknown";
  }

  return "desktop";
}

function buildCartFeatures(payload: GenericPayload): CartFeatures {
  const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

  const itemCount = lineItems.reduce((sum, item) => {
    if (typeof item !== "object" || item === null) {
      return sum;
    }

    const quantity = asNumber((item as GenericPayload).quantity);
    return sum + (quantity ?? 1);
  }, 0);

  const viewedProductCount = lineItems.length;
  const totalPrice =
    asNumber(payload.total_price) ?? asNumber(payload.subtotal_price) ?? asNumber(payload.total_line_items_price) ?? 0;

  const updatedAt = asString(payload.updated_at) ?? asString(payload.created_at);
  const updatedDate = updatedAt ? new Date(updatedAt) : new Date();
  const hoursSinceLastActivity = Math.max(
    0,
    (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60)
  );

  const customer = typeof payload.customer === "object" && payload.customer ? (payload.customer as GenericPayload) : {};
  const ordersCount = asNumber(customer.orders_count) ?? 0;

  const discountCodes = Array.isArray(payload.discount_codes) ? payload.discount_codes : [];
  const totalDiscounts = asNumber(payload.total_discounts) ?? 0;

  const sourceMaterial = [
    asString(payload.source_name),
    asString(payload.referring_site),
    asString(payload.landing_site),
    asString(payload.utm_source)
  ]
    .filter(Boolean)
    .join(" ");

  const clientDetails =
    typeof payload.client_details === "object" && payload.client_details
      ? (payload.client_details as GenericPayload)
      : {};

  const userAgent = asString(clientDetails.user_agent) ?? asString(payload.user_agent);

  return {
    cartValue: totalPrice,
    itemCount,
    hoursSinceLastActivity,
    returningCustomer: ordersCount > 0,
    viewedProductCount,
    startedCheckout: true,
    discountApplied: discountCodes.length > 0 || totalDiscounts > 0,
    trafficSource: normalizeTrafficSource(sourceMaterial),
    deviceType: normalizeDeviceType(userAgent)
  };
}

export function normalizeShopDomain(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (cleaned.endsWith(".myshopify.com")) {
    return cleaned;
  }

  return `${cleaned}.myshopify.com`;
}

export function verifyShopifyWebhookSignature(
  rawBody: string,
  providedSignature: string,
  secret: string
): boolean {
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const digestBuffer = Buffer.from(digest, "utf8");

  if (providedBuffer.length !== digestBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, digestBuffer);
}

export async function validateShopifyConnection(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyConnectionCheck> {
  const client = createAdminApiClient({
    storeDomain: shopDomain,
    apiVersion: process.env.SHOPIFY_API_VERSION ?? "2025-10",
    accessToken
  });

  const response = await client.request<{ shop: { name: string; email?: string; myshopifyDomain: string } }>(
    `#graphql
      query ValidateConnection {
        shop {
          name
          email
          myshopifyDomain
        }
      }
    `
  );

  const shop = response.data?.shop;

  if (!shop) {
    throw new Error("Shopify credentials are invalid or missing required permissions.");
  }

  return {
    shopName: shop.name,
    shopDomain: shop.myshopifyDomain,
    email: shop.email
  };
}

export function extractAbandonedCartFromWebhook(
  payload: GenericPayload,
  _shopDomain: string
): ExtractedAbandonedCart {
  const cartToken =
    asString(payload.cart_token) ?? asString(payload.token) ?? asString(payload.id) ?? `cart-${Date.now()}`;

  return {
    cartToken,
    checkoutId: asString(payload.id),
    customerEmail: asString(payload.email),
    currency: asString(payload.currency) ?? "USD",
    eventAt: asString(payload.updated_at) ?? asString(payload.created_at) ?? new Date().toISOString(),
    features: buildCartFeatures(payload)
  };
}

export function extractConversionLookup(payload: GenericPayload): ConversionLookup {
  return {
    cartToken: asString(payload.cart_token) ?? asString(payload.checkout_token),
    checkoutId: asString(payload.checkout_id),
    customerEmail: asString(payload.email)
  };
}
