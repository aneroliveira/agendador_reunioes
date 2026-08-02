import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  introText: z.string().trim().max(2000).optional(),
  linkedinUrl: z.string().trim().max(300).optional(),
  whatsappUrl: z.string().trim().max(300).optional(),
  themeColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor precisa ser um hex válido, ex: #c4677a")
    .optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { introText, linkedinUrl, whatsappUrl, themeColor } = parsed.data;

  await prisma.ownerAccount.update({
    where: { id: 1 },
    data: {
      ...(introText !== undefined ? { introText: introText.length > 0 ? introText : null } : {}),
      ...(linkedinUrl !== undefined ? { linkedinUrl: linkedinUrl.length > 0 ? linkedinUrl : null } : {}),
      ...(whatsappUrl !== undefined ? { whatsappUrl: whatsappUrl.length > 0 ? whatsappUrl : null } : {}),
      ...(themeColor !== undefined ? { themeColor } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
