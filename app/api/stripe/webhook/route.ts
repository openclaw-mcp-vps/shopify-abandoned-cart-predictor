import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordPaidAccess } from "@/lib/database";

export const runtime = "nodejs";

function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const signatureParts = signatureHeader.split(",").reduce<Record<string, string[]>>((accumulator, part) => {
    const [key, value] = part.split("=");

    if (!key || !value) {
      return accumulator;
    }

    const trimmedKey = key.trim();

    if (!accumulator[trimmedKey]) {
      accumulator[trimmedKey] = [];
    }

    accumulator[trimmedKey].push(value.trim());
    return accumulator;
  }, {});

  const timestamp = signatureParts.t?.[0];
  const signatures = signatureParts.v1 ?? [];

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const payloadToSign = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", secret).update(payloadToSign, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  const timestampAgeInSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(timestampAgeInSeconds) || timestampAgeInSeconds > 300) {
    return false;
  }

  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "utf8");

    if (candidateBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer_email?: string | null;
      customer_details?: {
        email?: string | null;
      };
    };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: "STRIPE_WEBHOOK_SECRET is not configured"
      },
      { status: 500 }
    );
  }

  if (!signature || !verifyStripeWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email ?? session.customer_email;

    if (email) {
      await recordPaidAccess({
        email,
        provider: "stripe",
        status: "active",
        externalEventId: event.id
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const session = event.data.object;
    const email = session.customer_details?.email ?? session.customer_email;

    if (email) {
      await recordPaidAccess({
        email,
        provider: "stripe",
        status: "canceled",
        externalEventId: event.id
      });
    }
  }

  return NextResponse.json({ received: true });
}
