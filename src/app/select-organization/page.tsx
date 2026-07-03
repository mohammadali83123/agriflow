import { redirect } from "next/navigation";
import { getUserOrganizations, requireAuth } from "@/lib/db/scoped";
import { OrganizationPicker } from "@/components/auth/organization-picker";

export const metadata = { title: "Select business" };

export default async function SelectOrganizationPage() {
  const session = await requireAuth();

  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  const orgs = await getUserOrganizations(session.user.id);

  if (orgs.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <OrganizationPicker organizations={orgs} />
      </div>
    </div>
  );
}
