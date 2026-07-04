"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, ArrowRight, Wheat } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import type { UserOrganization } from "@/lib/db/scoped";

export function OrganizationPicker({
  organizations,
}: {
  organizations: UserOrganization[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function select(orgId: string) {
    setError("");
    setPendingId(orgId);
    const { error: err } = await authClient.organization.setActive({
      organizationId: orgId,
    });
    if (err) {
      setError(err.message ?? "Could not select business. Try again.");
      setPendingId(null);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mb-1">
          <Wheat className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Your businesses</h1>
        <p className="text-sm text-muted-foreground">
          Select a business to continue
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Org list */}
      <div className="space-y-2">
        {organizations.map((org) => (
          <button
            key={org.id}
            type="button"
            disabled={pendingId !== null}
            onClick={() => select(org.id)}
            className="w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm group disabled:opacity-60"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Building2 className="size-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{org.name}</p>
              {org.slug && (
                <p className="text-xs text-muted-foreground truncate">{org.slug}</p>
              )}
            </div>
            {pendingId === org.id ? (
              <span className="text-xs text-muted-foreground shrink-0">Opening…</span>
            ) : (
              <ArrowRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Create new */}
      <Button
        variant="outline"
        className="w-full gap-2 h-10"
        disabled={pendingId !== null}
        onClick={() => router.push("/onboarding")}
      >
        <Plus className="size-4" />
        Create new business
      </Button>
    </div>
  );
}
