import type { CartFeatures } from "@/lib/database";

const MAX_CART_VALUE = 500;
const MAX_ITEM_COUNT = 10;
const MAX_HOURS_IDLE = 72;
const MAX_VIEWED_PRODUCTS = 20;

const WEIGHTS = [
  1.65,
  0.9,
  1.35,
  0.8,
  0.75,
  0.6,
  0.3,
  0.5,
  0.55,
  0.45,
  0.2,
  0.4,
  -0.15,
  -0.05
] as const;

const BIAS = -2.25;

export interface ConversionPrediction {
  probability: number;
  intentBand: "high" | "medium" | "low";
  reasons: string[];
  modelVersion: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function encodeFeatures(features: CartFeatures): number[] {
  return [
    clamp(features.cartValue / MAX_CART_VALUE, 0, 1),
    clamp(features.itemCount / MAX_ITEM_COUNT, 0, 1),
    1 - clamp(features.hoursSinceLastActivity / MAX_HOURS_IDLE, 0, 1),
    features.returningCustomer ? 1 : 0,
    clamp(features.viewedProductCount / MAX_VIEWED_PRODUCTS, 0, 1),
    features.startedCheckout ? 1 : 0,
    features.discountApplied ? 1 : 0,
    features.trafficSource === "direct" ? 1 : 0,
    features.trafficSource === "search" ? 1 : 0,
    features.trafficSource === "email" ? 1 : 0,
    features.trafficSource === "paid" ? 1 : 0,
    features.deviceType === "desktop" ? 1 : 0,
    features.deviceType === "mobile" ? 1 : 0,
    features.deviceType === "tablet" ? 1 : 0
  ];
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function predictHeuristic(vector: number[]): number {
  let logit = BIAS;

  for (let index = 0; index < vector.length; index += 1) {
    logit += vector[index] * WEIGHTS[index];
  }

  return clamp(sigmoid(logit), 0, 1);
}

function buildReasons(features: CartFeatures, probability: number): string[] {
  const reasons: string[] = [];

  if (features.cartValue >= 120) {
    reasons.push(`High cart value (${features.cartValue.toFixed(0)} ${"USD"})`);
  }

  if (features.hoursSinceLastActivity <= 4) {
    reasons.push("Recent abandonment event (within 4 hours)");
  }

  if (features.returningCustomer) {
    reasons.push("Returning customer behavior detected");
  }

  if (features.itemCount >= 3) {
    reasons.push("Multi-item cart tends to indicate buying intent");
  }

  if (features.startedCheckout) {
    reasons.push("Checkout process was started before abandonment");
  }

  if (features.trafficSource === "email" || features.trafficSource === "search") {
    reasons.push("Acquisition source historically converts well");
  }

  if (reasons.length === 0 && probability >= 0.4) {
    reasons.push("Moderate signals across multiple behavioral features");
  }

  if (reasons.length === 0) {
    reasons.push("Low-intent behavior with limited purchase signals");
  }

  return reasons;
}

export async function predictCartConversion(features: CartFeatures): Promise<ConversionPrediction> {
  const vector = encodeFeatures(features);
  const probability = predictHeuristic(vector);

  let intentBand: ConversionPrediction["intentBand"] = "low";

  if (probability >= 0.65) {
    intentBand = "high";
  } else if (probability >= 0.4) {
    intentBand = "medium";
  }

  return {
    probability,
    intentBand,
    reasons: buildReasons(features, probability),
    modelVersion: "heuristic-logit-v1"
  };
}
