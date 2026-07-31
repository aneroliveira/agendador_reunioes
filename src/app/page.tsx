import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";

// Depends on which EventType is active in the DB — must not be baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const eventType = await prisma.eventType.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!eventType) {
    notFound();
  }

  redirect(`/book/${eventType.slug}`);
}
