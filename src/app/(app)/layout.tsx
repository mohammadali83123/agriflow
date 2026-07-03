import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/db/scoped";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  // If no active org, send them to onboarding to create one
  if (!session.session.activeOrganizationId) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
