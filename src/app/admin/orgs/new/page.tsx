import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateOrgForm } from "./create-org-form";

export const metadata = { title: "Onboard client — Admin" };

export default function NewOrgPage() {
  return (
    <div className="max-w-lg space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground group"
      >
        <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        Platform overview
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invite a client</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sends an invitation email. The client signs up and names their own business.
        </p>
      </div>

      <CreateOrgForm />
    </div>
  );
}
