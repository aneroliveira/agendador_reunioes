import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  isActive: z.boolean().optional(),
});

// Fallback schedule for the rare case there's no existing EventType to copy
// from — mirrors the same 7-day-off default the dashboard's Availability
// form already uses when a type has no rules yet.
const DEFAULT_RULES = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isActive: false,
  startTime: "09:00",
  endTime: "18:00",
}));

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "tipo-de-reuniao";
  let candidate = base;
  let suffix = 2;
  while (await prisma.eventType.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
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

  const { title, description, durationMinutes, isActive } = parsed.data;
  const slug = await generateUniqueSlug(title);

  // Every active event type shares one weekly schedule (see the Availability
  // form's PATCH route) — a brand-new type needs that schedule copied onto
  // it immediately, otherwise it'd show zero bookable slots until the admin
  // happens to re-save the (seemingly unrelated) Availability card.
  const template = await prisma.eventType.findFirst({
    orderBy: { createdAt: "asc" },
    include: { availabilityRules: true },
  });
  const rulesToCopy =
    template && template.availabilityRules.length > 0
      ? template.availabilityRules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          isActive: r.isActive,
          startTime: r.startTime,
          endTime: r.endTime,
        }))
      : DEFAULT_RULES;

  const eventType = await prisma.$transaction(async (tx) => {
    const created = await tx.eventType.create({
      data: {
        slug,
        title,
        description: description && description.length > 0 ? description : null,
        durationMinutes,
        isActive: isActive ?? true,
      },
    });
    await tx.availabilityRule.createMany({
      data: rulesToCopy.map((r) => ({ ...r, eventTypeId: created.id })),
    });
    return created;
  });

  return NextResponse.json({ id: eventType.id, slug: eventType.slug }, { status: 201 });
}
