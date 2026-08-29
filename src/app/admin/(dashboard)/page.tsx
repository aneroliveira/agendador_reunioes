import Link from "next/link";
import { CalendarClock, Home } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { AdminDecorativeBackground } from "@/components/admin-decorative-background";
import { LogoutButton } from "./logout-button";
import { ProfileForm } from "./profile-form";
import { AppearanceForm } from "./appearance-form";
import { HolidaysForm } from "./holidays-form";
import { UpcomingBookings } from "./upcoming-bookings";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string }>;
}) {
  const { google_error: googleError } = await searchParams;
  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 } });
  const isGoogleConnected = Boolean(owner?.googleRefreshToken);

  const upcomingBookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", startTimeUTC: { gte: new Date() } },
    orderBy: { startTimeUTC: "asc" },
    take: 20,
    include: { eventType: { select: { title: true, slug: true, durationMinutes: true } } },
  });

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <AdminDecorativeBackground />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/admin/event-types" />}>
            <CalendarClock data-icon="inline-start" className="size-4" />
            Tipos de reunião
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            <Home data-icon="inline-start" className="size-4" />
            Ver site
          </Button>
          <LogoutButton />
        </div>
      </div>

      {googleError && (
        <p className="text-sm text-destructive">
          Não foi possível conectar ao Google ({googleError}). Tente novamente.
        </p>
      )}

      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">Google Calendar</p>
            <p className="text-sm text-muted-foreground">
              {isGoogleConnected
                ? "Conectado — disponibilidade sincronizada com sua agenda real."
                : "Não conectado — disponibilidade usa só as regras de horário."}
            </p>
          </div>
          {isGoogleConnected ? (
            <Badge>Conectado</Badge>
          ) : (
            <Button render={<a href="/api/auth/google" />}>Conectar Google Calendar</Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTab value="profile">Perfil</TabsTab>
          <TabsTab value="holidays">Feriados</TabsTab>
          <TabsTab value="appearance">Aparência</TabsTab>
        </TabsList>
        <TabsPanel value="profile">
          <ProfileForm
            displayName={owner?.displayName ?? ""}
            themeColor={owner?.themeColor ?? "#c4677a"}
            initialAvatarImageUrl={owner?.avatarImageUrl ?? null}
            initialIntroText={owner?.introText ?? ""}
            initialLinkedinUrl={owner?.linkedinUrl ?? ""}
            initialWhatsappUrl={owner?.whatsappUrl ?? ""}
            initialTeamsMeetingLink={owner?.teamsMeetingLink ?? ""}
          />
        </TabsPanel>
        <TabsPanel value="holidays">
          <HolidaysForm
            initialHolidays={holidays.map((h) => ({
              id: h.id,
              date: h.date.toISOString().slice(0, 10),
              label: h.label,
            }))}
          />
        </TabsPanel>
        <TabsPanel value="appearance">
          <AppearanceForm initialThemeColor={owner?.themeColor ?? "#c4677a"} />
        </TabsPanel>
      </Tabs>

      <UpcomingBookings
        bookings={upcomingBookings.map((b) => ({
          id: b.id,
          inviteeName: b.inviteeName,
          inviteeEmail: b.inviteeEmail,
          startTimeUTC: b.startTimeUTC.toISOString(),
          meetLink: b.meetLink,
          eventType: b.eventType,
        }))}
      />
    </main>
  );
}
