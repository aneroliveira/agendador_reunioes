import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { exchangeCodeForTokens } from "@/lib/google-calendar";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/admin?google_error=1", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the owner had already granted consent before without
      // `prompt=consent` forcing a fresh one — Google only issues a
      // refresh_token on the first-ever consent (or when explicitly re-prompted).
      return NextResponse.redirect(new URL("/admin?google_error=no_refresh_token", request.url));
    }

    await prisma.ownerAccount.update({
      where: { id: 1 },
      data: {
        googleAccessToken: tokens.access_token ?? null,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (err) {
    console.error("Falha ao trocar código OAuth por tokens do Google:", err);
    return NextResponse.redirect(new URL("/admin?google_error=exchange_failed", request.url));
  }
}
