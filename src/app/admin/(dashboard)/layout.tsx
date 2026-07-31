import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
