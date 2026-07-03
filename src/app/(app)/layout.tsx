import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/db/scoped";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  // If no active org, send them to the selector (which routes to onboarding
  // when they have none, or shows a picker when they have several).
  if (!session.session.activeOrganizationId) {
    redirect("/select-organization");
  }

  return <>{children}</>;
}
