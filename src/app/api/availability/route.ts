import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeSlotsForEventType } from "@/lib/scheduling";

const querySchema = z.object({
  eventType: z.string().min(1),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const { eventType: slug, from, to } = parsed.data;

  const [owner, eventType] = await Promise.all([
    prisma.ownerAccount.findUnique({ where: { id: 1 } }),
    prisma.eventType.findUnique({
      where: { slug },
      include: { availabilityRules: true },
    }),
  ]);

  if (!owner) {
    return NextResponse.json({ error: "Conta do dono da agenda não configurada" }, { status: 500 });
  }
  if (!eventType || !eventType.isActive) {
    return NextResponse.json({ error: "Tipo de reunião não encontrado" }, { status: 404 });
  }

  const slots = await computeSlotsForEventType({
    eventType,
    owner,
    rangeFromUTC: new Date(from),
    rangeToUTC: new Date(to),
    now: new Date(),
  });

  return NextResponse.json({
    eventType: { slug: eventType.slug, title: eventType.title, durationMinutes: eventType.durationMinutes },
    ownerTimezone: owner.timezone,
    slots: slots.map((s) => ({ startUTC: s.startUTC.toISOString(), endUTC: s.endUTC.toISOString() })),
  });
}
