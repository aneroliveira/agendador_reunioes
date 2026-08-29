import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { prisma } from "@/lib/db";
import { getReadableForeground } from "@/lib/color";
import { ToastProvider, Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Geometric, warm sans — the variable name must be "--font-sans" (not e.g.
// "--font-outfit") so it actually overrides Tailwind's default --font-sans
// theme token consumed by globals.css's `@theme inline { --font-sans: var(--font-sans); }`.
const outfit = Outfit({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agendador de Reuniões",
  description: "Agende uma conversa comigo.",
};

// Reads OwnerAccount.themeColor on every request — must not get baked into a
// static shell at build time, or admin color changes wouldn't show up live.
export const dynamic = "force-dynamic";

const DEFAULT_THEME_COLOR = "#c4677a";

async function getThemeColor(): Promise<string> {
  try {
    const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 }, select: { themeColor: true } });
    return owner?.themeColor ?? DEFAULT_THEME_COLOR;
  } catch {
    return DEFAULT_THEME_COLOR;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeColor = await getThemeColor();
  const themeForeground = getReadableForeground(themeColor);

  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--primary": themeColor, "--primary-foreground": themeForeground } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
