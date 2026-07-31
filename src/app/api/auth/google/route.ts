import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.redirect(getGoogleAuthUrl());
}
