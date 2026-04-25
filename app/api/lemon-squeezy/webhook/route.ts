import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordPaidAccess } from "@/lib/database";

export const runtime = "nodejs";

function verifyLemonSqueezyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

interface LemonSqueezyEvent {
  meta?: {
    event_name?: string;
  };
  data?: {
    id?: string;
    attributes?: {
      user_email?: string;
      status?: string;
    };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (secret && (!signature || !verifyLemonSqueezyWebhook(rawBody, signature, secret))) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as LemonSqueezyEvent;
  const eventName = event.meta?.event_name;
  const email = event.data?.attributes?.user_email;

  if (email) {
    const status = eventName === "subscription_cancelled" ? "canceled" : "active";

    await recordPaidAccess({
      email,
      provider: "lemon-squeezy",
      status,
      externalEventId: event.data?.id
    });
  }

  return NextResponse.json({ received: true, eventName });
}
