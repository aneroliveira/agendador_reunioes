import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.ownerAccount.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      email: "lsoliveira@impulsomidia.com",
      displayName: "Lorena Santos",
      timezone: "America/Sao_Paulo",
    },
  });

  const eventType = await prisma.eventType.upsert({
    where: { slug: "conversa-flexivel" },
    update: {},
    create: {
      slug: "conversa-flexivel",
      title: "Conversa Flexível",
      description: "Escolha o melhor horário para a nossa conversa — até breve!",
      durationMinutes: 30,
    },
  });

  const existingRules = await prisma.availabilityRule.count({
    where: { eventTypeId: eventType.id },
  });

  if (existingRules === 0) {
    // Monday-Friday, 09:00-18:00 owner-local.
    await prisma.availabilityRule.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        eventTypeId: eventType.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      })),
    });
  }

  console.log("Seed concluído:", { eventType: eventType.slug });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
