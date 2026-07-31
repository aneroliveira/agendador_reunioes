import { CancelPanel } from "./cancel-panel";

export default async function CancelPage({ params }: { params: Promise<{ cancelToken: string }> }) {
  const { cancelToken } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-12">
      <CancelPanel cancelToken={cancelToken} />
    </main>
  );
}
