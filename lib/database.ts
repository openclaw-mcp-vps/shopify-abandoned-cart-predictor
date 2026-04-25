import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const trafficSourceSchema = z.enum([
  "direct",
  "email",
  "search",
  "paid",
  "social",
  "unknown"
]);

export const deviceTypeSchema = z.enum(["desktop", "mobile", "tablet", "unknown"]);

export const cartFeaturesSchema = z.object({
  cartValue: z.number().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  hoursSinceLastActivity: z.number().nonnegative(),
  returningCustomer: z.boolean(),
  viewedProductCount: z.number().int().nonnegative(),
  startedCheckout: z.boolean(),
  discountApplied: z.boolean(),
  trafficSource: trafficSourceSchema,
  deviceType: deviceTypeSchema
});

const storeSchema = z.object({
  shopDomain: z.string(),
  shopName: z.string().optional(),
  accessToken: z.string(),
  connectedAt: z.string(),
  updatedAt: z.string()
});

const cartSchema = z.object({
  id: z.string(),
  shopDomain: z.string(),
  cartToken: z.string(),
  checkoutId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastEventAt: z.string(),
  converted: z.boolean(),
  convertedAt: z.string().optional(),
  features: cartFeaturesSchema,
  score: z.number().min(0).max(1).nullable(),
  scoringModel: z.string().nullable(),
  scoreReasons: z.array(z.string())
});

const billingAccessSchema = z.object({
  email: z.string().email(),
  provider: z.enum(["stripe", "lemon-squeezy"]),
  status: z.enum(["active", "canceled"]),
  externalEventId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const dbSchema = z.object({
  version: z.literal(1),
  stores: z.array(storeSchema),
  carts: z.array(cartSchema),
  billingAccess: z.array(billingAccessSchema)
});

type Db = z.infer<typeof dbSchema>;

type StoreRecord = z.infer<typeof storeSchema>;

type CartRecord = z.infer<typeof cartSchema>;

type BillingRecord = z.infer<typeof billingAccessSchema>;

export type CartFeatures = z.infer<typeof cartFeaturesSchema>;

export interface UpsertCartInput {
  shopDomain: string;
  cartToken: string;
  checkoutId?: string;
  customerEmail?: string;
  currency?: string;
  eventAt: string;
  features: CartFeatures;
}

export interface RecordConversionInput {
  shopDomain: string;
  cartToken?: string;
  checkoutId?: string;
  customerEmail?: string;
  convertedAt: string;
}

export interface SaveScoreInput {
  cartId: string;
  score: number;
  reasons: string[];
  modelVersion: string;
}

export interface UpsertStoreInput {
  shopDomain: string;
  accessToken: string;
  shopName?: string;
}

export interface BillingAccessInput {
  email: string;
  provider: "stripe" | "lemon-squeezy";
  status: "active" | "canceled";
  externalEventId?: string;
}

export interface ScoredCartSummary {
  id: string;
  cartToken: string;
  customerEmail?: string;
  currency: string;
  converted: boolean;
  score: number;
  scoreBand: "high" | "medium" | "low";
  scoreReasons: string[];
  cartValue: number;
  itemCount: number;
  hoursSinceLastActivity: number;
  updatedAt: string;
}

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIRECTORY, "app-data.json");

function defaultDb(): Db {
  return {
    version: 1,
    stores: [],
    carts: [],
    billingAccess: []
  };
}

async function ensureDbFileExists() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultDb(), null, 2), "utf8");
  }
}

async function readDb(): Promise<Db> {
  await ensureDbFileExists();

  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return dbSchema.parse(parsed);
}

async function writeDb(db: Db) {
  const tempFile = `${DATA_FILE}.tmp`;
  await writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await rename(tempFile, DATA_FILE);
}

let mutationQueue: Promise<unknown> = Promise.resolve();

async function mutateDb<T>(mutation: (db: Db) => T | Promise<T>): Promise<T> {
  const runMutation = async () => {
    const db = await readDb();
    const result = await mutation(db);
    await writeDb(db);
    return result;
  };

  const queued = mutationQueue.then(runMutation, runMutation);
  mutationQueue = queued.then(
    () => undefined,
    () => undefined
  );
  return queued;
}

function toLowerEmail(email: string) {
  return email.trim().toLowerCase();
}

function toScoreBand(score: number): "high" | "medium" | "low" {
  if (score >= 0.65) {
    return "high";
  }

  if (score >= 0.4) {
    return "medium";
  }

  return "low";
}

export async function upsertStoreConnection(input: UpsertStoreInput): Promise<StoreRecord> {
  const now = new Date().toISOString();

  return mutateDb((db) => {
    const existing = db.stores.find((store) => store.shopDomain === input.shopDomain);

    if (existing) {
      existing.accessToken = input.accessToken;
      existing.shopName = input.shopName;
      existing.updatedAt = now;
      return existing;
    }

    const record: StoreRecord = {
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      shopName: input.shopName,
      connectedAt: now,
      updatedAt: now
    };

    db.stores.push(record);
    return record;
  });
}

export async function listStoreConnections(): Promise<StoreRecord[]> {
  const db = await readDb();
  return [...db.stores].sort((a, b) => a.shopDomain.localeCompare(b.shopDomain));
}

export async function getStoreConnection(shopDomain: string): Promise<StoreRecord | undefined> {
  const db = await readDb();
  return db.stores.find((store) => store.shopDomain === shopDomain);
}

export async function upsertAbandonedCart(input: UpsertCartInput): Promise<CartRecord> {
  const now = new Date().toISOString();

  return mutateDb((db) => {
    const existing = db.carts.find(
      (cart) =>
        cart.shopDomain === input.shopDomain &&
        (cart.cartToken === input.cartToken ||
          (input.checkoutId !== undefined && cart.checkoutId === input.checkoutId))
    );

    if (existing) {
      existing.cartToken = input.cartToken;
      existing.checkoutId = input.checkoutId;
      existing.customerEmail = input.customerEmail ?? existing.customerEmail;
      existing.currency = input.currency ?? existing.currency;
      existing.features = input.features;
      existing.lastEventAt = input.eventAt;
      existing.updatedAt = now;
      return existing;
    }

    const record: CartRecord = {
      id: randomUUID(),
      shopDomain: input.shopDomain,
      cartToken: input.cartToken,
      checkoutId: input.checkoutId,
      customerEmail: input.customerEmail,
      currency: input.currency ?? "USD",
      createdAt: now,
      updatedAt: now,
      lastEventAt: input.eventAt,
      converted: false,
      features: input.features,
      score: null,
      scoringModel: null,
      scoreReasons: []
    };

    db.carts.push(record);
    return record;
  });
}

export async function markCartConverted(input: RecordConversionInput): Promise<CartRecord | null> {
  return mutateDb((db) => {
    const email = input.customerEmail ? toLowerEmail(input.customerEmail) : undefined;

    const match = db.carts.find((cart) => {
      if (cart.shopDomain !== input.shopDomain) {
        return false;
      }

      if (input.checkoutId && cart.checkoutId === input.checkoutId) {
        return true;
      }

      if (input.cartToken && cart.cartToken === input.cartToken) {
        return true;
      }

      if (email && cart.customerEmail && toLowerEmail(cart.customerEmail) === email) {
        return true;
      }

      return false;
    });

    if (!match) {
      return null;
    }

    match.converted = true;
    match.convertedAt = input.convertedAt;
    match.updatedAt = new Date().toISOString();
    return match;
  });
}

export async function saveCartScore(input: SaveScoreInput): Promise<CartRecord | null> {
  return mutateDb((db) => {
    const cart = db.carts.find((entry) => entry.id === input.cartId);

    if (!cart) {
      return null;
    }

    cart.score = Math.max(0, Math.min(1, input.score));
    cart.scoreReasons = input.reasons;
    cart.scoringModel = input.modelVersion;
    cart.updatedAt = new Date().toISOString();

    return cart;
  });
}

export async function listTopScoredCarts(
  shopDomain: string,
  limit = 50
): Promise<ScoredCartSummary[]> {
  const db = await readDb();

  return db.carts
    .filter((cart) => cart.shopDomain === shopDomain && cart.score !== null)
    .sort((a, b) => {
      if (a.converted !== b.converted) {
        return Number(a.converted) - Number(b.converted);
      }

      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, limit)
    .map((cart) => ({
      id: cart.id,
      cartToken: cart.cartToken,
      customerEmail: cart.customerEmail,
      currency: cart.currency,
      converted: cart.converted,
      score: cart.score ?? 0,
      scoreBand: toScoreBand(cart.score ?? 0),
      scoreReasons: cart.scoreReasons,
      cartValue: cart.features.cartValue,
      itemCount: cart.features.itemCount,
      hoursSinceLastActivity: cart.features.hoursSinceLastActivity,
      updatedAt: cart.updatedAt
    }));
}

export async function recordPaidAccess(input: BillingAccessInput): Promise<BillingRecord> {
  const normalizedEmail = toLowerEmail(input.email);
  const now = new Date().toISOString();

  return mutateDb((db) => {
    const existing = db.billingAccess.find((record) => toLowerEmail(record.email) === normalizedEmail);

    if (existing) {
      existing.status = input.status;
      existing.provider = input.provider;
      existing.externalEventId = input.externalEventId;
      existing.updatedAt = now;
      return existing;
    }

    const record: BillingRecord = {
      email: normalizedEmail,
      provider: input.provider,
      status: input.status,
      externalEventId: input.externalEventId,
      createdAt: now,
      updatedAt: now
    };

    db.billingAccess.push(record);
    return record;
  });
}

export async function hasPaidAccess(email: string): Promise<boolean> {
  const normalizedEmail = toLowerEmail(email);
  const db = await readDb();

  return db.billingAccess.some(
    (record) => toLowerEmail(record.email) === normalizedEmail && record.status === "active"
  );
}
