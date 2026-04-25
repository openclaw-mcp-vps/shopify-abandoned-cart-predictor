import { NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.redirect(new URL("/dashboard?unlock=failed", request.url));
  }

  const accessIsActive = await hasPaidAccess(email);

  if (!accessIsActive) {
    return NextResponse.redirect(new URL("/dashboard?unlock=failed", request.url));
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const cookieConfig = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };

  response.cookies.set("sap_access", "granted", cookieConfig);
  response.cookies.set("sap_email", email, cookieConfig);

  return response;
}
