import { redirect } from "next/navigation";
import { getUserOrganizations, requireAuth } from "@/lib/db/scoped";
import { OrganizationPicker } from "@/components/auth/organization-picker";

export const metadata = { title: "Select business" };

export default async function SelectOrganizationPage() {
  const session = await requireAuth();

  // Already have an active org? Go straight to the app.
  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  const orgs = await getUserOrganizations(session.user.id);

  // No businesses yet → send them to create their first one.
  if (orgs.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <OrganizationPicker organizations={orgs} />
      </div>
    </div>
  );
}
