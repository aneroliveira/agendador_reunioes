import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data precisa estar no formato yyyy-MM-dd"),
  label: z.string().trim().min(1).max(200),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(
    holidays.map((h) => ({ id: h.id, date: h.date.toISOString().slice(0, 10), label: h.label })),
  );
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  // Idempotent: a suggestion can be clicked again (e.g. after a page refresh)
  // without erroring — same date just updates the label instead of failing.
  const holiday = await prisma.holiday.upsert({
    where: { date: new Date(parsed.data.date) },
    update: { label: parsed.data.label },
    create: { date: new Date(parsed.data.date), label: parsed.data.label },
  });

  return NextResponse.json(
    { id: holiday.id, date: holiday.date.toISOString().slice(0, 10), label: holiday.label },
    { status: 201 },
  );
}
