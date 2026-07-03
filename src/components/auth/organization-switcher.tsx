"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserOrganization } from "@/lib/db/scoped";

export function OrganizationSwitcher({
  organizations,
  activeOrgId,
}: {
  organizations: UserOrganization[];
  activeOrgId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const active = organizations.find((o) => o.id === activeOrgId);

  async function switchTo(orgId: string) {
    if (orgId === activeOrgId) return;
    setPending(true);
    const { error } = await authClient.organization.setActive({
      organizationId: orgId,
    });
    if (!error) {
      // Re-read server components so the whole app reflects the new org
      router.refresh();
    }
    setPending(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={pending} />
        }
      >
        <Building2 className="size-4" />
        <span className="max-w-[10rem] truncate">
          {active?.name ?? "Select business"}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Businesses</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchTo(org.id)}
            className="gap-2"
          >
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrgId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/onboarding")}
          className="gap-2"
        >
          <Plus className="size-4" />
          Create new business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
