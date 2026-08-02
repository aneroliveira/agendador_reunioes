import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isActive: z.boolean(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário precisa estar no formato HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário precisa estar no formato HH:mm"),
});

const bodySchema = z.object({
  rules: z.array(ruleSchema).length(7),
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

  for (const rule of parsed.data.rules) {
    if (rule.isActive && rule.startTime >= rule.endTime) {
      return NextResponse.json({ error: "Horário de início precisa ser antes do horário de fim" }, { status: 400 });
    }
  }

  // Single-owner MVP: every active event type shares the same weekly
  // schedule. A per-event-type editor would only be needed once there's
  // more than one active event type with a different schedule.
  const eventTypes = await prisma.eventType.findMany({ where: { isActive: true }, select: { id: true } });

  await prisma.$transaction(
    eventTypes.flatMap((eventType) =>
      parsed.data.rules.map((rule) =>
        prisma.availabilityRule.upsert({
          where: { eventTypeId_dayOfWeek: { eventTypeId: eventType.id, dayOfWeek: rule.dayOfWeek } },
          create: { eventTypeId: eventType.id, ...rule },
          update: { isActive: rule.isActive, startTime: rule.startTime, endTime: rule.endTime },
        }),
      ),
    ),
  );

  return NextResponse.json({ ok: true });
}
