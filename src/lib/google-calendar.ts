import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { prisma } from "./db";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export interface BusyInterval {
  start: Date;
  end: Date;
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getGoogleAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    // "offline" + "consent" together are what guarantee Google issues a
    // refresh_token, not just a short-lived access_token.
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Builds an OAuth2Client authenticated as the owner, wired to persist
 * refreshed access tokens back to the DB. Returns null if Google Calendar
 * hasn't been connected yet.
 */
async function getAuthenticatedClient() {
  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 } });
  if (!owner?.googleRefreshToken) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: owner.googleAccessToken ?? undefined,
    refresh_token: owner.googleRefreshToken,
    expiry_date: owner.googleTokenExpiry?.getTime(),
  });

  client.on("tokens", (tokens) => {
    prisma.ownerAccount
      .update({
        where: { id: 1 },
        data: {
          ...(tokens.access_token ? { googleAccessToken: tokens.access_token } : {}),
          ...(tokens.refresh_token ? { googleRefreshToken: tokens.refresh_token } : {}),
          ...(tokens.expiry_date ? { googleTokenExpiry: new Date(tokens.expiry_date) } : {}),
        },
      })
      .catch((err) => console.error("Falha ao persistir tokens renovados do Google:", err));
  });

  return client;
}

export async function getBusyIntervals(timeMinUTC: Date, timeMaxUTC: Date): Promise<BusyInterval[]> {
  const client = await getAuthenticatedClient();
  if (!client) return [];

  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 } });
  const calendar = google.calendar({ version: "v3", auth: client });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMinUTC.toISOString(),
      timeMax: timeMaxUTC.toISOString(),
      items: [{ id: owner!.googleCalendarId }],
    },
  });

  const busy = res.data.calendars?.[owner!.googleCalendarId]?.busy ?? [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }));
}

export async function createCalendarEvent(params: {
  summary: string;
  description?: string;
  location?: string;
  startTimeUTC: Date;
  endTimeUTC: Date;
  attendeeEmail: string;
  attendeeName: string;
  /** "none" skips Google's auto-generated Meet link — used when the invitee picked a fixed Teams link instead. Defaults to "google_meet". */
  conferenceType?: "google_meet" | "none";
}): Promise<{ googleEventId: string; meetLink: string | null } | null> {
  const client = await getAuthenticatedClient();
  if (!client) return null;

  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 } });
  const calendar = google.calendar({ version: "v3", auth: client });
  const wantsGoogleMeet = (params.conferenceType ?? "google_meet") === "google_meet";

  const res = await calendar.events.insert({
    calendarId: owner!.googleCalendarId,
    conferenceDataVersion: wantsGoogleMeet ? 1 : undefined,
    sendUpdates: "externalOnly",
    requestBody: {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.startTimeUTC.toISOString() },
      end: { dateTime: params.endTimeUTC.toISOString() },
      attendees: [{ email: params.attendeeEmail, displayName: params.attendeeName }],
      ...(wantsGoogleMeet
        ? {
            conferenceData: {
              createRequest: {
                requestId: randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }
        : {}),
    },
  });

  return {
    googleEventId: res.data.id!,
    meetLink: res.data.hangoutLink ?? null,
  };
}

export async function updateCalendarEvent(params: {
  googleEventId: string;
  startTimeUTC: Date;
  endTimeUTC: Date;
}): Promise<void> {
  const client = await getAuthenticatedClient();
  if (!client) return;

  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 } });
  const calendar = google.calendar({ version: "v3", auth: client });

  try {
    await calendar.events.patch({
      calendarId: owner!.googleCalendarId,
      eventId: params.googleEventId,
      sendUpdates: "externalOnly",
      requestBody: {
        start: { dateTime: params.startTimeUTC.toISOString() },
        end: { dateTime: params.endTimeUTC.toISOString() },
      },
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 404 && code !== 410) throw err; // already gone is fine
  }
}

export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const client = await getAuthenticatedClient();
  if (!client) return;

  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 } });
  const calendar = google.calendar({ version: "v3", auth: client });

  try {
    await calendar.events.delete({
      calendarId: owner!.googleCalendarId,
      eventId: googleEventId,
      sendUpdates: "externalOnly",
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 404 && code !== 410) throw err; // already gone is fine
  }
}
