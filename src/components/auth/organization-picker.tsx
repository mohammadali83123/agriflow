"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    router.push("/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Select a business</CardTitle>
        <CardDescription>
          Choose which business you want to work in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-2">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              disabled={pendingId !== null}
              onClick={() => select(org.id)}
              className="w-full flex items-center gap-3 rounded-lg border bg-card px-3 py-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Building2 className="size-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">
                  {org.name}
                </span>
              </span>
              {pendingId === org.id && (
                <span className="text-xs text-muted-foreground">Opening…</span>
              )}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          disabled={pendingId !== null}
          onClick={() => router.push("/onboarding")}
        >
          <Plus className="size-4" />
          Create new business
        </Button>
      </CardContent>
    </Card>
  );
}
