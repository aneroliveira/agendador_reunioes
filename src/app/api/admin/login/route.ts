import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";

const bodySchema = z.object({ password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Senha obrigatória" }, { status: 400 });
  }

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    return NextResponse.json({ error: "ADMIN_PASSWORD_HASH não configurado" }, { status: 500 });
  }

  const isValid = await bcrypt.compare(parsed.data.password, passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const session = await getAdminSession();
  session.isAdmin = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
