import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface AdminSessionData {
  isAdmin?: boolean;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET precisa estar definido em .env com pelo menos 32 caracteres");
}

export const sessionOptions: SessionOptions = {
  cookieName: "agendador_admin_session",
  password: sessionSecret,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

export async function getAdminSession() {
  return getIronSession<AdminSessionData>(await cookies(), sessionOptions);
}
