import { DecorativeBackground } from "@/components/decorative-background";
import { ReschedulePanel } from "./reschedule-panel";

export default async function ReschedulePage({ params }: { params: Promise<{ proposalToken: string }> }) {
  const { proposalToken } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-12">
      <DecorativeBackground />
      <ReschedulePanel proposalToken={proposalToken} />
    </main>
  );
}
