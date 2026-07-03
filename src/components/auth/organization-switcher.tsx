"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
      router.refresh();
    }
    setPending(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        disabled={pending}
      >
        <Building2 className="size-4 shrink-0" />
        <span className="max-w-[10rem] truncate">
          {active?.name ?? "Select business"}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* base-ui requires GroupLabel to be inside a Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Businesses</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => switchTo(org.id)}
              className="gap-2"
            >
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === activeOrgId && <Check className="size-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/onboarding")}
          className="gap-2"
        >
          <Plus className="size-4 shrink-0" />
          Create new business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
