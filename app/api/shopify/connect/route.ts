import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertStoreConnection } from "@/lib/database";
import { normalizeShopDomain, validateShopifyConnection } from "@/lib/shopify";

export const runtime = "nodejs";

const connectSchema = z.object({
  shopDomain: z.string().min(3),
  accessToken: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const payload = connectSchema.parse(await request.json());
    const shopDomain = normalizeShopDomain(payload.shopDomain);
    const shop = await validateShopifyConnection(shopDomain, payload.accessToken);

    await upsertStoreConnection({
      shopDomain,
      accessToken: payload.accessToken,
      shopName: shop.shopName
    });

    const response = NextResponse.json({
      ok: true,
      shopDomain,
      shopName: shop.shopName
    });

    response.cookies.set("sap_shop", shopDomain, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.issues[0]?.message ?? "Invalid request payload"
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to connect Shopify store";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
